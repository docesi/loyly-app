import React from 'react';
import { Clock, MapPin, ArrowRight } from 'lucide-react';
import { Sauna } from '../types';
import { getCurrentDayIndex } from '../utils/dateUtils';

interface CalendarViewProps {
  saunas: Sauna[];
}

const DAYS = [
  { id: 1, short: 'Mon', long: 'Monday' },
  { id: 2, short: 'Tue', long: 'Tuesday' },
  { id: 3, short: 'Wed', long: 'Wednesday' },
  { id: 4, short: 'Thu', long: 'Thursday' },
  { id: 5, short: 'Fri', long: 'Friday' },
  { id: 6, short: 'Sat', long: 'Saturday' },
  { id: 7, short: 'Sun', long: 'Sunday' },
];

const CalendarView: React.FC<CalendarViewProps> = ({ saunas }) => {
  const currentDayIndex = getCurrentDayIndex();

  const getHoursForDay = (sauna: Sauna, dayId: number) => {
    const schedule = sauna.aukioloajat.find(t => t.viikonpaivat.includes(dayId));
    if (!schedule) return null;
    return {
      time: schedule.alkaa ? `${schedule.alkaa} - ${schedule.paattyy}` : 'Open',
      note: schedule.selite
    };
  };

  // Calculate the next opening day relative to a specific day index (fromDayId)
  const getNextOpenDay = (sauna: Sauna, fromDayId: number) => {
    // Check the next 7 days
    for (let offset = 1; offset <= 7; offset++) {
      let nextDayIndex = fromDayId + offset;
      if (nextDayIndex > 7) nextDayIndex -= 7;
      
      const schedule = sauna.aukioloajat.find(t => t.viikonpaivat.includes(nextDayIndex));
      
      if (schedule) {
        const dayObj = DAYS.find(d => d.id === nextDayIndex);
        return dayObj ? dayObj.short : null;
      }
    }
    return null; // Seasonally closed
  };

  if (saunas.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-stone-300">
        <p className="text-stone-500">No saunas found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-wood-50 border-b border-wood-100">
              <th className="p-4 text-left min-w-[200px] sticky left-0 bg-wood-50 z-10 border-r border-wood-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <span className="text-xs font-bold text-wood-800 uppercase tracking-wider">Sauna</span>
              </th>
              {DAYS.map(day => (
                <th key={day.id} className={`p-4 text-center min-w-[100px] ${day.id === currentDayIndex ? 'bg-wood-100/50' : ''}`}>
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-bold uppercase tracking-wider ${day.id === currentDayIndex ? 'text-wood-700' : 'text-stone-500'}`}>
                      {day.short}
                    </span>
                    {day.id === currentDayIndex && (
                      <span className="text-[10px] text-green-600 font-bold mt-1 bg-green-100 px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {saunas.map((sauna) => (
              <tr key={sauna.id} className="hover:bg-stone-50/50 transition-colors group">
                <td className="p-4 sticky left-0 bg-white group-hover:bg-stone-50/50 z-10 border-r border-stone-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div>
                    <div className="font-serif font-bold text-stone-800 text-sm mb-0.5">{sauna.nimi}</div>
                    <div className="flex items-center text-stone-400 text-[10px]">
                      <MapPin size={10} className="mr-1" />
                      {sauna.sijainti.kunta}
                    </div>
                  </div>
                </td>
                {DAYS.map(day => {
                  const schedule = getHoursForDay(sauna, day.id);
                  const isToday = day.id === currentDayIndex;
                  const nextOpenDay = !schedule ? getNextOpenDay(sauna, day.id) : null;
                  
                  return (
                    <td key={day.id} className={`p-2 text-center relative ${isToday ? 'bg-wood-50/30' : ''}`}>
                      {schedule ? (
                        <div className={`inline-flex flex-col items-center justify-center w-full h-full min-h-[3.5rem] p-2 rounded-lg text-xs border ${
                          isToday 
                            ? 'bg-white border-wood-200 shadow-sm text-wood-900' 
                            : 'bg-stone-50 border-stone-100 text-stone-600'
                        }`}>
                          <span className="font-bold whitespace-nowrap">{schedule.time}</span>
                          {schedule.note && (
                            <span className="text-[9px] text-stone-400 mt-0.5 max-w-[100px] truncate opacity-70">
                              {schedule.note}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="min-h-[3.5rem] flex flex-col items-center justify-center">
                            {nextOpenDay ? (
                                <div className="flex items-center gap-1 text-[10px] text-stone-300 group-hover:text-stone-400 transition-colors">
                                    <span className="uppercase tracking-tighter font-medium text-[9px]">Next</span>
                                    <ArrowRight size={10} />
                                    <span className="font-bold text-stone-400 group-hover:text-wood-500">{nextOpenDay}</span>
                                </div>
                            ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-stone-200"></span>
                            )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarView;