
import React, { useState } from 'react';
import { MapPin, Clock, Info, Droplets, Flame, ChevronDown, ChevronUp, Star, Navigation, CalendarClock, Heart, Edit2, Save, X, ExternalLink, Waves } from 'lucide-react';
import { Sauna } from '../types';
import { getTodaysHours, isSaunaOpenToday, getNextOpenInfo } from '../utils/dateUtils';
import { formatDistance } from '../utils/geoUtils';
import RatingRadar from './RatingRadar';

interface SaunaCardProps {
  sauna: Sauna;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onUpdate?: (updatedData: Partial<Sauna>) => void;
  waterTemp?: number;
}

const SaunaCard: React.FC<SaunaCardProps> = ({ sauna, isFavorite, onToggleFavorite, onUpdate, waterTemp }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    nimi: sauna.nimi,
    kuvaus: sauna.kuvaus,
    hinta: sauna.hinta,
    huomioita: sauna.huomioita,
  });

  const openToday = isSaunaOpenToday(sauna);
  const todaysHours = getTodaysHours(sauna);
  const nextOpenText = !openToday ? getNextOpenInfo(sauna) : null;

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editForm);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
        nimi: sauna.nimi,
        kuvaus: sauna.kuvaus,
        hinta: sauna.hinta,
        huomioita: sauna.huomioita,
    });
    setIsEditing(false);
  };

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sauna.nimi + ', ' + sauna.sijainti.osoite)}`;

  // Determine header color gradient based on state
  const headerGradient = openToday 
    ? 'bg-gradient-to-br from-wood-600 to-wood-800'
    : 'bg-gradient-to-br from-stone-600 to-stone-700 grayscale-[0.5]';

  return (
    <div 
      className={`group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-transparent ${openToday ? 'hover:border-wood-300' : 'opacity-95'}`}
    >
      {/* Header Image Area */}
      <div 
        className={`relative h-40 overflow-hidden cursor-pointer transition-colors ${headerGradient}`} 
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
        </div>
        
        {/* Top Right Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
           {/* Open Status Badge */}
           <div className="flex items-center gap-2">
             {openToday ? (
               <span className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-green-500 text-white shadow-lg backdrop-blur-sm flex items-center gap-1.5 ring-1 ring-green-400/50">
                 <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                 OPEN TODAY
               </span>
             ) : (
               <span className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-stone-800/80 text-stone-200 shadow-lg backdrop-blur-sm border border-stone-600">
                 CLOSED
               </span>
             )}
             
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 if (isEditing) return;
                 onToggleFavorite();
               }}
               className="p-1.5 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 transition-colors border border-white/10 group/heart"
               title={isFavorite ? "Remove from favorites" : "Add to favorites"}
             >
               <Heart 
                 size={16} 
                 className={`transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-white/80 group-hover/heart:text-white'}`} 
               />
             </button>

             {onUpdate && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(!isEditing);
                        if (!isExpanded) setIsExpanded(true);
                    }}
                    className={`p-1.5 rounded-full backdrop-blur-md transition-colors border group/edit ${isEditing ? 'bg-wood-500 text-white border-wood-400' : 'bg-black/20 hover:bg-black/40 text-white/80 hover:text-white border-white/10'}`}
                >
                    <Edit2 size={16} />
                </button>
             )}
           </div>

           {/* Ranking + Score Badge */}
           <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-wood-900 shadow-md backdrop-blur-md border border-white/50 mt-1">
              {sauna.sijoitus != null && (
                <span className="text-[11px] font-black leading-none mr-1">
                  #{sauna.sijoitus}
                </span>
              )}
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-sm font-black leading-none">{sauna.pisteet}</span>
           </div>
        </div>

        {/* Water Temp Badge (Floating Left) */}
        {waterTemp !== undefined && (
          <div className="absolute top-3 left-3 z-10 animate-in fade-in slide-in-from-left-4 duration-700">
             <span className="px-3 py-1.5 bg-blue-500/90 text-white text-xs font-bold uppercase tracking-wide rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-blue-400/50">
               <Waves size={14} className="animate-pulse" /> {waterTemp}°C
             </span>
          </div>
        )}

        {/* Bottom Title Area */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
           <div className="flex justify-between items-end">
             <div className="pr-2 w-full">
                {isEditing ? (
                    <input 
                        type="text"
                        value={editForm.nimi}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nimi: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white/90 text-wood-900 font-serif font-bold text-lg px-2 py-1 rounded mb-1 focus:outline-none focus:ring-2 focus:ring-wood-400"
                    />
                ) : (
                    <h3 className="text-white font-serif font-bold text-2xl leading-none mb-1 drop-shadow-md tracking-tight">{sauna.nimi}</h3>
                )}
                
                <a 
                    href={mapLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-white/80 text-xs font-medium hover:text-white hover:underline decoration-white/50 decoration-1 underline-offset-4 transition-all w-fit mt-1"
                >
                    <MapPin size={12} className="mr-1" />
                    {sauna.sijainti.kunta}
                    <ExternalLink size={10} className="ml-1 opacity-50" />
                </a>
             </div>
             
             {sauna.distance !== undefined && !isEditing && (
                <div 
                   className="flex items-center gap-1 text-white bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md border border-white/20 shadow-sm shrink-0"
                >
                    <Navigation size={10} className="fill-current" />
                    {formatDistance(sauna.distance)}
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="p-5">
        {/* Features Row */}
        <div className="flex flex-wrap gap-2 mb-4">
             {sauna.ominaisuudet.includes('avanto') && (
               <span className="px-2.5 py-1 bg-sky-50 text-sky-700 text-[10px] font-bold uppercase tracking-wide rounded-md flex items-center gap-1.5 border border-sky-100">
                 <Droplets size={12} /> Ice Swimming
               </span>
             )}
             {sauna.ominaisuudet.some(feat => feat.toLowerCase().includes('savusauna')) && (
               <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wide rounded-md flex items-center gap-1.5 border border-stone-200">
                 <Flame size={12} /> Smoke Sauna
               </span>
             )}
             {/* Show generic tag if no special ones */}
             {!sauna.ominaisuudet.includes('avanto') && !sauna.ominaisuudet.some(feat => feat.toLowerCase().includes('savusauna')) && (
                <span className="text-[10px] text-wood-600 bg-wood-50 px-2.5 py-1 rounded-md border border-wood-100 font-medium">Traditional Sauna</span>
             )}
        </div>

        {/* Time / Status Area */}
        <div className="min-h-[3rem] flex items-center p-3 rounded-xl bg-stone-50 border border-stone-100">
            {openToday && todaysHours ? (
            <div className="w-full">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Open Today</p>
                    {todaysHours.selite && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded font-medium">{todaysHours.selite.slice(0, 20)}...</span>}
                 </div>
                 <div className="flex items-center gap-2 text-wood-900">
                    <Clock size={18} className="text-wood-600" />
                    <span className="font-bold text-xl tracking-tight">
                        {todaysHours.alkaa ? `${todaysHours.alkaa} - ${todaysHours.paattyy}` : 'Special Hours'}
                    </span>
                 </div>
            </div>
            ) : (
            <div className="w-full">
                 <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Status</p>
                 <div className="flex items-center gap-2 text-stone-500">
                    {nextOpenText ? (
                        <>
                            <CalendarClock size={18} className="text-stone-400" />
                            <span className="font-semibold text-sm">Opens {nextOpenText}</span>
                        </>
                    ) : (
                        <>
                            <Clock size={18} className="text-stone-400" />
                            <span className="font-semibold text-sm">Seasonally Closed</span>
                        </>
                    )}
                 </div>
            </div>
            )}
        </div>

        {/* Action Buttons */}
        {isEditing ? (
            <div className="flex gap-2 mt-5">
                 <button 
                    onClick={handleSave}
                    className="flex-1 bg-wood-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-wood-700 shadow-sm"
                 >
                    <Save size={14} /> Save Changes
                 </button>
                 <button 
                    onClick={handleCancel}
                    className="flex-1 bg-white border border-stone-200 text-stone-600 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-stone-50"
                 >
                    <X size={14} /> Cancel
                 </button>
            </div>
        ) : (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-full mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide py-3 rounded-xl transition-all ${
                  isExpanded 
                  ? 'bg-wood-50 text-wood-800 border border-wood-100' 
                  : 'bg-white text-stone-500 border border-stone-100 hover:bg-stone-50 hover:text-stone-700'
              }`}
            >
              {isExpanded ? 'Hide Details' : 'View Full Details'}
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Description</label>
                        <textarea 
                            value={editForm.kuvaus}
                            onChange={(e) => setEditForm(prev => ({ ...prev, kuvaus: e.target.value }))}
                            className="w-full p-3 border border-stone-200 rounded-xl text-sm text-stone-600 h-32 focus:ring-2 focus:ring-wood-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Price</label>
                        <input 
                            type="text"
                            value={editForm.hinta}
                            onChange={(e) => setEditForm(prev => ({ ...prev, hinta: e.target.value }))}
                            className="w-full p-3 border border-stone-200 rounded-xl text-sm text-stone-600 focus:ring-2 focus:ring-wood-400 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Notes</label>
                        <textarea 
                            value={editForm.huomioita}
                            onChange={(e) => setEditForm(prev => ({ ...prev, huomioita: e.target.value }))}
                            className="w-full p-3 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-900 h-20 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-stone-600 text-sm leading-relaxed mb-6 font-serif">{sauna.kuvaus}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       <div className="space-y-4">
                           <div className="bg-wood-50/50 p-4 rounded-2xl border border-wood-100">
                              <h4 className="text-[10px] font-bold text-wood-400 uppercase tracking-wider mb-3">Essentials</h4>
                              <ul className="text-sm space-y-3 text-stone-700">
                                <li className="flex justify-between items-center border-b border-wood-100 pb-2 last:border-0 last:pb-0">
                                    <span className="text-stone-500 font-medium">Entry</span> 
                                    <span className="font-bold bg-white px-2 py-0.5 rounded shadow-sm text-xs">{sauna.hinta}</span>
                                </li>
                                <li className="flex flex-col gap-1 border-b border-wood-100 pb-2 last:border-0 last:pb-0">
                                    <span className="text-stone-500 font-medium">Location</span> 
                                    <a 
                                        href={mapLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-right text-wood-900 hover:text-wood-600 hover:underline text-xs"
                                    >
                                        {sauna.sijainti.osoite}
                                    </a>
                                </li>
                              </ul>
                           </div>
                           
                           {sauna.huomioita && (
                             <div className="flex gap-3 text-xs text-amber-900 bg-amber-50 p-4 rounded-2xl border border-amber-100 leading-relaxed">
                                <Info size={16} className="shrink-0 text-amber-600" />
                                <span>{sauna.huomioita}</span>
                             </div>
                          )}
                       </div>
        
                       <div className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center">
                          <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center mb-2">Ratings</h4>
                          <div className="h-40">
                             <RatingRadar ratings={sauna.arvioinnit} />
                          </div>
                       </div>
                    </div>
                </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaunaCard;
