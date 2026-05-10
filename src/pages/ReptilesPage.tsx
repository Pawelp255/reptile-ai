import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { ReptileCard } from '@/components/ReptileCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getAllReptiles,
  getNextFeedingDate,
  isSampleDatasetEnabled,
  persistReptilesDisplayOrder,
  seedExpoDemo,
  updateSettings,
} from '@/lib/storage';
import { ReptileListSkeleton } from '@/components/system/SkeletonLoaders';
import type { Reptile } from '@/types';
import { REPTILES_CLOUD_SYNC_EVENT } from '@/lib/reptiles/cloudSync';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Search, Bug, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';

interface ReptileWithFeeding {
  reptile: Reptile;
  nextFeedingDate?: string;
}

function SortableReptileRow({ reptile, nextFeedingDate }: { reptile: Reptile; nextFeedingDate?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reptile.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'relative z-20 opacity-90' : undefined}>
      <div className="flex min-w-0 items-stretch gap-2">
        <button
          type="button"
          className="mt-0.5 flex h-11 w-9 shrink-0 touch-none items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted/70"
          {...attributes}
          {...listeners}
          aria-label="Hold and drag to reorder"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <ReptileCard reptile={reptile} nextFeedingDate={nextFeedingDate} />
        </div>
      </div>
    </div>
  );
}

export default function ReptilesPage() {
  const [reptiles, setReptiles] = useState<ReptileWithFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reptile' | 'amphibian'>('all');
  const [loadingSample, setLoadingSample] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const loadReptiles = useCallback(async () => {
    try {
      const allReptiles = await getAllReptiles();

      const reptilesWithFeeding = await Promise.all(
        allReptiles.map(async (reptile) => ({
          reptile,
          nextFeedingDate: await getNextFeedingDate(reptile.id),
        })),
      );

      setReptiles(reptilesWithFeeding);
    } catch (error) {
      console.error('Failed to load reptiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReptiles();
  }, [loadReptiles]);

  useEffect(() => {
    const onCloudSyncFinished = (event: Event) => {
      const detail = (event as CustomEvent<{ ok?: boolean }>).detail;
      if (detail?.ok) void loadReptiles();
    };
    window.addEventListener(REPTILES_CLOUD_SYNC_EVENT, onCloudSyncFinished);
    return () => window.removeEventListener(REPTILES_CLOUD_SYNC_EVENT, onCloudSyncFinished);
  }, [loadReptiles]);

  const handleLoadSampleData = async () => {
    setLoadingSample(true);
    try {
      await seedExpoDemo();
      await updateSettings({ expoDemoMode: true });
      toast.success('Starter setup ready');
      await loadReptiles();
    } catch (e) {
      console.error('Failed to load sample data:', e);
      toast.error('Could not load sample data');
    } finally {
      setLoadingSample(false);
    }
  };

  const filteredReptiles = useMemo(
    () =>
      reptiles
        .filter(({ reptile }) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          return (
            reptile.name.toLowerCase().includes(query) ||
            reptile.species.toLowerCase().includes(query) ||
            (reptile.morph?.toLowerCase().includes(query) ?? false)
          );
        })
        .filter(({ reptile }) => {
          if (typeFilter === 'all') return true;
          const cls = reptile.animalClass ?? (reptile.isAmphibian ? 'amphibian' : 'reptile');
          return typeFilter === 'amphibian' ? cls === 'amphibian' : cls === 'reptile';
        }),
    [reptiles, searchQuery, typeFilter],
  );

  const reorderEnabled = !searchQuery.trim() && typeFilter === 'all' && reptiles.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setReptiles((items) => {
      const oldIndex = items.findIndex((x) => x.reptile.id === active.id);
      const newIndex = items.findIndex((x) => x.reptile.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      void persistReptilesDisplayOrder(next.map((x) => x.reptile.id));
      return next;
    });
  };

  if (loading) {
    return (
      <PageMotion className="page-container">
        <PageHeader title="My Animals" />
        <div className="page-content page-content-top loading-min-height">
          <ReptileListSkeleton />
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion className="page-container">
      <PageHeader
        title="My Animals"
        subtitle={`${reptiles.length} animal${reptiles.length !== 1 ? 's' : ''}`}
        rightContent={
          <Button
            size="sm"
            className="tap-feedback shrink-0 min-h-[40px] px-3.5 rounded-full glass-shell text-sm font-medium shadow-[var(--surface-shadow)]"
            asChild
          >
            <Link to="/reptiles/new">
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </Link>
          </Button>
        }
      />

      <div className="page-content page-content-top">
        {reptiles.length > 0 && (
          <div className="glass-panel rounded-[var(--radius-xl)] p-3.5 sm:p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground/80">Animals</p>
                <p className="text-sm text-muted-foreground truncate">
                  {filteredReptiles.length} match
                  {filteredReptiles.length === 1 ? '' : 'es'} · {reptiles.length} total
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary/90 text-xs font-medium tabular-nums shrink-0">
                {reptiles.length}
              </div>
            </div>
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80 pointer-events-none"
                aria-hidden
              />
              <Input
                placeholder="Search by name or species"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/80 backdrop-blur-sm border border-border/60 rounded-[var(--radius-lg)] placeholder:text-muted-foreground/60 transition-[color,background,box-shadow] duration-200 shadow-[var(--shadow-card)] focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className="min-h-[32px] px-3 text-xs"
                onClick={() => setTypeFilter('all')}
              >
                All
              </Button>
              <Button
                type="button"
                variant={typeFilter === 'reptile' ? 'default' : 'outline'}
                size="sm"
                className="min-h-[32px] px-3 text-xs"
                onClick={() => setTypeFilter('reptile')}
              >
                Reptiles
              </Button>
              <Button
                type="button"
                variant={typeFilter === 'amphibian' ? 'default' : 'outline'}
                size="sm"
                className="min-h-[32px] px-3 text-xs"
                onClick={() => setTypeFilter('amphibian')}
              >
                Amphibians
              </Button>
            </div>
            {reorderEnabled ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Hold the handle, then drag to reorder. Order is saved on this device and syncs when you are signed in.
              </p>
            ) : reptiles.length > 1 ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Set filter to All and clear search to drag and reorder your list.
              </p>
            ) : null}
          </div>
        )}

        {reptiles.length === 0 ? (
          <div className="animate-in-fade">
            <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-7 text-center">
              <EmptyState
                icon={<Bug className="w-16 h-16" />}
                title="No animals yet"
                description="Add your first animal to track feeding, health checks, and care schedules."
                action={
                  <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button className="w-full min-h-[48px] tap-feedback sm:w-auto" asChild>
                      <Link to="/reptiles/new" className="w-full sm:inline-flex sm:justify-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Add your first animal
                      </Link>
                    </Button>
                    {isSampleDatasetEnabled() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-h-[44px] text-muted-foreground sm:w-auto tap-feedback"
                        disabled={loadingSample}
                        onClick={handleLoadSampleData}
                      >
                        {loadingSample ? 'Loading…' : 'Load sample data'}
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        ) : filteredReptiles.length === 0 ? (
          <div className="animate-in-fade">
            <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-8 text-center border border-border/50">
              <EmptyState
                icon={<Search className="w-12 h-12" />}
                title="Nothing matches filters"
                description="Clear search or widen the reptile/amphibian filter to see your list again."
                action={
                  <Button
                    type="button"
                    className="w-full max-w-[280px] mx-auto min-h-[48px] tap-feedback"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                    }}
                  >
                    Reset search & filters
                  </Button>
                }
              />
            </div>
          </div>
        ) : reorderEnabled ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={reptiles.map((r) => r.reptile.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5 overflow-x-hidden">
                {reptiles.map(({ reptile, nextFeedingDate }) => (
                  <SortableReptileRow key={reptile.id} reptile={reptile} nextFeedingDate={nextFeedingDate} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <StaggerList className="space-y-2.5 overflow-x-hidden">
            {filteredReptiles.map(({ reptile, nextFeedingDate }) => (
              <StaggerItem key={reptile.id}>
                <ReptileCard reptile={reptile} nextFeedingDate={nextFeedingDate} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </PageMotion>
  );
}
