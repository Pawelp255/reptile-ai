import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { ReptileCard } from '@/components/ReptileCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllReptiles, getNextFeedingDate } from '@/lib/storage';
import { ReptileListSkeleton } from '@/components/system/SkeletonLoaders';
import type { Reptile } from '@/types';

interface ReptileWithFeeding {
  reptile: Reptile;
  nextFeedingDate?: string;
}

export default function ReptilesPage() {
  const [reptiles, setReptiles] = useState<ReptileWithFeeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reptile' | 'amphibian'>('all');

  const loadReptiles = async () => {
    try {
      const allReptiles = await getAllReptiles();
      
      // Get next feeding dates for each reptile
      const reptilesWithFeeding = await Promise.all(
        allReptiles.map(async (reptile) => ({
          reptile,
          nextFeedingDate: await getNextFeedingDate(reptile.id),
        }))
      );

      setReptiles(reptilesWithFeeding);
    } catch (error) {
      console.error('Failed to load reptiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReptiles();
  }, []);

  const filteredReptiles = reptiles.filter(({ reptile }) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      reptile.name.toLowerCase().includes(query) ||
      reptile.species.toLowerCase().includes(query) ||
      (reptile.morph?.toLowerCase().includes(query) ?? false)
    );
  }).filter(({ reptile }) => {
    if (typeFilter === 'all') return true;
    const cls = reptile.animalClass ?? (reptile.isAmphibian ? 'amphibian' : 'reptile');
    return typeFilter === 'amphibian' ? cls === 'amphibian' : cls === 'reptile';
  });

  if (loading) {
    return (
      <PageMotion className="page-container">
        <PageHeader title="My Reptiles" />
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
          <Link to="/reptiles/new">
            <Button
              size="sm"
              className="min-h-[40px] px-3.5 rounded-full glass-shell text-sm font-medium shadow-[var(--surface-shadow)] transition-transform duration-200 ease-premium active:scale-[0.97]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add
            </Button>
          </Link>
        }
      />

      <div className="page-content page-content-top">
        {reptiles.length > 0 && (
          <div className="glass-panel rounded-[var(--radius-xl)] p-3.5 sm:p-4 mb-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground/80">
                  Animals
                </p>
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
                  <Link to="/reptiles/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Animal
                    </Button>
                  </Link>
                }
              />
            </div>
          </div>
        ) : filteredReptiles.length === 0 ? (
          <div className="animate-in-fade">
            <EmptyState
              icon={<Search className="w-12 h-12" />}
              title="No matches"
              description="Try a different name or species."
            />
          </div>
        ) : (
          <StaggerList className="space-y-2.5 overflow-x-hidden">
            {filteredReptiles.map(({ reptile, nextFeedingDate }) => (
              <StaggerItem key={reptile.id}>
                <ReptileCard
                  reptile={reptile}
                  nextFeedingDate={nextFeedingDate}
                />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </PageMotion>
  );
}
