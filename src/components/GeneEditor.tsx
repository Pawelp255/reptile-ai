import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GeneticGene, InheritanceMode, GeneState } from '@/types/genetics';
import {
  INHERITANCE_MODE_OPTIONS,
  getStateOptionsForMode,
  formatGeneState,
} from '@/types/genetics';

interface GeneEditorProps {
  genes: GeneticGene[];
  onChange: (genes: GeneticGene[]) => void;
}

export function GeneEditor({ genes, onChange }: GeneEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGene, setNewGene] = useState<Partial<GeneticGene>>({
    name: '',
    mode: 'dominant',
    state: 'visual',
  });

  const handleAddGene = () => {
    if (!newGene.name?.trim()) return;

    const gene: GeneticGene = {
      name: newGene.name.trim(),
      mode: newGene.mode as InheritanceMode,
      state: newGene.state as GeneState,
    };

    onChange([...genes, gene]);
    setNewGene({ name: '', mode: 'dominant', state: 'visual' });
    setShowAddForm(false);
  };

  const handleRemoveGene = (index: number) => {
    const updated = genes.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleModeChange = (mode: InheritanceMode) => {
    // Reset state to first valid option for new mode
    const stateOptions = getStateOptionsForMode(mode);
    setNewGene({
      ...newGene,
      mode,
      state: stateOptions[0].value,
    });
  };

  const stateOptions = getStateOptionsForMode(newGene.mode as InheritanceMode);

  return (
    <div className="space-y-3">
      {/* Existing genes as chips */}
      {genes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genes.map((gene, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
            >
              <span className="font-medium">{gene.name}</span>
              <span className="text-primary/70 text-xs">
                ({gene.mode === 'codominant' ? 'codom' : gene.mode}, {gene.state.replace('_', ' ')})
              </span>
              <button
                type="button"
                onClick={() => handleRemoveGene(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add gene form */}
      {showAddForm ? (
        <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
          <div>
            <Label htmlFor="geneName" className="text-xs">Gene Name</Label>
            <Input
              id="geneName"
              placeholder="e.g., Pastel, Albino"
              value={newGene.name || ''}
              onChange={(e) => setNewGene({ ...newGene, name: e.target.value })}
              className="mt-1 h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Inheritance</Label>
              <Select
                value={newGene.mode}
                onValueChange={(value: InheritanceMode) => handleModeChange(value)}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INHERITANCE_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">State</Label>
              <Select
                value={newGene.state}
                onValueChange={(value: GeneState) => setNewGene({ ...newGene, state: value })}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddGene}
              disabled={!newGene.name?.trim()}
            >
              Add Gene
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setNewGene({ name: '', mode: 'dominant', state: 'visual' });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Gene
        </Button>
      )}

      {genes.length === 0 && !showAddForm && (
        <p className="text-xs text-muted-foreground">
          No advanced genetics defined. Use the button above to add genes with inheritance modes.
        </p>
      )}
    </div>
  );
}
