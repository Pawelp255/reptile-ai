import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, X, PawPrint } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAllReptiles,
  createCareEvent,
  getCareEventById,
  getToday,
  reconcileScheduleAfterManualCareEvent,
  updateCareEvent,
} from '@/lib/storage';
import { pushCareTasksToCloudByIds } from '@/lib/reptiles/cloudSync';
import type { Reptile, EventType, CareEventFormData, Supplement } from '@/types';
import { toast } from 'sonner';
import { SUPPLEMENT_OPTIONS } from '@/types';
import { lightHaptic, mediumHaptic } from '@/lib/native/haptics';

const eventTypeOptions: { value: EventType; label: string; emoji: string }[] = [
  { value: 'feeding', label: 'Feeding', emoji: '🍽️' },
  { value: 'cleaning', label: 'Cleaning', emoji: '✨' },
  { value: 'shedding', label: 'Shedding', emoji: '🔄' },
  { value: 'health', label: 'Health Check', emoji: '❤️' },
  { value: 'handling', label: 'Handling', emoji: '🖐️' },
  { value: 'note', label: 'Note', emoji: '📝' },
];

export default function AddEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editEventId = searchParams.get('eventId');
  const returnTo = searchParams.get('returnTo');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CareEventFormData>({
    reptileId: '',
    eventType: 'feeding',
    eventDate: getToday(),
    details: '',
    photoDataUrl: undefined,
    weightGrams: undefined,
    lengthCm: undefined,
    supplements: [],
  });
  const isEditing = !!editEventId;

  useEffect(() => {
    const loadReptiles = async () => {
      try {
        const [allReptiles, eventToEdit] = await Promise.all([
          getAllReptiles(),
          editEventId ? getCareEventById(editEventId) : Promise.resolve(undefined),
        ]);
        setReptiles(allReptiles);
        if (editEventId) {
          if (!eventToEdit) {
            toast.error('Event not found');
            navigate('/journal');
            return;
          }
          setFormData({
            reptileId: eventToEdit.reptileId,
            eventType: eventToEdit.eventType,
            eventDate: eventToEdit.eventDate,
            details: eventToEdit.details || '',
            photoDataUrl: eventToEdit.photoDataUrl,
            weightGrams: eventToEdit.weightGrams,
            lengthCm: eventToEdit.lengthCm,
            supplements: eventToEdit.supplements || [],
          });
        } else if (allReptiles.length > 0) {
          setFormData(prev => ({ ...prev, reptileId: allReptiles[0].id }));
        }
      } catch (error) {
        console.error('Failed to load reptiles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReptiles();
  }, [editEventId, navigate]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress and convert to data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width / height) * maxSize;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, photoDataUrl: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoDataUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSupplementToggle = (supplement: Supplement, checked: boolean) => {
    setFormData(prev => {
      const current = prev.supplements || [];
      if (checked) {
        // Phase 1.5 Fix: Use Set to prevent duplicates
        const updated = new Set([...current, supplement]);
        return { ...prev, supplements: Array.from(updated) };
      } else {
        return { ...prev, supplements: current.filter(s => s !== supplement) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reptileId) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        details: formData.details?.trim() || undefined,
        // Only include health metrics for health events
        weightGrams: formData.eventType === 'health' ? formData.weightGrams : undefined,
        lengthCm: formData.eventType === 'health' ? formData.lengthCm : undefined,
        // Only include supplements for feeding events
        supplements: formData.eventType === 'feeding' && formData.supplements?.length 
          ? formData.supplements 
          : undefined,
      };

      const saved = editEventId
        ? await updateCareEvent(editEventId, payload)
        : await createCareEvent(payload);

      if (!editEventId) {
        const scheduleId = await reconcileScheduleAfterManualCareEvent(
          saved.reptileId,
          saved.eventType,
          saved.eventDate,
        );
        if (scheduleId) {
          void pushCareTasksToCloudByIds([scheduleId], { notifyOnError: true });
        }
      }

      await mediumHaptic();
      toast.success(editEventId ? 'Event updated locally' : 'Event saved locally', {
        description: 'Your journal updates instantly and syncs when available.',
      });
      navigate(returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/journal');
    } catch (error) {
      console.error(editEventId ? 'Failed to update event:' : 'Failed to create event:', error);
      toast.error('Could not save event — try again');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title={isEditing ? 'Edit Event' : 'Add Event'} />
        <div className="page-content page-content-top loading-min-height flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading your animals…</div>
        </div>
      </div>
    );
  }

  if (reptiles.length === 0) {
    return (
      <div className="page-container">
        <PageHeader title={isEditing ? 'Edit Event' : 'Add Event'} />
        <div className="page-content page-content-top">
          <EmptyState
            icon={<PawPrint className="w-16 h-16" />}
            title="No animals yet"
            description="Add an animal from My Animals first, then you can log events here."
            action={
              <Button
                className="w-full"
                onClick={() => {
                  void lightHaptic();
                  navigate('/reptiles/new');
                }}
              >
                Add Animal
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={isEditing ? 'Edit Event' : 'Add Event'}
        subtitle={isEditing ? 'Update care event details' : 'Log a care event'}
      />

      <form id="add-event-form" onSubmit={handleSubmit} className="page-content page-content-top space-y-6 pb-32 scroll-pb-32">
        {/* Reptile Selection */}
        <div>
          <Label htmlFor="reptile">Reptile *</Label>
          <Select
            value={formData.reptileId}
            onValueChange={(value) => setFormData({ ...formData, reptileId: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select an animal" />
            </SelectTrigger>
            <SelectContent>
              {reptiles.map((reptile) => (
                <SelectItem key={reptile.id} value={reptile.id}>
                  {reptile.name} ({reptile.species})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event Type */}
        <div>
          <Label htmlFor="eventType">Event Type *</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value: EventType) => setFormData({ ...formData, eventType: value })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.emoji}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div>
          <Label htmlFor="eventDate">Date *</Label>
          <Input
            id="eventDate"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
            className="mt-1.5"
            required
          />
        </div>

        {/* Health Metrics - only shown for health events */}
        {formData.eventType === 'health' && (
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg border border-border">
            <h4 className="font-medium text-sm">Health Metrics (optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightGrams">Weight (grams)</Label>
                <Input
                  id="weightGrams"
                  type="number"
                  min="0"
                  placeholder="e.g., 1850"
                  value={formData.weightGrams || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    weightGrams: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="lengthCm">Length (cm)</Label>
                <Input
                  id="lengthCm"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g., 120"
                  value={formData.lengthCm || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    lengthCm: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {/* Supplements - only shown for feeding events */}
        {formData.eventType === 'feeding' && (
          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border">
            <h4 className="font-medium text-sm">Supplements (optional)</h4>
            <div className="flex flex-wrap gap-4">
              {SUPPLEMENT_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`supplement-${option.value}`}
                    checked={formData.supplements?.includes(option.value) || false}
                    onCheckedChange={(checked) => 
                      handleSupplementToggle(option.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`supplement-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div>
          <Label htmlFor="details">Details (optional)</Label>
          <Textarea
            id="details"
            placeholder="Add any notes about this event..."
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            className="mt-1.5 resize-none"
            rows={3}
          />
        </div>

        {/* Photo */}
        <div>
          <Label>Photo (optional)</Label>
          <div className="mt-1.5">
            {formData.photoDataUrl ? (
              <div className="relative inline-block">
                <img 
                  src={formData.photoDataUrl} 
                  alt="Event photo" 
                  className="w-32 h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-xs">Add Photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        </div>

      </form>

      <div className="sticky-bottom-actions">
        <Button
          form="add-event-form"
          type="submit"
          className="w-full min-h-[48px] tap-feedback"
          disabled={saving || !formData.reptileId}
        >
          {saving ? 'Saving…' : isEditing ? 'Update Event' : 'Save Event'}
        </Button>
      </div>
    </div>
  );
}
