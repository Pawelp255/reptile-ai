import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Baby, Egg, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getClutchById,
  updateClutch,
  deleteClutch,
  getPairingById,
  getReptileById,
  getOffspringByClutch,
  createOffspring,
  deleteOffspring,
} from '@/lib/storage';
import type { Clutch, Pairing, Reptile, Offspring, Sex, OffspringFormData } from '@/types';

export default function ClutchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [clutch, setClutch] = useState<Clutch | null>(null);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [parentA, setParentA] = useState<Reptile | null>(null);
  const [parentB, setParentB] = useState<Reptile | null>(null);
  const [offspring, setOffspring] = useState<Offspring[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addOffspringOpen, setAddOffspringOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingHatchCount, setEditingHatchCount] = useState(false);
  const [deleteOffspringId, setDeleteOffspringId] = useState<string | null>(null);
  const [deletingOffspring, setDeletingOffspring] = useState(false);
  const [tempHatchCount, setTempHatchCount] = useState<number>(0);
  const [offspringForm, setOffspringForm] = useState<OffspringFormData>({
    clutchId: id || '',
    name: '',
    sex: 'unknown',
    morph: '',
    hets: [],
    notes: '',
  });

  const loadData = async () => {
    if (!id) return;

    try {
      const clutchData = await getClutchById(id);

      if (!clutchData) {
        navigate('/reptiles');
        return;
      }

      setClutch(clutchData);
      setTempHatchCount(clutchData.hatchCount || 0);

      const [pairingData, offspringData] = await Promise.all([
        getPairingById(clutchData.pairingId),
        getOffspringByClutch(id),
      ]);

      setPairing(pairingData || null);
      setOffspring(offspringData);

      if (pairingData) {
        const [parentAData, parentBData] = await Promise.all([
          getReptileById(pairingData.parentAId),
          getReptileById(pairingData.parentBId),
        ]);
        setParentA(parentAData || null);
        setParentB(parentBData || null);
      }
    } catch (error) {
      console.error('Failed to load clutch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await deleteClutch(id);
      toast.success('Clutch deleted');
      navigate(-1);
    } catch (error) {
      console.error('Failed to delete clutch:', error);
      toast.error('Failed to delete clutch');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveHatchCount = async () => {
    if (!id) return;

    try {
      await updateClutch(id, { hatchCount: tempHatchCount });
      setClutch(prev => prev ? { ...prev, hatchCount: tempHatchCount } : null);
      setEditingHatchCount(false);
      toast.success('Hatch count updated');
    } catch (error) {
      console.error('Failed to update hatch count:', error);
      toast.error('Failed to update');
    }
  };

  const handleAddOffspring = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await createOffspring({
        ...offspringForm,
        clutchId: id,
        name: offspringForm.name?.trim() || undefined,
        morph: offspringForm.morph?.trim() || undefined,
        notes: offspringForm.notes?.trim() || undefined,
      });
      await loadData();
      setAddOffspringOpen(false);
      setOffspringForm({
        clutchId: id,
        name: '',
        sex: 'unknown',
        morph: '',
        hets: [],
        notes: '',
      });
      toast.success('Offspring added');
    } catch (error) {
      console.error('Failed to add offspring:', error);
      toast.error('Failed to add offspring');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOffspring = async () => {
    if (!deleteOffspringId) return;

    setDeletingOffspring(true);
    try {
      await deleteOffspring(deleteOffspringId);
      await loadData();
      setDeleteOffspringId(null);
      toast.success('Offspring deleted');
    } catch (error) {
      console.error('Failed to delete offspring:', error);
      toast.error('Failed to delete offspring');
    } finally {
      setDeletingOffspring(false);
    }
  };

  if (loading || !clutch) {
    return (
      <div className="page-container">
        <PageHeader title="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Clutch Details"
        subtitle={`${clutch.eggCount} eggs`}
        rightContent={
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-6">
        {/* Parents Link */}
        {pairing && (
          <Link 
            to={`/breeding/pairings/${pairing.id}`}
            className="block bg-card rounded-xl p-4 border border-border hover:bg-secondary/50 transition-colors"
          >
            <span className="text-xs text-muted-foreground">From pairing</span>
            <p className="font-medium">{parentA?.name} × {parentB?.name}</p>
          </Link>
        )}

        {/* Clutch Info */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="section-header mb-3">Clutch Info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Laid Date</span>
              <span className="font-medium">{format(new Date(clutch.laidDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Egg Count</span>
              <span className="font-medium">{clutch.eggCount}</span>
            </div>
            {clutch.expectedHatchDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expected Hatch</span>
                <span className="font-medium">{format(new Date(clutch.expectedHatchDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hatched</span>
              {editingHatchCount ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={clutch.eggCount}
                    value={tempHatchCount}
                    onChange={(e) => setTempHatchCount(parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                  <Button size="sm" onClick={handleSaveHatchCount}>Save</Button>
                </div>
              ) : (
                <button 
                  onClick={() => setEditingHatchCount(true)}
                  className="font-medium hover:text-primary"
                >
                  {clutch.hatchCount !== undefined ? clutch.hatchCount : 'Set count'}
                </button>
              )}
            </div>
            {clutch.incubatorNotes && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm">Incubator Notes</span>
                <p className="text-sm mt-1">{clutch.incubatorNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Offspring */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-header">Offspring</h3>
            <Button size="sm" variant="outline" onClick={() => setAddOffspringOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {offspring.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Baby className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No offspring recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {offspring.map((o) => (
                <div 
                  key={o.id} 
                  className="p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {o.name || 'Unnamed'} 
                        <span className="ml-1 text-muted-foreground">
                          {o.sex === 'male' ? '♂' : o.sex === 'female' ? '♀' : ''}
                        </span>
                      </span>
                      {o.morph && (
                        <p className="text-sm text-muted-foreground">{o.morph}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteOffspringId(o.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {o.hets && o.hets.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Het: {o.hets.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this clutch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this clutch and all offspring records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Offspring Dialog */}
      <AlertDialog open={!!deleteOffspringId} onOpenChange={(open) => !open && setDeleteOffspringId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offspring?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this offspring record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOffspring}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteOffspring}
              disabled={deletingOffspring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingOffspring ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Offspring Dialog */}
      <Dialog open={addOffspringOpen} onOpenChange={setAddOffspringOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Offspring</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="offspringName">Name (optional)</Label>
              <Input
                id="offspringName"
                placeholder="e.g., Baby #1"
                value={offspringForm.name}
                onChange={(e) => setOffspringForm({ ...offspringForm, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="offspringSex">Sex</Label>
              <Select
                value={offspringForm.sex}
                onValueChange={(value: Sex) => setOffspringForm({ ...offspringForm, sex: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="male">Male ♂</SelectItem>
                  <SelectItem value="female">Female ♀</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="offspringMorph">Morph</Label>
              <Input
                id="offspringMorph"
                placeholder="e.g., Pastel"
                value={offspringForm.morph}
                onChange={(e) => setOffspringForm({ ...offspringForm, morph: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="offspringNotes">Notes</Label>
              <Textarea
                id="offspringNotes"
                placeholder="Any notes..."
                value={offspringForm.notes}
                onChange={(e) => setOffspringForm({ ...offspringForm, notes: e.target.value })}
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddOffspring}
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Offspring'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
