export type AnimalClass = 'reptile' | 'amphibian' | 'other';
export type AnimalGroup = 'reptile' | 'amphibian' | 'invertebrate' | 'fish' | 'other';

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
  | 'tarantula'
  | 'scorpion'
  | 'other-invertebrate'
  | 'fish'
  | 'other-animal'
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
  group: AnimalGroup;
  defaultHabitat?: HabitatType;
  defaultHumidity?: HumidityPreference;
  defaultUVB?: UVBRequirement;
  defaultWater?: WaterRequirement;
}

export const ANIMAL_GROUP_OPTIONS: { value: AnimalGroup; label: string }[] = [
  { value: 'reptile', label: 'Reptile' },
  { value: 'amphibian', label: 'Amphibian' },
  { value: 'invertebrate', label: 'Invertebrate' },
  { value: 'fish', label: 'Fish' },
  { value: 'other', label: 'Other' },
];

export const ANIMAL_CATEGORY_OPTIONS: AnimalCategoryMeta[] = [
  { value: 'snake', label: 'Snake', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'lizard', label: 'Lizard', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'gecko', label: 'Gecko', class: 'reptile', group: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'monitor', label: 'Monitor', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'skink', label: 'Skink', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'tegu', label: 'Tegu', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'chameleon', label: 'Chameleon', class: 'reptile', group: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'bowl' },
  { value: 'iguana', label: 'Iguana', class: 'reptile', group: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'anole', label: 'Anole', class: 'reptile', group: 'reptile', defaultHabitat: 'arboreal', defaultHumidity: 'high', defaultUVB: 'recommended', defaultWater: 'bowl' },
  { value: 'turtle', label: 'Turtle', class: 'reptile', group: 'reptile', defaultHabitat: 'semi-aquatic', defaultHumidity: 'high', defaultUVB: 'required', defaultWater: 'swim-area' },
  { value: 'tortoise', label: 'Tortoise', class: 'reptile', group: 'reptile', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'required', defaultWater: 'bowl' },
  { value: 'frog', label: 'Frog', class: 'amphibian', group: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'toad', label: 'Toad', class: 'amphibian', group: 'amphibian', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'optional', defaultWater: 'bowl' },
  { value: 'salamander', label: 'Salamander', class: 'amphibian', group: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'newt', label: 'Newt', class: 'amphibian', group: 'amphibian', defaultHabitat: 'semi-aquatic', defaultHumidity: 'very-high', defaultUVB: 'optional', defaultWater: 'swim-area' },
  { value: 'tarantula', label: 'Tarantula', class: 'other', group: 'invertebrate', defaultHabitat: 'terrestrial', defaultHumidity: 'moderate', defaultUVB: 'none', defaultWater: 'bowl' },
  { value: 'scorpion', label: 'Scorpion', class: 'other', group: 'invertebrate', defaultHabitat: 'terrestrial', defaultHumidity: 'low', defaultUVB: 'none', defaultWater: 'bowl' },
  { value: 'other-invertebrate', label: 'Other Invertebrate', class: 'other', group: 'invertebrate' },
  { value: 'fish', label: 'Fish', class: 'other', group: 'fish', defaultHabitat: 'aquatic', defaultHumidity: 'very-high', defaultUVB: 'none', defaultWater: 'fully-aquatic' },
  { value: 'other-animal', label: 'Other Animal', class: 'other', group: 'other' },
  { value: 'other-reptile', label: 'Other Exotic Reptile', class: 'reptile', group: 'reptile' },
  { value: 'other-amphibian', label: 'Other Exotic Amphibian', class: 'amphibian', group: 'amphibian' },
];

export type SpeciesPresetDietType = 'insects' | 'rodents' | 'fish' | 'herbivore' | 'omnivore' | 'pellets' | 'mixed';

export interface SpeciesPreset {
  id: string;
  commonName: string;
  scientificName?: string;
  category: AnimalCategory;
  animalGroup: AnimalGroup;
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
  id: string;
  label: string;
  animalGroup: AnimalGroup;
  categories: AnimalCategory[];
  presets: SpeciesPreset[];
}

export const SPECIES_PRESET_GROUPS: SpeciesPresetGroup[] = [
  {
    id: 'snakes',
    label: 'Snakes',
    animalGroup: 'reptile',
    categories: ['snake'],
    presets: [
      { id: 'ball-python', commonName: 'Ball Python', scientificName: 'Python regius', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Python', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'corn-snake', commonName: 'Corn Snake', scientificName: 'Pantherophis guttatus', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'hognose-snake', commonName: 'Hognose Snake', scientificName: 'Heterodon nasicus', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'kingsnake', commonName: 'Kingsnake', scientificName: 'Lampropeltis getula', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'milk-snake', commonName: 'Milk Snake', scientificName: 'Lampropeltis triangulum', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Colubrid', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'boa-constrictor', commonName: 'Boa Constrictor', scientificName: 'Boa imperator', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Boa / Python group', dietType: 'rodents', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'carpet-python', commonName: 'Carpet Python', scientificName: 'Morelia spilota', category: 'snake', animalGroup: 'reptile', speciesGroup: 'Python', dietType: 'rodents', habitatType: 'arboreal', humidityPreference: 'moderate', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'cautious' },
    ],
  },
  {
    id: 'lizards',
    label: 'Lizards',
    animalGroup: 'reptile',
    categories: ['lizard', 'monitor', 'skink', 'tegu', 'chameleon', 'iguana', 'anole'],
    presets: [
      { id: 'bearded-dragon', commonName: 'Bearded Dragon', scientificName: 'Pogona vitticeps', category: 'lizard', animalGroup: 'reptile', speciesGroup: 'Agamid', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'blue-tongue-skink', commonName: 'Blue Tongue Skink', scientificName: 'Tiliqua scincoides', category: 'skink', animalGroup: 'reptile', speciesGroup: 'Skink', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'recommended', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'argentine-tegu', commonName: 'Argentine Tegu', scientificName: 'Salvator merianae', category: 'tegu', animalGroup: 'reptile', speciesGroup: 'Tegu', dietType: 'omnivore', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'required', waterRequirement: 'swim-area', handlingProfile: 'tolerant' },
      { id: 'ackie-monitor', commonName: 'Ackie Monitor', scientificName: 'Varanus acanthurus', category: 'monitor', animalGroup: 'reptile', speciesGroup: 'Monitor', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'cautious' },
      { id: 'veiled-chameleon', commonName: 'Veiled Chameleon', scientificName: 'Chamaeleo calyptratus', category: 'chameleon', animalGroup: 'reptile', speciesGroup: 'Chameleon', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'minimal', handlingProfile: 'not-recommended' },
    ],
  },
  {
    id: 'geckos',
    label: 'Geckos',
    animalGroup: 'reptile',
    categories: ['gecko'],
    presets: [
      { id: 'leopard-gecko', commonName: 'Leopard Gecko', scientificName: 'Eublepharis macularius', category: 'gecko', animalGroup: 'reptile', speciesGroup: 'Gecko', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'recommended', waterRequirement: 'bowl', handlingProfile: 'calm' },
      { id: 'crested-gecko', commonName: 'Crested Gecko', scientificName: 'Correlophus ciliatus', category: 'gecko', animalGroup: 'reptile', speciesGroup: 'Gecko', dietType: 'mixed', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'gargoyle-gecko', commonName: 'Gargoyle Gecko', scientificName: 'Rhacodactylus auriculatus', category: 'gecko', animalGroup: 'reptile', speciesGroup: 'Gecko', dietType: 'mixed', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'tokay-gecko', commonName: 'Tokay Gecko', scientificName: 'Gekko gecko', category: 'gecko', animalGroup: 'reptile', speciesGroup: 'Gecko', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
    ],
  },
  {
    id: 'tortoises-turtles',
    label: 'Tortoises/Turtles',
    animalGroup: 'reptile',
    categories: ['tortoise', 'turtle'],
    presets: [
      { id: 'red-eared-slider', commonName: 'Red-Eared Slider', scientificName: 'Trachemys scripta elegans', category: 'turtle', animalGroup: 'reptile', speciesGroup: 'Aquatic Turtle', dietType: 'omnivore', habitatType: 'aquatic', humidityPreference: 'high', uvbRequirement: 'required', waterRequirement: 'fully-aquatic', handlingProfile: 'cautious' },
      { id: 'sulcata-tortoise', commonName: 'Sulcata Tortoise', scientificName: 'Centrochelys sulcata', category: 'tortoise', animalGroup: 'reptile', speciesGroup: 'Tortoise', dietType: 'herbivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
      { id: 'russian-tortoise', commonName: 'Russian Tortoise', scientificName: 'Testudo horsfieldii', category: 'tortoise', animalGroup: 'reptile', speciesGroup: 'Tortoise', dietType: 'herbivore', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'required', waterRequirement: 'bowl', handlingProfile: 'tolerant' },
    ],
  },
  {
    id: 'amphibians',
    label: 'Amphibians',
    animalGroup: 'amphibian',
    categories: ['frog', 'toad', 'salamander', 'newt'],
    presets: [
      { id: 'whites-tree-frog', commonName: "White's Tree Frog", scientificName: 'Ranoidea caerulea', category: 'frog', animalGroup: 'amphibian', speciesGroup: 'Tree Frog', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'tolerant', isAmphibian: true },
      { id: 'pacman-frog', commonName: 'Pac-Man Frog', scientificName: 'Ceratophrys ornata', category: 'frog', animalGroup: 'amphibian', speciesGroup: 'Frog', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'dart-frog', commonName: 'Dart Frog', scientificName: 'Dendrobatidae', category: 'frog', animalGroup: 'amphibian', speciesGroup: 'Dart Frog', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'very-high', uvbRequirement: 'optional', waterRequirement: 'minimal', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'tomato-frog', commonName: 'Tomato Frog', scientificName: 'Dyscophus guineti', category: 'frog', animalGroup: 'amphibian', speciesGroup: 'Frog', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'optional', waterRequirement: 'bowl', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'axolotl', commonName: 'Axolotl', scientificName: 'Ambystoma mexicanum', category: 'salamander', animalGroup: 'amphibian', speciesGroup: 'Aquatic Salamander', dietType: 'mixed', habitatType: 'aquatic', humidityPreference: 'very-high', uvbRequirement: 'none', waterRequirement: 'fully-aquatic', handlingProfile: 'not-recommended', isAmphibian: true },
      { id: 'fire-bellied-newt', commonName: 'Fire-Bellied Newt', scientificName: 'Cynops orientalis', category: 'newt', animalGroup: 'amphibian', speciesGroup: 'Newt', dietType: 'mixed', habitatType: 'semi-aquatic', humidityPreference: 'very-high', uvbRequirement: 'none', waterRequirement: 'swim-area', handlingProfile: 'not-recommended', isAmphibian: true },
    ],
  },
  {
    id: 'tarantulas',
    label: 'Tarantulas',
    animalGroup: 'invertebrate',
    categories: ['tarantula'],
    presets: [
      { id: 'chilean-rose-tarantula', commonName: 'Chilean Rose Tarantula', scientificName: 'Grammostola rosea', category: 'tarantula', animalGroup: 'invertebrate', speciesGroup: 'New World Tarantula', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'curly-hair-tarantula', commonName: 'Curly Hair Tarantula', scientificName: 'Tliltocatl albopilosus', category: 'tarantula', animalGroup: 'invertebrate', speciesGroup: 'New World Tarantula', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'pink-toe-tarantula', commonName: 'Pink Toe Tarantula', scientificName: 'Avicularia avicularia', category: 'tarantula', animalGroup: 'invertebrate', speciesGroup: 'Arboreal Tarantula', dietType: 'insects', habitatType: 'arboreal', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'mexican-red-knee', commonName: 'Mexican Red Knee Tarantula', scientificName: 'Brachypelma hamorii', category: 'tarantula', animalGroup: 'invertebrate', speciesGroup: 'New World Tarantula', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'moderate', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
    ],
  },
  {
    id: 'scorpions',
    label: 'Scorpions',
    animalGroup: 'invertebrate',
    categories: ['scorpion'],
    presets: [
      { id: 'emperor-scorpion', commonName: 'Emperor Scorpion', scientificName: 'Pandinus imperator', category: 'scorpion', animalGroup: 'invertebrate', speciesGroup: 'Scorpion', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'asian-forest-scorpion', commonName: 'Asian Forest Scorpion', scientificName: 'Heterometrus spinifer', category: 'scorpion', animalGroup: 'invertebrate', speciesGroup: 'Scorpion', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'desert-hairy-scorpion', commonName: 'Desert Hairy Scorpion', scientificName: 'Hadrurus arizonensis', category: 'scorpion', animalGroup: 'invertebrate', speciesGroup: 'Scorpion', dietType: 'insects', habitatType: 'terrestrial', humidityPreference: 'low', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
    ],
  },
  {
    id: 'other-invertebrates',
    label: 'Other Invertebrates',
    animalGroup: 'invertebrate',
    categories: ['other-invertebrate'],
    presets: [
      { id: 'millipede', commonName: 'Millipede', scientificName: 'Diplopoda', category: 'other-invertebrate', animalGroup: 'invertebrate', speciesGroup: 'Millipede', dietType: 'herbivore', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
      { id: 'isopods', commonName: 'Isopods', scientificName: 'Isopoda', category: 'other-invertebrate', animalGroup: 'invertebrate', speciesGroup: 'Isopod', dietType: 'mixed', habitatType: 'terrestrial', humidityPreference: 'high', uvbRequirement: 'none', waterRequirement: 'bowl', handlingProfile: 'not-recommended' },
    ],
  },
];

export const SPECIES_PRESETS: SpeciesPreset[] = SPECIES_PRESET_GROUPS.flatMap((group) => group.presets);

export function getSpeciesPresetsForCategory(category: AnimalCategory | undefined): SpeciesPreset[] {
  if (!category) return [];
  return SPECIES_PRESETS.filter((preset) => preset.category === category);
}

export function getSpeciesPresetGroupsForAnimalGroup(group: AnimalGroup | undefined): SpeciesPresetGroup[] {
  if (!group) return [];
  return SPECIES_PRESET_GROUPS.filter((presetGroup) => presetGroup.animalGroup === group);
}

export function getSpeciesPresetsForAnimalGroup(group: AnimalGroup | undefined): SpeciesPreset[] {
  return getSpeciesPresetGroupsForAnimalGroup(group).flatMap((presetGroup) => presetGroup.presets);
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
  tarantula: 'Tarantula',
  scorpion: 'Scorpion',
  'other-invertebrate': 'Other Invertebrate',
  fish: 'Fish',
  'other-animal': 'Other Animal',
  'other-reptile': 'Other Reptile',
  'other-amphibian': 'Other Amphibian',
};

export const ANIMAL_GROUP_LABELS: Record<AnimalGroup, string> = {
  reptile: 'Reptile',
  amphibian: 'Amphibian',
  invertebrate: 'Invertebrate',
  fish: 'Fish',
  other: 'Other',
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
  tarantula: '🕷️',
  scorpion: '🦂',
  'other-invertebrate': '🐛',
  fish: '🐟',
  'other-animal': '•',
  'other-reptile': '🦎',
  'other-amphibian': '🐸',
};

/** Preset / manual values that describe snake taxonomy — hidden on non-snake animals when stale. */
const SNAKE_TAXONOMIC_SPECIES_GROUPS = new Set<string>(['Python', 'Colubrid', 'Boid', 'Boa / Python group']);

/**
 * User-facing species group line (Passport, exports). Hides snake-only groups when the animal type is not a snake,
 * and renames legacy "Boid" to clearer wording.
 */
export function getSpeciesGroupDisplayValue(
  speciesGroup: string | undefined,
  animalCategory: AnimalCategory | undefined,
): string | undefined {
  const raw = speciesGroup?.trim();
  if (!raw) return undefined;
  if (animalCategory && animalCategory !== 'snake' && SNAKE_TAXONOMIC_SPECIES_GROUPS.has(raw)) {
    return undefined;
  }
  if (raw === 'Boid') return 'Boa / Python group';
  return raw;
}

export function getCategoryMeta(category: AnimalCategory | undefined): AnimalCategoryMeta | undefined {
  if (!category) return undefined;
  return ANIMAL_CATEGORY_OPTIONS.find((c) => c.value === category);
}

export function getAnimalCategoriesForGroup(group: AnimalGroup | undefined): AnimalCategoryMeta[] {
  const resolved = group ?? 'reptile';
  return ANIMAL_CATEGORY_OPTIONS.filter((category) => category.group === resolved);
}

export function getCategoryLabel(category: AnimalCategory | undefined): string | undefined {
  if (!category) return undefined;
  return CATEGORY_LABELS[category];
}

export function getAnimalGroupLabel(group: AnimalGroup | undefined): string {
  return ANIMAL_GROUP_LABELS[group ?? 'reptile'];
}

export function resolveAnimalGroup(value: {
  animalGroup?: AnimalGroup;
  animalClass?: AnimalClass;
  animalCategory?: AnimalCategory;
  isAmphibian?: boolean;
}): AnimalGroup {
  if (value.animalGroup) return value.animalGroup;
  const categoryMeta = getCategoryMeta(value.animalCategory);
  if (categoryMeta) return categoryMeta.group;
  if (value.animalClass === 'amphibian' || value.isAmphibian) return 'amphibian';
  return 'reptile';
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
  if (/tarantula|spider/i.test(lower)) return '🕷️';
  if (/scorpion/i.test(lower)) return '🦂';
  if (/millipede|isopod|mantis|beetle/i.test(lower)) return '🐛';
  if (/fish|betta|goldfish|guppy/i.test(lower)) return '🐟';
  return '🦎';
}
