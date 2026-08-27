import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
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
import { Plus, Search, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { lightHaptic, mediumHaptic } from '@/lib/native/haptics';
import { cn } from '@/lib/utils';
import { resolveAnimalGroup, type AnimalCategory, type AnimalGroup } from '@/lib/animals/taxonomy';

interface ReptileWithFeeding {
  reptile: Reptile;
  nextFeedingDate?: string;
}

type AnimalFilter =
  | 'all'
  | 'snakes'
  | 'lizards'
  | 'geckos'
  | 'turtles'
  | 'amphibians'
  | 'invertebrates'
  | 'fish'
  | 'other';

const ANIMAL_FILTER_OPTIONS: { value: AnimalFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'snakes', label: 'Snakes' },
  { value: 'lizards', label: 'Lizards' },
  { value: 'geckos', label: 'Geckos' },
  { value: 'turtles', label: 'Turtles' },
  { value: 'amphibians', label: 'Amphibians' },
  { value: 'invertebrates', label: 'Invertebrates' },
  { value: 'fish', label: 'Fish' },
  { value: 'other', label: 'Other' },
];

const VALID_ANIMAL_GROUPS = new Set<AnimalGroup>(['reptile', 'amphibian', 'invertebrate', 'fish', 'other']);
const SNAKE_CATEGORIES = new Set<AnimalCategory>(['snake']);
const GECKO_CATEGORIES = new Set<AnimalCategory>(['gecko']);
const LIZARD_CATEGORIES = new Set<AnimalCategory>([
  'lizard',
  'monitor',
  'skink',
  'tegu',
  'chameleon',
  'iguana',
  'anole',
]);
const TURTLE_CATEGORIES = new Set<AnimalCategory>(['turtle', 'tortoise']);

function getSafeAnimalGroup(reptile: Reptile): AnimalGroup | 'unknown' {
  const rawGroup = (reptile as { animalGroup?: string }).animalGroup;
  if (rawGroup) return VALID_ANIMAL_GROUPS.has(rawGroup as AnimalGroup) ? (rawGroup as AnimalGroup) : 'unknown';
  return resolveAnimalGroup(reptile);
}

function getAnimalSearchText(reptile: Reptile): string {
  return [
    reptile.species,
    reptile.commonName,
    reptile.scientificName,
    reptile.speciesGroup,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesQuickAnimalFilter(reptile: Reptile, filter: AnimalFilter): boolean {
  if (filter === 'all') return true;

  const category = reptile.animalCategory;
  const group = getSafeAnimalGroup(reptile);
  const text = getAnimalSearchText(reptile);

  switch (filter) {
    case 'snakes':
      return (
        (category ? SNAKE_CATEGORIES.has(category) : false) ||
        /\b(snake|python|boa|boid|colubrid|corn snake|kingsnake|milk snake|hognose)\b/.test(text)
      );
    case 'geckos':
      return (category ? GECKO_CATEGORIES.has(category) : false) || /\b(gecko|eublepharis|correlophus|rhacodactylus|gekko)\b/.test(text);
    case 'lizards':
      return (
        (category ? LIZARD_CATEGORIES.has(category) : false) ||
        /\b(lizard|monitor|skink|tegu|chameleon|iguana|anole|bearded dragon|dragon|agama|varanus|pogona)\b/.test(text)
      );
    case 'turtles':
      return (category ? TURTLE_CATEGORIES.has(category) : false) || /\b(turtle|tortoise|terrapin|slider|cooter)\b/.test(text);
    case 'amphibians':
      return group === 'amphibian';
    case 'invertebrates':
      return group === 'invertebrate';
    case 'fish':
      return group === 'fish';
    case 'other':
      return group === 'other' || group === 'unknown';
    default:
      return true;
  }
}

function SortableReptileRow({
  reptile,
  nextFeedingDate,
  reducedMotion,
}: {
  reptile: Reptile;
  nextFeedingDate?: string;
  reducedMotion: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: reptile.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'min-w-0 cursor-grab rounded-[calc(var(--radius-xl)+2px)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDragging && 'relative z-[19]',
      )}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          'relative rounded-[calc(var(--radius-xl)+2px)]',
          'ring-1 ring-inset ring-border/45',
          'before:pointer-events-none before:absolute before:left-1.5 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-full before:bg-primary/25',
          isDragging &&
            !reducedMotion &&
            '[&_.reptile-card]:-translate-y-0.5 [&_.reptile-card]:scale-[1.02] [&_.reptile-card]:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.32)] [&_.reptile-card]:ring-1 [&_.reptile-card]:ring-primary/30 [&_.reptile-card]:transition-[box-shadow,transform] [&_.reptile-card]:duration-200',
          isDragging && reducedMotion && '[&_.reptile-card]:ring-2 [&_.reptile-card]:ring-primary/45',
        )}
      >
        <ReptileCard reptile={reptile} nextFeedingDate={nextFeedingDate} disableNavigation />
      </div>
    </div>
  );
}

export default function ReptilesPage() {
  const reducedMotion = useReducedMotion();
  const [reptiles, setReptiles] = useState<ReptileWithFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>('all');
  const [loadingSample, setLoadingSample] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Long-press activates drag; quick tap passes through without starting a drag.
      activationConstraint: { delay: 300, tolerance: 8 },
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
      await mediumHaptic();
      toast.success('Starter setup ready', {
        description: 'Sample animals were added locally on this device.',
      });
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
            (reptile.commonName?.toLowerCase().includes(query) ?? false) ||
            (reptile.scientificName?.toLowerCase().includes(query) ?? false) ||
            (reptile.morph?.toLowerCase().includes(query) ?? false)
          );
        })
        .filter(({ reptile }) => {
          return matchesQuickAnimalFilter(reptile, animalFilter);
        }),
    [reptiles, searchQuery, animalFilter],
  );

  const canReorder = !searchQuery.trim() && animalFilter === 'all' && reptiles.length > 1;

  useEffect(() => {
    if (!canReorder) setReorderMode(false);
  }, [canReorder]);

  const handleDragStart = useCallback(() => {
    void lightHaptic();
  }, []);

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

  const exitReorderMode = useCallback(() => {
    setReorderMode(false);
    void lightHaptic();
  }, []);

  const enterReorderMode = useCallback(() => {
    setReorderMode(true);
    void lightHaptic();
  }, []);

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
            <Link
              to="/reptiles/new"
              onClick={() => {
                void lightHaptic();
              }}
            >
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
              <div className="flex items-center gap-2 shrink-0">
                {canReorder && (
                  <Button
                    type="button"
                    variant={reorderMode ? 'default' : 'outline'}
                    size="sm"
                    className="min-h-[36px] px-3 text-xs tap-feedback"
                    aria-pressed={reorderMode}
                    onClick={() => (reorderMode ? exitReorderMode() : enterReorderMode())}
                  >
                    {reorderMode ? 'Done' : 'Reorder'}
                  </Button>
                )}
                <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary/90 text-xs font-medium tabular-nums">
                  {reptiles.length}
                </div>
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
            <div className="flex flex-wrap gap-2">
              {ANIMAL_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={animalFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="min-h-[32px] px-3 text-xs whitespace-nowrap"
                  onClick={() => setAnimalFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {reorderMode && canReorder ? (
              <p id="reptiles-reorder-hint" className="text-[11px] text-muted-foreground leading-snug">
                Press and hold a card, then drag to move it. Order is saved on this device and syncs when you are signed in.
              </p>
            ) : !canReorder && reptiles.length > 1 ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Set filter to All and clear search to reorder your list.
              </p>
            ) : null}
          </div>
        )}

        {reptiles.length === 0 ? (
          <div className="animate-in-fade">
            <div className="premium-surface-elevated rounded-[var(--radius-xl)] p-6 sm:p-7 text-center">
              <EmptyState
                icon={<PawPrint className="w-16 h-16" />}
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
                description="Clear search or widen the animal group filter to see your list again."
                action={
                  <Button
                    type="button"
                    className="w-full max-w-[280px] mx-auto min-h-[48px] tap-feedback"
                    onClick={() => {
                      setSearchQuery('');
                      setAnimalFilter('all');
                    }}
                  >
                    Reset search & filters
                  </Button>
                }
              />
            </div>
          </div>
        ) : reorderMode && canReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={reptiles.map((r) => r.reptile.id)} strategy={verticalListSortingStrategy}>
              <div
                className="space-y-2.5 overflow-x-hidden"
                role="list"
                aria-label="Animals, reorder mode"
                aria-describedby="reptiles-reorder-hint"
              >
                {reptiles.map(({ reptile, nextFeedingDate }) => (
                  <SortableReptileRow
                    key={reptile.id}
                    reptile={reptile}
                    nextFeedingDate={nextFeedingDate}
                    reducedMotion={Boolean(reducedMotion)}
                  />
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
