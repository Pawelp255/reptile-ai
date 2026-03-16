import { ChevronRight, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Reptile } from '@/types';
import { getDisplayEmoji, getCategoryLabel } from '@/lib/animals/taxonomy';

interface ReptileCardProps {
  reptile: Reptile;
  nextFeedingDate?: string;
}

export function ReptileCard({ reptile, nextFeedingDate }: ReptileCardProps) {
  const emoji = getDisplayEmoji(reptile.animalCategory, reptile.species);
  const categoryLabel = reptile.animalCategory ? getCategoryLabel(reptile.animalCategory) : null;

  return (
    <Link to={`/reptiles/${reptile.id}`} className="block min-h-[44px]">
      <div className="reptile-card premium-surface">
        <div className="flex items-center justify-center w-12 h-12 rounded-[var(--radius-xl)] bg-secondary/80 text-2xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">{reptile.name}</h3>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {reptile.commonName || reptile.species}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {categoryLabel && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                {categoryLabel}
              </span>
            )}
            {reptile.sex && (
              <span className="px-2 py-0.5 rounded-full bg-secondary/80 text-[11px] font-medium text-foreground/90">
                {reptile.sex === 'male' ? 'Male' : reptile.sex === 'female' ? 'Female' : 'Sex Unknown'}
              </span>
            )}
            {reptile.morph && (
              <span className="px-2 py-0.5 rounded-full bg-muted/70 text-[11px] text-muted-foreground">
                {reptile.morph}
              </span>
            )}
          </div>
          {nextFeedingDate && (
            <div className="flex items-center gap-2 mt-2 min-w-0">
              <Utensils className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground/80">Next feed</span>{' '}
                {format(new Date(nextFeedingDate), 'MMM d')}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground/80 shrink-0" aria-hidden />
      </div>
    </Link>
  );
}
