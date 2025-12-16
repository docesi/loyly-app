import { Sauna, OpeningTime } from '../types';

// JS Date.getDay() returns 0 for Sunday, but our data uses 7 for Sunday.
export const getCurrentDayIndex = (): number => {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
};

export const getDayName = (index: number): string => {
  const days = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai', 'Sunnuntai'];
  return days[index - 1] || '';
};

export const isSaunaOpenToday = (sauna: Sauna): boolean => {
  const todayIndex = getCurrentDayIndex();
  return sauna.aukioloajat.some((time) => time.viikonpaivat.includes(todayIndex));
};

export const getTodaysHours = (sauna: Sauna): OpeningTime | undefined => {
  const todayIndex = getCurrentDayIndex();
  return sauna.aukioloajat.find((time) => time.viikonpaivat.includes(todayIndex));
};

export const getNextOpenInfo = (sauna: Sauna): string | null => {
  const today = getCurrentDayIndex();
  
  // Check the next 7 days
  for (let offset = 1; offset <= 7; offset++) {
    let checkDay = today + offset;
    // Wrap around (if today is 6/Sat, next is 7/Sun, next is 8->1/Mon)
    if (checkDay > 7) checkDay -= 7;
    
    const schedule = sauna.aukioloajat.find(t => t.viikonpaivat.includes(checkDay));
    
    if (schedule) {
      const startTime = schedule.alkaa || '?';
      
      if (offset === 1) {
        return `Tomorrow at ${startTime}`;
      }
      
      // If within the next few days, use the day name
      const dayName = getDayName(checkDay);
      // Shorten day name for UI space (optional, but cleaner)
      const shortDay = dayName.slice(0, 3); 
      
      return `${dayName} at ${startTime}`;
    }
  }
  
  return "Seasonally Closed";
};

export const formatTime = (timeString: string | null): string => {
  if (!timeString) return '';
  // Simple check if it needs formatting, usually data is "HH:MM"
  return timeString;
};