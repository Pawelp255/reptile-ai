import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ContentSkeleton } from '@/components/system/SkeletonLoaders';
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
import { getAllReptiles, createPairing, getToday } from '@/lib/storage';
import { PAIRING_STATUS_OPTIONS } from '@/types';
import type { Reptile, PairingFormData, PairingStatus } from '@/types';

export default function CreatePairingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedReptileId = searchParams.get('reptileId');

  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PairingFormData>({
    parentAId: preselectedReptileId || '',
    parentBId: '',
    startDate: getToday(),
    status: 'planned',
    notes: '',
  });

  useEffect(() => {
    const loadReptiles = async () => {
      try {
        const allReptiles = await getAllReptiles();
        // Filter to breeders preferably but show all
        setReptiles(allReptiles);
        
        if (preselectedReptileId) {
          setFormData(prev => ({ ...prev, parentAId: preselectedReptileId }));
        } else if (allReptiles.length > 0) {
          setFormData(prev => ({ ...prev, parentAId: allReptiles[0].id }));
        }
      } catch (error) {
        console.error('Failed to load reptiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReptiles();
  }, [preselectedReptileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.parentAId || !formData.parentBId) return;
    if (formData.parentAId === formData.parentBId) return;

    setSaving(true);
    try {
      const pairing = await createPairing({
        ...formData,
        notes: formData.notes?.trim() || undefined,
      });
      navigate(`/breeding/pairings/${pairing.id}`);
    } catch (error) {
      console.error('Failed to create pairing:', error);
    } finally {
      setSaving(false);
    }
  };

  const availableParentB = reptiles.filter(r => r.id !== formData.parentAId);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Create Pairing" />
        <div className="page-content page-content-top loading-min-height">
          <ContentSkeleton />
        </div>
      </div>
    );
  }

  if (reptiles.length < 2) {
    return (
      <div className="page-container">
        <PageHeader title="Create Pairing" subtitle="Log a breeding pair and track lineage" />
        <div className="page-content page-content-top">
          <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-8 text-center border border-border/50">
            <EmptyState
              icon={<Heart className="w-16 h-16" />}
              title="You need two animals"
              description="Breeding pairs link two reptiles together. Add another animal, then choose parents A and B."
              action={
                <Button
                  className="w-full max-w-[280px] min-h-[48px] mx-auto tap-feedback"
                  onClick={() => navigate('/reptiles/new')}
                >
                  Add animal
                </Button>
              }
              secondaryAction={
                reptiles.length === 1 ? (
                  <Button variant="outline" className="min-h-[44px] tap-feedback" asChild>
                    <Link to="/reptiles">Browse My Animals</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Create Pairing"
        subtitle="Set up a new breeding pair"
        rightContent={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        }
      />

      <form id="create-pairing-form" onSubmit={handleSubmit} className="p-4 space-y-6 pb-32">
        {/* Parent A Selection */}
        <div>
          <Label htmlFor="parentA">Parent A *</Label>
          <Select
            value={formData.parentAId}
            onValueChange={(value) => setFormData({ ...formData, parentAId: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select parent A" />
            </SelectTrigger>
            <SelectContent>
              {reptiles.map((reptile) => (
                <SelectItem key={reptile.id} value={reptile.id}>
                  {reptile.name} ({reptile.species}) - {reptile.sex === 'male' ? '♂' : reptile.sex === 'female' ? '♀' : '?'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parent B Selection */}
        <div>
          <Label htmlFor="parentB">Parent B *</Label>
          <Select
            value={formData.parentBId}
            onValueChange={(value) => setFormData({ ...formData, parentBId: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select parent B" />
            </SelectTrigger>
            <SelectContent>
              {availableParentB.map((reptile) => (
                <SelectItem key={reptile.id} value={reptile.id}>
                  {reptile.name} ({reptile.species}) - {reptile.sex === 'male' ? '♂' : reptile.sex === 'female' ? '♀' : '?'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="mt-1.5"
            required
          />
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(value: PairingStatus) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAIRING_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any notes about this pairing..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1.5 resize-none"
            rows={3}
          />
        </div>

      </form>

      <div className="sticky-bottom-actions">
        <Button
          form="create-pairing-form"
          type="submit"
          className="w-full min-h-[48px] tap-feedback"
          disabled={saving || !formData.parentAId || !formData.parentBId || formData.parentAId === formData.parentBId}
        >
          {saving ? 'Creating...' : 'Create Pairing'}
        </Button>
      </div>
    </div>
  );
}
