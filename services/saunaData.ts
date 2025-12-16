import { Sauna } from "../types";

// We use runtime overrides to modify data without needing to rewrite the large JSON file.
// This significantly speeds up development and allows for quick content patches.
// Coordinates added for distance sorting functionality.
const DATA_OVERRIDES: Record<number, Partial<Sauna>> = {
  // Tampere Central / Popular
  14: { coordinates: { lat: 61.4948, lon: 23.7583 } }, // Kuuma
  5: { coordinates: { lat: 61.5086, lon: 23.7897 } },  // Rauhaniemi
  7: { coordinates: { lat: 61.5123, lon: 23.8065 } },  // Kaupinoja
  15: { coordinates: { lat: 61.5012, lon: 23.7185 } }, // Rajaportti
  17: { coordinates: { lat: 61.4975, lon: 23.7744 } }, // Laawu
  40: { coordinates: { lat: 61.4935, lon: 23.7635 } }, // Flou
  
  // Tampere West/East
  19: { coordinates: { lat: 61.5154, lon: 23.6722 } }, // Suomensaari
  13: { coordinates: { lat: 61.5108, lon: 23.6194 } }, // Tohloppi
  6: { coordinates: { lat: 61.4694, lon: 23.8850 } },  // Kaukajärvi
  65: { coordinates: { lat: 61.4930, lon: 23.6950 } }, // Viikinsaari
  8: { coordinates: { lat: 61.4995, lon: 23.7105 } },  // Tahmela
  12: { coordinates: { lat: 61.4780, lon: 23.7950 } }, // Nekala
  11: { coordinates: { lat: 61.4495, lon: 23.8550 } }, // Suolijärvi
  72: { coordinates: { lat: 61.5150, lon: 23.8550 } }, // Niihama
  20: { coordinates: { lat: 61.5088, lon: 23.7899 } }, // Saunatemppeli (Near Rauhaniemi)
  
  // Pirkkala / Nokia / Ylöjärvi
  9: { coordinates: { lat: 61.4761, lon: 23.7183 } },  // Pereensaari (Pirkkala)
  45: { coordinates: { lat: 61.4650, lon: 23.6050 } }, // Reippi (Pirkkala)
  38: { coordinates: { lat: 61.4750, lon: 23.5550 } }, // Halkoniemi (Nokia)
  61: { coordinates: { lat: 61.4850, lon: 23.5250 } }, // Tehdassaari (Nokia)
  10: { coordinates: { lat: 61.5150, lon: 23.4850 } }, // Alisniemi (Nokia)
  2: { coordinates: { lat: 61.5642, lon: 23.5817 } },  // Veittijärvi (Ylöjärvi)
  23: { coordinates: { lat: 61.5580, lon: 23.5950 } }, // Räikkä (Ylöjärvi)
  25: { coordinates: { lat: 61.5950, lon: 23.6550 } }, // Peronsaari (Ylöjärvi)
  69: { coordinates: { lat: 61.6550, lon: 23.3550 } }, // Paijala (Viljakkala/Ylöjärvi)
  
  // Other Regions
  4: { coordinates: { lat: 61.7650, lon: 23.0550 } },  // Villa Vihta (Ikaalinen)
  28: { coordinates: { lat: 61.7850, lon: 23.0350 } }, // Ikaalisten kylpylä
  26: { coordinates: { lat: 61.2650, lon: 24.0350 } }, // Apia (Valkeakoski)
  37: { coordinates: { lat: 62.0300, lon: 24.6200 } }, // Taidesauna (Mänttä)
  18: { coordinates: { lat: 61.6550, lon: 24.4550 } }, // Purnu (Orivesi)
  34: { coordinates: { lat: 61.6850, lon: 24.3550 } }, // Säynäniemi (Orivesi)
  1: { coordinates: { lat: 61.6250, lon: 23.2050 } },  // Kauhtua (Hämeenkyrö)
  73: { coordinates: { lat: 61.6650, lon: 23.1550 } }, // Järvenkylä (Hämeenkyrö)
  59: { coordinates: { lat: 61.1750, lon: 23.8550 } }, // Toijalan satama (Akaa)
  16: { coordinates: { lat: 61.1755, lon: 23.8555 } }, // Toijalan satama saunakylä
  44: { coordinates: { lat: 61.4550, lon: 24.0550 } }, // Vesaniemi (Kangasala)
  50: { coordinates: { lat: 61.4850, lon: 24.5550 } }, // Kuhmalahti (Kangasala)
};

export const fetchSaunaData = async (): Promise<Sauna[]> => {
  try {
    const response = await fetch('./saunas.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: Sauna[] = await response.json();
    
    // Apply overrides
    return data.map(sauna => {
      const override = DATA_OVERRIDES[sauna.id];
      if (override) {
        return { ...sauna, ...override };
      }
      return sauna;
    });
  } catch (error) {
    console.error("Could not fetch sauna data:", error);
    return [];
  }
};