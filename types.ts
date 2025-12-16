
export interface OpeningTime {
  viikonpaivat: number[];
  alkaa: string | null;
  paattyy: string | null;
  selite: string;
}

export interface Location {
  kunta: string;
  osoite: string;
}

export interface Ratings {
  loylyt: string;
  miljoo: string;
  ilmapiiri: string;
  suihku_pukuhuoneet?: string; // Some might be missing or named differently in raw data, but generally present
  oheistilat?: string;
  saunavaihtoehdot: string;
  oheispalvelut: string;
  aukioloajat: string;
  hinta: string;
  saavutettavuus: string;
  [key: string]: string | undefined;
}

export interface Sauna {
  id: number;
  sijoitus: number | null;
  nimi: string;
  sijainti: Location;
  hinta: string;
  aukioloajat: OpeningTime[];
  ominaisuudet: string[];
  pisteet: number;
  arvioinnit: Ratings;
  kuvaus: string;
  huomioita: string;
  tila?: string;
  image?: string;
  coordinates?: { lat: number; lon: number };
  distance?: number; // Distance in km from user
}

export interface FilterState {
  onlyOpen: boolean;
  hasAvanto: boolean;
  hasSavusauna: boolean;
  searchTerm: string;
  sortByDistance: boolean;
  showFavorites: boolean;
}

export type ViewMode = 'cards' | 'calendar' | 'map';
