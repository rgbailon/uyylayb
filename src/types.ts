export type Medium = "tv" | "radio" | "webcams";

export interface StreamSources {
  streams?: string[];
  youtube?: string[];
}

export interface Item {
  nanoid: string;
  name: string;
  sources: StreamSources;
  languages: string[];
  country: string;
  isGeoBlocked: boolean;
}

export interface CountryMeta {
  country: string;
  capital: string;
  timeZone: string;
  hasChannels: boolean;
  channelCount: number;
}

export type CountryMetaMap = Record<string, CountryMeta>;

export type SourceKind = "hls" | "file" | "youtube";

export interface PlaySource {
  kind: SourceKind;
  url: string;
  label: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  icon: string;
  tagline: string;
}

export interface SavedEntry {
  key: string;
  medium: Medium;
  item: Item;
  at: number;
  count?: number;
}
