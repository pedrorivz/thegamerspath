export interface SpeedrunAsset {
  uri: string | null;
  width?: number;
  height?: number;
}

export interface SpeedrunAssets {
  logo: SpeedrunAsset;
  'cover-tiny': SpeedrunAsset;
  'cover-small': SpeedrunAsset;
  'cover-medium': SpeedrunAsset;
  'cover-large': SpeedrunAsset;
  icon: SpeedrunAsset;
  'trophy-1st': SpeedrunAsset;
  'trophy-2nd': SpeedrunAsset;
  'trophy-3rd': SpeedrunAsset;
  'trophy-4th': SpeedrunAsset;
  background: SpeedrunAsset;
  foreground: SpeedrunAsset;
}

export interface SpeedrunPlatform {
  id: string;
  name: string;
  released: number;
}

export interface SpeedrunGenre {
  id: string;
  name: string;
}

export interface SpeedrunLevel {
  id: string;
  name: string;
  weblink: string;
  rules: string | null;
  links: { rel: string; uri: string }[];
}

export interface SpeedrunGame {
  id: string;
  names: {
    international: string;
    japanese?: string;
    twitch?: string;
  };
  abbreviation: string;
  weblink: string;
  released: number;
  'release-date': string;
  assets: SpeedrunAssets;
  platforms: string[] | { data: SpeedrunPlatform[] };
  genres: string[] | { data: SpeedrunGenre[] };
  levels?: { data: SpeedrunLevel[] };
}

export interface SpeedrunSearchResult {
  data: SpeedrunGame[];
  pagination?: {
    offset: number;
    max: number;
    size: number;
    links: { rel: string; uri: string }[];
  };
}

export interface LibraryGame {
  id: string;           // backend UUID
  speedrunId: string;   // speedrun.com game ID
  name: string;
  coverUrl: string | null;
  abbreviation: string;
  released: number;
  platforms: string[];
  genres: string[];
  levels: LibraryLevel[];
  notes: LibraryNote[];
  ollamaStatus: string | null;
  addedAt: number;
}

export interface LibraryLevel {
  id: string;
  name: string;
  completed: boolean;
}

export interface LibraryNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
