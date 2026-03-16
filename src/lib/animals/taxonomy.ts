export type AnimalClass = 'reptile' | 'amphibian' | 'other';

export type AnimalCategory =
  | 'snake'
  | 'lizard'
  | 'gecko'
  | 'monitor'
  | 'skink'
  | 'tegu'
  | 'chameleon'
  | 'iguana'
  | 'anole'
  | 'turtle'
  | 'tortoise'
  | 'frog'
  | 'toad'
  | 'salamander'
  | 'newt'
  | 'other-reptile'
  | 'other-amphibian';

export type HabitatType =
  | 'terrestrial'
  | 'arboreal'
  | 'aquatic'
  | 'semi-aquatic'
  | 'fossorial'
  | 'mixed';

export type HumidityPreference = 'low' | 'moderate' | 'high' | 'very-high';

export type TemperaturePreference = 'cool' | 'temperate' | 'warm' | 'hot';

export type UVBRequirement = 'none' | 'optional' | 'recommended' | 'required';

export type WaterRequirement = 'minimal' | 'bowl' | 'swim-area' | 'fully-aquatic';

export type HandlingProfile = 'not-recommended' | 'cautious' | 'tolerant' | 'calm';

export interface AnimalCategoryMeta {
  value: AnimalCategory;
  label: string;
  class: AnimalClass;
  defaultHabitat?: HabitatType;
  defaultHumidity?: HumidityPreference;
  defaultUVB?: UVBRequirement;
  defaultWater?: WaterRequirement;
}

export const ANIMAL_CATEGORY_OPTIONS: AnimalCategoryMeta[] = [
  { value: 'snake', label: 'Snake', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'lizard', label: 'Lizard', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'gecko', label: 'Gecko', class: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'monitor', label: 'Monitor', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'skink', label: 'Skink', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'tegu', label: 'Tegu', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'chameleon', label: 'Chameleon', class: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'bowl' },
  { value: 'iguana', label: 'Iguana', class: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'anole', label: 'Anole', class: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'turtle', label: 'Turtle', class: 'reptile', defaultHabitat: 'semi-aquatic', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'tortoise', label: 'Tortoise', class: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'bowl' },
  { value: 'frog', label: 'Frog', class: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'toad', label: 'Toad', class: 'amphibian', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'salamander', label: 'Salamander', class: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'newt', label: 'Newt', class: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'other-reptile', label: 'Other Exotic Reptile', class: 'reptile' },
  { value: 'other-amphibian', label: 'Other Exotic Amphibian', class: 'amphibian' },
];

/** Display label for a category (for lists and cards). */
export const CATEGORY_LABELS: Record<AnimalCategory, string> = {
  snake: 'Snake',
  lizard: 'Lizard',
  gecko: 'Gecko',
  monitor: 'Monitor',
  skink: 'Skink',
  tegu: 'Tegu',
  chameleon: 'Chameleon',
  iguana: 'Iguana',
  anole: 'Anole',
  turtle: 'Turtle',
  tortoise: 'Tortoise',
  frog: 'Frog',
  toad: 'Toad',
  salamander: 'Salamander',
  newt: 'Newt',
  'other-reptile': 'Other Reptile',
  'other-amphibian': 'Other Amphibian',
};

/** Emoji for category (for cards and list display). */
export const CATEGORY_EMOJI: Record<AnimalCategory, string> = {
  snake: '🐍',
  lizard: '🦎',
  gecko: '🦎',
  monitor: '🦎',
  skink: '🦎',
  tegu: '🦎',
  chameleon: '🦎',
  iguana: '🦎',
  anole: '🦎',
  turtle: '🐢',
  tortoise: '🐢',
  frog: '🐸',
  toad: '🐸',
  salamander: '🦎',
  newt: '🦎',
  'other-reptile': '🦎',
  'other-amphibian': '🐸',
};

export function getCategoryMeta(category: AnimalCategory | undefined): AnimalCategoryMeta | undefined {
  if (!category) return undefined;
  return ANIMAL_CATEGORY_OPTIONS.find((c) => c.value === category);
}

export function getCategoryLabel(category: AnimalCategory | undefined): string | undefined {
  if (!category) return undefined;
  return CATEGORY_LABELS[category];
}

/** Resolve emoji for display: prefer category, then species keyword. */
export function getDisplayEmoji(category: AnimalCategory | undefined, species: string): string {
  if (category && CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category];
  const lower = species.toLowerCase();
  if (/frog|dart|tree frog|horned frog/i.test(lower)) return '🐸';
  if (/toad/i.test(lower)) return '🐸';
  if (/salamander|axolotl|newt/i.test(lower)) return '🦎';
  if (/snake|python|boa|colubrid|corn snake|king|milk|hognose|ball python/i.test(lower)) return '🐍';
  if (/turtle|terrapin|slider|cooter/i.test(lower)) return '🐢';
  if (/tortoise/i.test(lower)) return '🐢';
  if (/gecko|crested|leopard|gargoyle|tokay|day gecko/i.test(lower)) return '🦎';
  if (/monitor|ackie|savannah/i.test(lower)) return '🦎';
  if (/tegu/i.test(lower)) return '🦎';
  if (/skink|blue tongue/i.test(lower)) return '🦎';
  if (/chameleon|iguana|anole|bearded|dragon|agama/i.test(lower)) return '🦎';
  return '🦎';
}

