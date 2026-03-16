import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Egg, Calendar, Edit, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
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
  getPairingById,
  updatePairing,
  deletePairing,
  getReptileById,
  getClutchesByPairing,
  createClutch,
  getToday,
  addDays,
} from '@/lib/storage';
import { PAIRING_STATUS_OPTIONS } from '@/types';
import type { Pairing, Reptile, Clutch, PairingStatus, ClutchFormData } from '@/types';

const statusColors = {
  planned: 'bg-blue-500/10 text-blue-600',
  active: 'bg-green-500/10 text-green-600',
  completed: 'bg-purple-500/10 text-purple-600',
  cancelled: 'bg-gray-500/10 text-gray-600',
};

export default function PairingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [parentA, setParentA] = useState<Reptile | null>(null);
  const [parentB, setParentB] = useState<Reptile | null>(null);
  const [clutches, setClutches] = useState<Clutch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addClutchOpen, setAddClutchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [clutchForm, setClutchForm] = useState<ClutchFormData>({
    pairingId: id || '',
    laidDate: getToday(),
    eggCount: 1,
    incubatorNotes: '',
    expectedHatchDate: addDays(getToday(), 60), // Default 60 days
  });

  const loadData = async () => {
    if (!id) return;

    try {
      const [pairingData, clutchesData] = await Promise.all([
        getPairingById(id),
        getClutchesByPairing(id),
      ]);

      if (!pairingData) {
        navigate('/reptiles');
        return;
      }

      setPairing(pairingData);
      setClutches(clutchesData.sort((a, b) => b.laidDate.localeCompare(a.laidDate)));

      // Load parents
      const [parentAData, parentBData] = await Promise.all([
        getReptileById(pairingData.parentAId),
        getReptileById(pairingData.parentBId),
      ]);

      setParentA(parentAData || null);
      setParentB(parentBData || null);
    } catch (error) {
      console.error('Failed to load pairing:', error);
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
      await deletePairing(id);
      toast.success('Pairing deleted');
      navigate(-1);
    } catch (error) {
      console.error('Failed to delete pairing:', error);
      toast.error('Failed to delete pairing');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: PairingStatus) => {
    if (!id) return;

    try {
      await updatePairing(id, { status: newStatus });
      setPairing(prev => prev ? { ...prev, status: newStatus } : null);
      setEditingStatus(false);
      toast.success('Status updated');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddClutch = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await createClutch({
        ...clutchForm,
        pairingId: id,
        incubatorNotes: clutchForm.incubatorNotes?.trim() || undefined,
      });
      await loadData();
      setAddClutchOpen(false);
      setClutchForm({
        pairingId: id,
        laidDate: getToday(),
        eggCount: 1,
        incubatorNotes: '',
        expectedHatchDate: addDays(getToday(), 60),
      });
      toast.success('Clutch added');
    } catch (error) {
      console.error('Failed to add clutch:', error);
      toast.error('Failed to add clutch');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pairing) {
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
        title="Pairing Details"
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
        {/* Parents Info */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="section-header mb-3">Parents</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to={`/reptiles/${parentA?.id}`} className="block">
              <div className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                <span className="text-xs text-muted-foreground">Parent A</span>
                <p className="font-medium">{parentA?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {parentA?.species} {parentA?.sex === 'male' ? '♂' : parentA?.sex === 'female' ? '♀' : ''}
                </p>
              </div>
            </Link>
            <Link to={`/reptiles/${parentB?.id}`} className="block">
              <div className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                <span className="text-xs text-muted-foreground">Parent B</span>
                <p className="font-medium">{parentB?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {parentB?.species} {parentB?.sex === 'male' ? '♂' : parentB?.sex === 'female' ? '♀' : ''}
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Status & Info */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="section-header mb-3">Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              {editingStatus ? (
                <Select
                  value={pairing.status}
                  onValueChange={(value: PairingStatus) => handleStatusChange(value)}
                >
                  <SelectTrigger className="w-32">
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
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[pairing.status]}`}>
                    {PAIRING_STATUS_OPTIONS.find(o => o.value === pairing.status)?.label}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingStatus(true)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium">{format(new Date(pairing.startDate), 'MMM d, yyyy')}</span>
            </div>
            {pairing.notes && (
              <div className="pt-2 border-t border-border">
                <span className="text-muted-foreground text-sm">Notes</span>
                <p className="text-sm mt-1">{pairing.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Genetics Calculator Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/genetics?parentA=${pairing.parentAId}&parentB=${pairing.parentBId}`)}
        >
          <Calculator className="w-4 h-4 mr-2" />
          Open Genetics Calculator
        </Button>

        {/* Clutches */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-header">Clutches</h3>
            <Button size="sm" variant="outline" onClick={() => setAddClutchOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Clutch
            </Button>
          </div>

          {clutches.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <Egg className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No clutches recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clutches.map((clutch) => (
                <Link 
                  key={clutch.id} 
                  to={`/breeding/clutches/${clutch.id}`}
                  className="block p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Egg className="w-4 h-4 text-amber-500" />
                      <span className="font-medium">{clutch.eggCount} eggs</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(clutch.laidDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {clutch.hatchCount !== undefined && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {clutch.hatchCount} hatched
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pairing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this pairing and all associated clutches and offspring records.
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

      {/* Add Clutch Dialog */}
      <Dialog open={addClutchOpen} onOpenChange={setAddClutchOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Clutch</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="laidDate">Laid Date *</Label>
              <Input
                id="laidDate"
                type="date"
                value={clutchForm.laidDate}
                onChange={(e) => setClutchForm({ ...clutchForm, laidDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="eggCount">Egg Count *</Label>
              <Input
                id="eggCount"
                type="number"
                min="1"
                value={clutchForm.eggCount}
                onChange={(e) => setClutchForm({ ...clutchForm, eggCount: parseInt(e.target.value) || 1 })}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="expectedHatchDate">Expected Hatch Date</Label>
              <Input
                id="expectedHatchDate"
                type="date"
                value={clutchForm.expectedHatchDate}
                onChange={(e) => setClutchForm({ ...clutchForm, expectedHatchDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label htmlFor="incubatorNotes">Incubator Notes</Label>
              <Textarea
                id="incubatorNotes"
                placeholder="Temperature, humidity, etc..."
                value={clutchForm.incubatorNotes}
                onChange={(e) => setClutchForm({ ...clutchForm, incubatorNotes: e.target.value })}
                className="mt-1.5 resize-none"
                rows={2}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleAddClutch}
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Clutch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
