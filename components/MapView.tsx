
import React, { useEffect, useRef } from 'react';
import { Sauna } from '../types';
import { isSaunaOpenToday } from '../utils/dateUtils';

interface MapViewProps {
  saunas: Sauna[];
}

// We treat 'L' as a global variable since we load it via script tag in index.html
declare global {
  interface Window {
    L: any;
  }
}

const MapView: React.FC<MapViewProps> = ({ saunas }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    // Initialize Map if not already done
    if (!mapInstanceRef.current) {
      // Center roughly on Tampere
      mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([61.4978, 23.7600], 10);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const L = window.L;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add Markers for saunas with coordinates
    saunas.forEach(sauna => {
      if (sauna.coordinates) {
        const isOpen = isSaunaOpenToday(sauna);
        
        // Custom HTML Marker to look like our status indicators
        const iconHtml = `
          <div class="relative flex items-center justify-center w-6 h-6">
            <div class="absolute w-full h-full rounded-full border-2 border-white shadow-md ${isOpen ? 'bg-green-500' : 'bg-stone-500'}"></div>
            ${isOpen ? '<div class="absolute w-2 h-2 bg-white rounded-full animate-pulse"></div>' : ''}
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });

        const marker = L.marker([sauna.coordinates.lat, sauna.coordinates.lon], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div class="font-sans text-stone-800 p-1 min-w-[200px]">
              <h3 class="font-bold text-sm mb-1 font-serif text-wood-900">${sauna.nimi}</h3>
              <p class="text-xs text-stone-500 mb-2">${sauna.sijainti.kunta}</p>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${isOpen ? 'bg-green-500' : 'bg-stone-500'}">
                  ${isOpen ? 'OPEN TODAY' : 'CLOSED TODAY'}
                </span>
                ${sauna.pisteet ? `<span class="text-[10px] font-bold text-amber-600">★ ${sauna.pisteet}</span>` : ''}
              </div>
              <p class="text-[11px] leading-tight text-stone-600 mb-2 line-clamp-2">${sauna.kuvaus.substring(0, 80)}...</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sauna.nimi + ', ' + sauna.sijainti.osoite)}" 
                target="_blank" 
                class="block w-full text-center bg-wood-600 hover:bg-wood-700 text-white text-xs font-bold py-1.5 rounded transition-colors"
              >
                Get Directions
              </a>
            </div>
          `);

        markersRef.current.push(marker);
      }
    });

  }, [saunas]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden h-[600px] relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
