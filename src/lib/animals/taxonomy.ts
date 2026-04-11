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

export type SpeciesPresetDietType = 'insects' | 'rodents' | 'fish' | 'herbivore' | 'omnivore' | 'pellets' | 'mixed';

export interface SpeciesPreset {
  id: string;
  commonName: string;
  scientificName?: string;
  category: AnimalCategory;
  speciesGroup?: string;
  dietType: SpeciesPresetDietType;
  habitatType?: HabitatType;
  humidityPreference?: HumidityPreference;
  uvbRequirement?: UVBRequirement;
  waterRequirement?: WaterRequirement;
  handlingProfile?: HandlingProfile;
  isAmphibian?: boolean;
}

export interface SpeciesPresetGroup {
  category: AnimalCategory;
  presets: SpeciesPreset[];
}

export const SPECIES_PRESET_GROUPS: SpeciesPresetGroup[] = [
  {
    category: 'snake',
    presets: [
      { id: 'ball-python', commonName: 'Ball Python', scientificName: 'Python regius', category: 'snake', speciesGroup: 'Python', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'corn-snake', commonName: 'Corn Snake', scientificName: 'Pantherophis guttatus', category: 'snake', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'hognose-snake', commonName: 'Hognose Snake', scientificName: 'Heterodon nasicus', category: 'snake', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'kingsnake', commonName: 'Kingsnake', scientificName: 'Lampropeltis getula', category: 'snake', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'milk-snake', commonName: 'Milk Snake', scientificName: 'Lampropeltis triangulum', category: 'snake', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'boa-constrictor', commonName: 'Boa Constrictor', scientificName: 'Boa imperator', category: 'snake', speciesGroup: 'Boid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'carpet-python', commonName: 'Carpet Python', scientificName: 'Morelia spilota', category: 'snake', speciesGroup: 'Python', dietType: 'rodents', habitatType: 'arboreal', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'cautious' },
    ],
  },
  {
    category: 'gecko',
    presets: [
      { id: 'leopard-gecko', commonName: 'Leopard Gecko', scientificName: 'Eublepharis macularius', category: 'gecko', speciesGroup: 'Gecko', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'recommended', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'crested-gecko', commonName: 'Crested Gecko', scientificName: 'Correlophus ciliatus', category: 'gecko', speciesGroup: 'Gecko', dietType: 'mixed', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'gargoyle-gecko', commonName: 'Gargoyle Gecko', scientificName: 'Rhacodactylus auriculatus', category: 'gecko', speciesGroup: 'Gecko', dietType: 'mixed', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'tokay-gecko', commonName: 'Tokay Gecko', scientificName: 'Gekko gecko', category: 'gecko', speciesGroup: 'Gecko', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
    ],
  },
  {
    category: 'lizard',
    presets: [
      { id: 'bearded-dragon', commonName: 'Bearded Dragon', scientificName: 'Pogona vitticeps', category: 'lizard', speciesGroup: 'Agamid', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'calm' },
    ],
  },
  {
    category: 'skink',
    presets: [
      { id: 'blue-tongue-skink', commonName: 'Blue Tongue Skink', scientificName: 'Tiliqua scincoides', category: 'skink', speciesGroup: 'Skink', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'recommended', waterRequirement: 'bowl', handlingProfile: 'calm' },
    ],
  },
  {
    category: 'tegu',
    presets: [
      { id: 'argentine-tegu', commonName: 'Argentine Tegu', scientificName: 'Salvator merianae', category: 'tegu', speciesGroup: 'Tegu', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'required', waterRequirement: 'swim-area', handlingProfile: 'tolerant' },
    ],
  },
  {
    category: 'monitor',
    presets: [
      { id: 'ackie-monitor', commonName: 'Ackie Monitor', scientificName: 'Varanus acanthurus', category: 'monitor', speciesGroup: 'Monitor', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'cautious' },
    ],
  },
  {
    category: 'chameleon',
    presets: [
      { id: 'veiled-chameleon', commonName: 'Veiled Chameleon', scientificName: 'Chamaeleo calyptratus', category: 'chameleon', speciesGroup: 'Chameleon', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'minimal', handlingProfile: 'not-recommended' },
      { id: 'panther-chameleon', commonName: 'Panther Chameleon', scientificName: 'Furcifer pardalis', category: 'chameleon', speciesGroup: 'Chameleon', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'minimal', handlingProfile: 'not-recommended' },
    ],
  },
  {
    category: 'iguana',
    presets: [
      { id: 'green-iguana', commonName: 'Green Iguana', scientificName: 'Iguana iguana', category: 'iguana', speciesGroup: 'Iguana', dietType: 'herbivore', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'swim-area', handlingProfile: 'cautious' },
    ],
  },
  {
    category: 'turtle',
    presets: [
      { id: 'red-eared-slider', commonName: 'Red-Eared Slider', scientificName: 'Trachemys scripta elegans', category: 'turtle', speciesGroup: 'Aquatic Turtle', dietType: 'omnivore', habitatType: 'aquatic', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'fully-aquatic', handlingProfile: 'cautious' },
    ],
  },
  {
    category: 'tortoise',
    presets: [
      { id: 'sulcata-tortoise', commonName: 'Sulcata Tortoise', scientificName: 'Centrochelys sulcata', category: 'tortoise', speciesGroup: 'Tortoise', dietType: 'herbivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'russian-tortoise', commonName: 'Russian Tortoise', scientificName: 'Testudo horsfieldii', category: 'tortoise', speciesGroup: 'Tortoise', dietType: 'herbivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
    ],
  },
  {
    category: 'frog',
    presets: [
      { id: 'whites-tree-frog', commonName: "White's Tree Frog", scientificName: 'Ranoidea caerulea', category: 'frog', speciesGroup: 'Tree Frog', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant', isAmphibian: true },
      { id: 'pacman-frog', commonName: 'Pacman Frog', scientificName: 'Ceratophrys ornata', category: 'frog', speciesGroup: 'Frog', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'dart-frog', commonName: 'Dart Frog', scientificName: 'Dendrobatidae', category: 'frog', speciesGroup: 'Dart Frog', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'very-high', uvbRequirement: 'optional', waterRequirement: 'minimal', handlingProfile: 'not-recommended', isAmphibian: true },
    ],
  },
  {
    category: 'salamander',
    presets: [
      { id: 'tiger-salamander', commonName: 'Tiger Salamander', scientificName: 'Ambystoma tigrinum', category: 'salamander', speciesGroup: 'Salamander', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'axolotl', commonName: 'Axolotl', scientificName: 'Ambystoma mexicanum', category: 'salamander', speciesGroup: 'Aquatic Salamander', dietType: 'mixed', habitatType: 'aquatic', humidityPreference: 'very-high', uvbRequirement: 'none', waterRequirement: 'fully-aquatic', handlingProfile: 'not-recommended', isAmphibian: true },
    ],
  },
  {
    category: 'newt',
    presets: [
      { id: 'fire-bellied-newt', commonName: 'Fire-Bellied Newt', scientificName: 'Cynops orientalis', category: 'newt', speciesGroup: 'Newt', dietType: 'mixed', habitatType: 'semi-aquatic', humidityPreference: 'very-high', uvbRequirement: 'none', waterRequirement: 'swim-area', handlingProfile: 'not-recommended', isAmphibian: true },
    ],
  },
];

export const SPECIES_PRESETS: SpeciesPreset[] = SPECIES_PRESET_GROUPS.flatMap((group) => group.presets);

export function getSpeciesPresetsForCategory(category: AnimalCategory | undefined): SpeciesPreset[] {
  if (!category) return [];
  return SPECIES_PRESET_GROUPS.find((group) => group.category === category)?.presets ?? [];
}

export function getSpeciesPresetById(id: string): SpeciesPreset | undefined {
  return SPECIES_PRESETS.find((preset) => preset.id === id);
}

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

