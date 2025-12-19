import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Snowflake, Calendar, Navigation, Flame, LayoutGrid, Table, Heart, Dices, Cloud, Sun, CloudRain, CloudSnow, Wind, Map as MapIcon } from 'lucide-react';
import { fetchSaunaData } from './services/saunaData';
import { isSaunaOpenToday, getDayName, getCurrentDayIndex } from './utils/dateUtils';
import { calculateDistance } from './utils/geoUtils';
import { fetchWeather, WeatherData } from './services/weather';
import { fetchWaterTemperatures } from './services/waterData';
import SaunaCard from './components/SaunaCard';
import ScoreChart from './components/ScoreChart';
import CalendarView from './components/CalendarView';
import MapView from './components/MapView';
import { FilterState, Sauna, ViewMode } from './types';

function App() {
  const [rawSaunaData, setRawSaunaData] = useState<Sauna[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [waterTemps, setWaterTemps] = useState<Record<number, number>>({});

  // Favorites state
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('saunaFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Custom Edits state
  const [saunaEdits, setSaunaEdits] = useState<Record<number, Partial<Sauna>>>(() => {
    const saved = localStorage.getItem('saunaEdits');
    return saved ? JSON.parse(saved) : {};
  });

  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const [filters, setFilters] = useState<FilterState>({
    onlyOpen: true,
    hasAvanto: false,
    hasSavusauna: false,
    searchTerm: '',
    sortByDistance: false,
    showFavorites: false,
  });

  // Refs for scrolling to cards
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchSaunaData();
      setRawSaunaData(data);
      setLoading(false);
    };
    loadData();

    // Auto-fetch weather for Tampere default coordinates on load
    fetchWeather(61.4978, 23.7608).then(data => setWeather(data));

    // Fetch water temperatures via proxy
    fetchWaterTemperatures().then(temps => setWaterTemps(temps));
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem('saunaFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Persist edits to localStorage
  useEffect(() => {
    localStorage.setItem('saunaEdits', JSON.stringify(saunaEdits));
  }, [saunaEdits]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev =>
      prev.includes(id)
        ? prev.filter(favId => favId !== id)
        : [...prev, id]
    );
  };

  const handleUpdateSauna = (id: number, updatedData: Partial<Sauna>) => {
    setSaunaEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...updatedData }
    }));
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setUserLocation({ lat, lon });
        setIsLocating(false);
        setFilters(prev => ({ ...prev, sortByDistance: true }));

        // Fetch weather for the location
        const weatherData = await fetchWeather(lat, lon);
        setWeather(weatherData);
      },
      (error) => {
        console.error("Error getting location", error);
        setLocationError("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const handleSurpriseMe = () => {
    if (filteredSaunas.length === 0) return;

    // Ensure we are in card view
    if (viewMode !== 'cards') setViewMode('cards');

    const randomIndex = Math.floor(Math.random() * filteredSaunas.length);
    const randomSauna = filteredSaunas[randomIndex];

    // Scroll to the element
    const element = cardRefs.current[randomSauna.id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight animation class
      element.classList.add('ring-4', 'ring-wood-400', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-wood-400', 'ring-offset-2');
      }, 2000);
    }
  };

  // Merge raw data with local edits
  const mergedSaunaData = useMemo(() => {
    return rawSaunaData.map(sauna => {
      const edit = saunaEdits[sauna.id];
      if (edit) {
        return { ...sauna, ...edit };
      }
      return sauna;
    });
  }, [rawSaunaData, saunaEdits]);

  const filteredSaunas = useMemo(() => {
    let processed = mergedSaunaData.filter((sauna) => {
      // Skip invalid entries
      if (sauna.id === -1) return false;

      // Filter by Favorites
      if (filters.showFavorites && !favorites.includes(sauna.id)) {
        return false;
      }

      // Filter by Open Today - ONLY APPLIES IN CARD VIEW when enabled
      // In calendar view or map view, we generally show available spots
      if (viewMode === 'cards' && filters.onlyOpen && !isSaunaOpenToday(sauna)) {
        return false;
      }

      // Filter by Avanto
      if (filters.hasAvanto && !sauna.ominaisuudet.includes('avanto')) {
        return false;
      }

      // Filter by Savusauna
      if (filters.hasSavusauna && !sauna.ominaisuudet.some(feat => feat.toLowerCase().includes('savusauna'))) {
        return false;
      }

      // Search text
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        return (
          sauna.nimi.toLowerCase().includes(term) ||
          sauna.sijainti.kunta.toLowerCase().includes(term)
        );
      }

      return true;
    });

    // Calculate distances if location is available
    if (userLocation) {
      processed = processed.map(sauna => {
        if (sauna.coordinates) {
          return {
            ...sauna,
            distance: calculateDistance(
              userLocation.lat,
              userLocation.lon,
              sauna.coordinates.lat,
              sauna.coordinates.lon
            )
          };
        }
        return sauna;
      });
    }

    // Sorting logic
    if (filters.sortByDistance && userLocation) {
      return processed.sort((a, b) => {
        // If one has distance and other doesn't, prioritize the one with distance
        if (a.distance !== undefined && b.distance === undefined) return -1;
        if (a.distance === undefined && b.distance !== undefined) return 1;

        // If both have distance, sort ascending
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }

        // Fallback to score if no distance
        return b.pisteet - a.pisteet;
      });
    } else {
      // Default sort by ranking (sijoitus), falling back to score
      return processed.sort((a, b) => {
        const aRank = a.sijoitus ?? Number.POSITIVE_INFINITY;
        const bRank = b.sijoitus ?? Number.POSITIVE_INFINITY;

        if (aRank !== bRank) {
          return aRank - bRank;
        }

        // Fallback to score if ranking is missing or equal
        return b.pisteet - a.pisteet;
      });
    }
  }, [filters, mergedSaunaData, userLocation, viewMode, favorites]);

  // Helper to set tabs
  const handleTabChange = (tab: 'today' | 'all' | 'calendar' | 'favorites' | 'map') => {
    if (tab === 'today') {
      setViewMode('cards');
      setFilters(prev => ({ ...prev, onlyOpen: true, showFavorites: false }));
    } else if (tab === 'all') {
      setViewMode('cards');
      setFilters(prev => ({ ...prev, onlyOpen: false, showFavorites: false }));
    } else if (tab === 'favorites') {
      setViewMode('cards');
      setFilters(prev => ({ ...prev, onlyOpen: false, showFavorites: true }));
    } else if (tab === 'calendar') {
      setViewMode('calendar');
      setFilters(prev => ({ ...prev, onlyOpen: false }));
    } else if (tab === 'map') {
      setViewMode('map');
      setFilters(prev => ({ ...prev, onlyOpen: false }));
    }
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun size={14} className="text-amber-400" />;
    if (code === 2 || code === 3) return <Cloud size={14} className="text-stone-400" />;
    if (code >= 51 && code <= 67) return <CloudRain size={14} className="text-blue-400" />;
    if (code >= 71 && code <= 86) return <CloudSnow size={14} className="text-sky-200" />;
    return <Cloud size={14} className="text-stone-400" />;
  };

  const todayName = getDayName(getCurrentDayIndex());
  const activeCount = filteredSaunas.length;
  const totalCount = mergedSaunaData.filter(s => s.id !== -1).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2c241b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-16 h-16 border-4 border-wood-400 border-t-wood-600 rounded-full animate-spin"></div>
          <p className="text-wood-200 font-serif text-lg tracking-wide">Heating up the stones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100/50 text-stone-900 font-sans pb-24 relative">

      {/* Hero Section */}
      <div className="bg-[#2c241b] text-wood-50 relative overflow-hidden shadow-xl border-b border-wood-800">
        <div
          className="absolute inset-0 opacity-10 z-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '16px 16px'
          }}
        />

        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 relative z-10"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
        >
          <div className="flex flex-row items-center justify-between gap-6">
            <div className="text-left max-w-2xl flex-1 flex flex-col gap-2">
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-wood-100 drop-shadow-md">
                Löyly <span className="text-wood-400 font-light italic">Finder</span>
              </h1>
              <p className="text-wood-300 text-sm hidden sm:block opacity-90 max-w-md">
                Discover the hottest stones in Pirkanmaa. Real-time hours, water temperatures, and ratings.
              </p>

              <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-wood-300 mt-2">
                {/* Weather Widget */}
                {weather && (
                  <div className="bg-white/10 border border-white/20 px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-2 text-white animate-in fade-in">
                    {getWeatherIcon(weather.weatherCode)}
                    <span>{weather.temperature}°C</span>
                    <span className="opacity-50">|</span>
                    <Wind size={10} className="opacity-70" />
                    <span className="opacity-90">{weather.windSpeed} m/s</span>
                  </div>
                )}
                <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  {todayName}
                </div>
              </div>
            </div>

            {/* Stylized Traditional Finnish Log Sauna Icon */}
            <div className="relative h-20 w-20 md:h-24 md:w-24 shrink-0 opacity-90">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Steam rising */}
                <path d="M65 20 Q 75 10, 65 0" stroke="#dcb083" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                <path d="M55 25 Q 45 15, 55 5" stroke="#dcb083" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

                {/* Roof */}
                <path d="M10 40 L50 10 L90 40" stroke="#d49763" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                {/* Cabin Body Outline */}
                <path d="M20 40 L20 90 L80 90 L80 40" stroke="#d49763" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                {/* Log Details */}
                <path d="M15 55 L85 55" stroke="#d49763" strokeWidth="4" strokeLinecap="round" />
                <path d="M15 70 L85 70" stroke="#d49763" strokeWidth="4" strokeLinecap="round" />

                {/* Door */}
                <rect x="42" y="55" width="16" height="35" stroke="#d49763" strokeWidth="3" rx="2" />
                {/* Window */}
                <circle cx="50" cy="32" r="6" stroke="#d49763" strokeWidth="3" opacity="0.8" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div
        className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-stone-200 shadow-sm transition-all duration-300"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3">

            {/* Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full no-scrollbar">
              <button
                onClick={() => handleTabChange('today')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${filters.onlyOpen && viewMode === 'cards' && !filters.showFavorites ? 'bg-white text-wood-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Today
              </button>
              <button
                onClick={() => handleTabChange('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all ${!filters.onlyOpen && viewMode === 'cards' && !filters.showFavorites ? 'bg-white text-wood-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700'}`}
              >
                All Saunas
              </button>
              <button
                onClick={() => handleTabChange('calendar')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white text-wood-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <Calendar size={14} /> <span className="hidden sm:inline">Calendar</span>
              </button>
              <button
                onClick={() => handleTabChange('map')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-white text-wood-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <MapIcon size={14} /> <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={() => handleTabChange('favorites')}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-all flex items-center gap-1.5 ${filters.showFavorites ? 'bg-white text-wood-700 shadow-sm ring-1 ring-black/5' : 'text-stone-500 hover:text-stone-700'}`}
              >
                <Heart size={14} fill={filters.showFavorites ? "currentColor" : "none"} /> <span className="hidden sm:inline">Saved</span>
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative grow md:grow-0 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 group-hover:text-wood-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Find a sauna..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="w-full md:w-48 lg:w-64 pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-wood-400 focus:bg-white text-sm transition-all shadow-sm"
                />
              </div>

              <button
                onClick={() => setFilters(prev => ({ ...prev, hasAvanto: !prev.hasAvanto }))}
                className={`p-2 rounded-xl border transition-all ${filters.hasAvanto ? 'bg-sky-50 border-sky-200 text-sky-700 ring-1 ring-sky-100' : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'}`}
                title="Has Ice Swimming"
              >
                <Snowflake size={18} />
              </button>

              <button
                onClick={() => setFilters(prev => ({ ...prev, hasSavusauna: !prev.hasSavusauna }))}
                className={`p-2 rounded-xl border transition-all ${filters.hasSavusauna ? 'bg-stone-800 border-stone-900 text-stone-100' : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'}`}
                title="Has Smoke Sauna"
              >
                <Flame size={18} />
              </button>

              <button
                onClick={handleSurpriseMe}
                className="p-2 rounded-xl border border-stone-200 bg-white text-wood-600 hover:bg-wood-50 hover:border-wood-200 transition-all shadow-sm"
                title="Surprise Me (Random Sauna)"
              >
                <Dices size={18} />
              </button>

              <button
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${filters.sortByDistance ? 'bg-wood-100 border-wood-200 text-wood-800 ring-1 ring-wood-200' : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'}`}
                title="Sort by Distance"
              >
                <Navigation size={18} className={isLocating ? "animate-spin" : ""} />
                {filters.sortByDistance && <span className="text-xs font-bold hidden lg:inline">Near Me</span>}
              </button>
            </div>
          </div>

          {locationError && (
            <div className="text-xs text-red-500 pb-2 animate-pulse">{locationError}</div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header for Card Views */}
        {viewMode === 'cards' && (
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <LayoutGrid size={24} className="text-wood-600" />
                {filters.showFavorites ? 'Your Favorites' : (filters.onlyOpen ? `Open Today (${todayName})` : 'All Saunas')}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {activeCount} heating up right now
              </p>
            </div>

            {/* Conditionally show score chart if enough space */}
            <div className="hidden lg:block">
              <ScoreChart data={filteredSaunas} />
            </div>
          </div>
        )}

        {viewMode === 'calendar' ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Table size={20} className="text-wood-600" />
                Weekly Schedule
              </h2>
            </div>
            <CalendarView saunas={filteredSaunas} />
          </div>
        ) : viewMode === 'map' ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <MapIcon size={20} className="text-wood-600" />
                Map View
              </h2>
            </div>
            <MapView saunas={filteredSaunas} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredSaunas.map((sauna) => (
              <div key={sauna.id} ref={(el) => { cardRefs.current[sauna.id] = el; }} className="transition-all duration-500">
                <SaunaCard
                  sauna={sauna}
                  isFavorite={favorites.includes(sauna.id)}
                  onToggleFavorite={() => toggleFavorite(sauna.id)}
                  onUpdate={(updates) => handleUpdateSauna(sauna.id, updates)}
                  waterTemp={waterTemps[sauna.id]}
                />
              </div>
            ))}

            {filteredSaunas.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-stone-300">
                <div className="inline-block p-6 rounded-full bg-stone-50 mb-4 shadow-inner">
                  <Search size={32} className="text-stone-300" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-700 mb-2">No saunas found</h3>
                <p className="text-stone-500 max-w-md mx-auto mb-6">
                  It seems quiet today. Try adjusting your search terms or filters to find more spots.
                </p>
                <button
                  onClick={() => setFilters({ onlyOpen: false, hasAvanto: false, hasSavusauna: false, searchTerm: '', sortByDistance: false, showFavorites: false })}
                  className="px-6 py-3 bg-wood-600 text-white rounded-xl hover:bg-wood-700 transition-colors text-sm font-bold uppercase tracking-wide shadow-md hover:shadow-lg"
                >
                  Show All Saunas
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
