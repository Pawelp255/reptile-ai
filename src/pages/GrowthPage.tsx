import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Scale, Ruler } from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { StaggerList, StaggerItem } from '@/components/motion/StaggerList';
import { EmptyState } from '@/components/EmptyState';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ChartSkeleton } from '@/components/system/SkeletonLoaders';
import { getAllReptiles, getCareEventsByReptile } from '@/lib/storage';
import type { Reptile, CareEvent } from '@/types';

interface GrowthPoint {
  date: string;
  label: string;
  weight?: number;
  length?: number;
}

export default function GrowthPage() {
  const [searchParams] = useSearchParams();
  const preselect = searchParams.get('reptileId') || '';

  const [reptiles, setReptiles] = useState<Reptile[]>([]);
  const [selectedId, setSelectedId] = useState(preselect);
  const [data, setData] = useState<GrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllReptiles().then(r => {
      setReptiles(r);
      setSelectedId(current => current || r[0]?.id || '');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    getCareEventsByReptile(selectedId).then(events => {
      const points: GrowthPoint[] = events
        .filter(e => e.weightGrams !== undefined || e.lengthCm !== undefined)
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .map(e => ({
          date: e.eventDate,
          label: format(new Date(e.eventDate), 'MMM d'),
          weight: e.weightGrams,
          length: e.lengthCm,
        }));
      setData(points);
      setLoading(false);
    });
  }, [selectedId]);

  const latestWeight = data.filter(d => d.weight).at(-1)?.weight;
  const latestLength = data.filter(d => d.length).at(-1)?.length;
  const firstWeight = data.filter(d => d.weight).at(0)?.weight;
  const weightGain = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <PageMotion className="page-container">
      <PageHeader title="Growth Tracking" subtitle="Weight & length over time" />

      <div className="page-content page-content-top space-y-6">
        {/* Reptile selector */}
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="bg-muted/30 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Select an animal" />
          </SelectTrigger>
          <SelectContent>
            {reptiles.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <div className="animate-in-fade">
            <EmptyState
              icon={<TrendingUp className="w-12 h-12" />}
              title="No growth data yet"
              description="Log weight or length in Health Check events to see trends here."
            />
          </div>
        ) : (
          <>
            {/* Metric cards — premium hierarchy */}
            <StaggerList className="grid grid-cols-3 gap-2.5">
              <StaggerItem className="min-w-0">
              <div className="premium-surface rounded-[var(--radius-xl)] p-3.5 text-center min-w-0">
                <Scale className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Current</p>
                <p className="font-semibold text-sm mt-0.5 truncate">{latestWeight ? `${latestWeight}g` : '—'}</p>
              </div>
              </StaggerItem>
              <StaggerItem className="min-w-0">
              <div className="premium-surface rounded-[var(--radius-xl)] p-3.5 text-center min-w-0">
                <Ruler className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Length</p>
                <p className="font-semibold text-sm mt-0.5 truncate">{latestLength ? `${latestLength}cm` : '—'}</p>
              </div>
              </StaggerItem>
              <StaggerItem className="min-w-0">
              <div className="premium-surface rounded-[var(--radius-xl)] p-3.5 text-center min-w-0">
                <TrendingUp className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Gained</p>
                <p className="font-semibold text-sm mt-0.5 truncate">
                  {weightGain !== null ? `${weightGain > 0 ? '+' : ''}${weightGain}g` : '—'}
                </p>
              </div>
              </StaggerItem>
            </StaggerList>

            {/* Weight chart — premium container */}
            {data.some(d => d.weight) && (
              <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 overflow-hidden">
                <h3 className="section-header mb-2">Weight (g)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.filter(d => d.weight)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Length chart — premium container */}
            {data.some(d => d.length) && (
              <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 overflow-hidden">
                <h3 className="section-header mb-2">Length (cm)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.filter(d => d.length)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="length"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Records */}
            <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5 animate-in-fade">
              <h3 className="section-header mb-2">Records</h3>
              <div className="space-y-0 max-h-60 overflow-y-auto ios-scroll-fix divide-y divide-border/70">
                {[...data].reverse().map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-3 first:pt-0">
                    <span className="text-muted-foreground">{format(new Date(p.date), 'MMM d, yyyy')}</span>
                    <div className="flex gap-4">
                      {p.weight && <span>{p.weight}g</span>}
                      {p.length && <span>{p.length}cm</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageMotion>
  );
}
