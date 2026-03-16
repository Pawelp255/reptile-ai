import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GeneEditor } from '@/components/GeneEditor';
import { createReptile } from '@/lib/storage';
import type { ReptileFormData, Sex, DietType, BreedingStatus } from '@/types';
import { BREEDING_STATUS_OPTIONS as breedingStatusOptions } from '@/types';
import type { GeneticGene } from '@/types/genetics';
import {
  ANIMAL_CATEGORY_OPTIONS,
  type AnimalCategory,
  type HabitatType,
  type HumidityPreference,
  type UVBRequirement,
  type WaterRequirement,
  type HandlingProfile,
} from '@/lib/animals/taxonomy';

interface ExtendedFormData extends ReptileFormData {
  hetsInput: string;
  geneticsNotes: string;
  genes: GeneticGene[];
}

const sexOptions: { value: Sex; label: string }[] = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const dietOptions: { value: DietType; label: string; description: string }[] = [
  { value: 'insects', label: 'Insects', description: 'e.g. crickets, roaches' },
  { value: 'rodents', label: 'Rodents', description: 'e.g. mice, rats' },
  { value: 'fish', label: 'Fish', description: 'e.g. feeders, thawed' },
  { value: 'herbivore', label: 'Herbivore', description: 'Greens, vegetables' },
  { value: 'omnivore', label: 'Omnivore', description: 'Plant + animal' },
  { value: 'pellets', label: 'Pellets / Prepared', description: 'Commercial diet' },
  { value: 'mixed', label: 'Mixed', description: 'Varied diet' },
];

export default function NewReptilePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ExtendedFormData>({
    name: '',
    species: '',
    commonName: '',
    scientificName: '',
    animalClass: 'reptile',
    animalCategory: 'other-reptile',
    speciesGroup: '',
    morph: '',
    sex: 'unknown',
    birthDate: '',
    estimatedAgeMonths: undefined,
    acquisitionDate: '',
    dietType: 'insects',
    breedingStatus: 'pet',
    notes: '',
    habitatType: undefined,
    humidityPreference: undefined,
    temperaturePreference: undefined,
    uvbRequirement: undefined,
    waterRequirement: undefined,
    handlingProfile: undefined,
    isVenomous: false,
    isDangerous: false,
    isAmphibian: false,
    hetsInput: '',
    geneticsNotes: '',
    genes: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.species.trim()) {
      return;
    }

    setSaving(true);
    try {
      // Parse hets: split by comma, trim, filter empty
      const hets = formData.hetsInput
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0);

      const reptile = await createReptile({
        ...formData,
        name: formData.name.trim(),
        species: formData.species.trim(),
        commonName: formData.commonName?.trim() || undefined,
        scientificName: formData.scientificName?.trim() || undefined,
        speciesGroup: formData.speciesGroup?.trim() || undefined,
        morph: formData.morph?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        acquisitionDate: formData.acquisitionDate || undefined,
        estimatedAgeMonths: formData.estimatedAgeMonths || undefined,
        hets: hets.length > 0 ? hets : undefined,
        geneticsNotes: formData.geneticsNotes?.trim() || undefined,
        genes: formData.genes.length > 0 ? formData.genes : undefined,
      });
      navigate(`/reptiles/${reptile.id}`);
    } catch (error) {
      console.error('Failed to create reptile:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Add Animal"
        rightContent={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Required fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Draco"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="species">Species *</Label>
            <Input
              id="species"
              placeholder="e.g., Ball Python"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="mt-1.5"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="commonName">Common Name</Label>
              <Input
                id="commonName"
                placeholder="e.g., Leopard Gecko"
                value={formData.commonName || ''}
                onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="scientificName">Scientific Name</Label>
              <Input
                id="scientificName"
                placeholder="e.g., Eublepharis macularius"
                value={formData.scientificName || ''}
                onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label>Animal Type</Label>
            <Select
              value={formData.animalCategory}
              onValueChange={(value: AnimalCategory) => {
                const meta = ANIMAL_CATEGORY_OPTIONS.find((c) => c.value === value);
                setFormData((prev) => ({
                  ...prev,
                  animalCategory: value,
                  animalClass: meta?.class ?? prev.animalClass,
                  isAmphibian: meta?.class === 'amphibian',
                }));
              }}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ANIMAL_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dietType">Diet Type *</Label>
            <Select
              value={formData.dietType}
              onValueChange={(value: DietType) => setFormData({ ...formData, dietType: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dietOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        ({option.description})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Optional fields */}
        <div className="space-y-4">
          <h3 className="section-header">Optional Details</h3>

          <div>
            <Label htmlFor="morph">Morph</Label>
            <Input
              id="morph"
              placeholder="e.g., Pastel"
              value={formData.morph}
              onChange={(e) => setFormData({ ...formData, morph: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="speciesGroup">Species Group</Label>
            <Input
              id="speciesGroup"
              placeholder="e.g., Colubrid, Tree Frog, Tortoise"
              value={formData.speciesGroup || ''}
              onChange={(e) => setFormData({ ...formData, speciesGroup: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="sex">Sex</Label>
            <Select
              value={formData.sex}
              onValueChange={(value: Sex) => setFormData({ ...formData, sex: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sexOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="breedingStatus">Breeding Status</Label>
            <Select
              value={formData.breedingStatus}
              onValueChange={(value: BreedingStatus) => setFormData({ ...formData, breedingStatus: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {breedingStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="estimatedAgeMonths">Est. Age (months)</Label>
              <Input
                id="estimatedAgeMonths"
                type="number"
                min="0"
                placeholder="e.g., 12"
                value={formData.estimatedAgeMonths || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  estimatedAgeMonths: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="habitatType">Habitat Type</Label>
              <Select
                value={formData.habitatType}
                onValueChange={(value) => setFormData({ ...formData, habitatType: value as HabitatType })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select habitat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terrestrial">Terrestrial</SelectItem>
                  <SelectItem value="arboreal">Arboreal</SelectItem>
                  <SelectItem value="aquatic">Aquatic</SelectItem>
                  <SelectItem value="semi-aquatic">Semi-aquatic</SelectItem>
                  <SelectItem value="fossorial">Burrowing / Fossorial</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="humidityPreference">Humidity</Label>
              <Select
                value={formData.humidityPreference}
                onValueChange={(value) => setFormData({ ...formData, humidityPreference: value as any })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low / Arid</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="very-high">Very High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="uvbRequirement">UVB</Label>
              <Select
                value={formData.uvbRequirement}
                onValueChange={(value) => setFormData({ ...formData, uvbRequirement: value as UVBRequirement })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select requirement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="required">Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="waterRequirement">Water</Label>
              <Select
                value={formData.waterRequirement}
                onValueChange={(value) => setFormData({ ...formData, waterRequirement: value as WaterRequirement })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select need" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal / Sprays</SelectItem>
                  <SelectItem value="bowl">Water Bowl</SelectItem>
                  <SelectItem value="swim-area">Swim Area / Pond</SelectItem>
                  <SelectItem value="fully-aquatic">Fully Aquatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="handlingProfile">Handling Profile</Label>
              <Select
                value={formData.handlingProfile}
                onValueChange={(value) => setFormData({ ...formData, handlingProfile: value as HandlingProfile })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not-recommended">Not Recommended</SelectItem>
                  <SelectItem value="cautious">Cautious</SelectItem>
                  <SelectItem value="tolerant">Tolerant</SelectItem>
                  <SelectItem value="calm">Calm / Beginner Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2">
                <input
                  id="isVenomous"
                  type="checkbox"
                  checked={formData.isVenomous || false}
                  onChange={(e) => setFormData({ ...formData, isVenomous: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="isVenomous" className="text-sm">
                  Venomous / Dangerous
                </Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="acquisitionDate">Acquisition Date</Label>
            <Input
              id="acquisitionDate"
              type="date"
              value={formData.acquisitionDate}
              onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>

          <h3 className="section-header pt-2">Genetics (Advanced)</h3>

          <div>
            <Label className="mb-2 block">Genes</Label>
            <GeneEditor
              genes={formData.genes}
              onChange={(genes) => setFormData({ ...formData, genes })}
            />
          </div>

          <h3 className="section-header pt-2">Genetics (Basic/Legacy)</h3>

          <div>
            <Label htmlFor="hetsInput">Hets (comma-separated)</Label>
            <Input
              id="hetsInput"
              placeholder="e.g., Albino, Clown"
              value={formData.hetsInput}
              onChange={(e) => setFormData({ ...formData, hetsInput: e.target.value })}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for basic calculator fallback if no advanced genes are defined.
            </p>
          </div>

          <div>
            <Label htmlFor="geneticsNotes">Genetics Notes</Label>
            <Textarea
              id="geneticsNotes"
              placeholder="Any genetics information..."
              value={formData.geneticsNotes}
              onChange={(e) => setFormData({ ...formData, geneticsNotes: e.target.value })}
              className="mt-1.5 resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full touch-button" 
            disabled={saving || !formData.name.trim() || !formData.species.trim()}
          >
            {saving ? 'Creating...' : 'Create Reptile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
