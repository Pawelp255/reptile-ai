import { useState } from 'react';
import { Thermometer, Droplets, Sun, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export interface EnclosureReading {
  id: string;
  timestamp: string;
  tempHot?: number;
  tempCool?: number;
  humidity?: number;
  uvbIndex?: number;
  lightHours?: number;
  notes?: string;
}

interface Props {
  readings: EnclosureReading[];
  onAddReading: (reading: Omit<EnclosureReading, 'id' | 'timestamp'>) => void;
}

export function EnclosurePanel({ readings, onAddReading }: Props) {
  const [adding, setAdding] = useState(false);
  const [tempHot, setTempHot] = useState('');
  const [tempCool, setTempCool] = useState('');
  const [humidity, setHumidity] = useState('');
  const [uvbIndex, setUvbIndex] = useState('');
  const [lightHours, setLightHours] = useState('');

  const latest = readings[0];

  const handleSubmit = () => {
    onAddReading({
      tempHot: tempHot ? parseFloat(tempHot) : undefined,
      tempCool: tempCool ? parseFloat(tempCool) : undefined,
      humidity: humidity ? parseFloat(humidity) : undefined,
      uvbIndex: uvbIndex ? parseFloat(uvbIndex) : undefined,
      lightHours: lightHours ? parseFloat(lightHours) : undefined,
    });
    setTempHot(''); setTempCool(''); setHumidity(''); setUvbIndex(''); setLightHours('');
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Current readings */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Thermometer className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hot Side</p>
            <p className="font-semibold text-sm">{latest?.tempHot ? `${latest.tempHot}°F` : '—'}</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Thermometer className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cool Side</p>
            <p className="font-semibold text-sm">{latest?.tempCool ? `${latest.tempCool}°F` : '—'}</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Humidity</p>
            <p className="font-semibold text-sm">{latest?.humidity ? `${latest.humidity}%` : '—'}</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">UVB Index</p>
            <p className="font-semibold text-sm">{latest?.uvbIndex ?? '—'}</p>
          </div>
        </Card>
      </div>

      {latest && (
        <p className="text-xs text-muted-foreground text-center">
          Last reading: {format(new Date(latest.timestamp), 'MMM d, h:mm a')}
          {latest.lightHours ? ` • ${latest.lightHours}h light` : ''}
        </p>
      )}

      {/* Add reading form */}
      {adding ? (
        <Card className="p-4 space-y-3">
          <h4 className="font-medium text-sm">Log Reading</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Hot Side (°F)</Label>
              <Input type="number" value={tempHot} onChange={e => setTempHot(e.target.value)} placeholder="95" />
            </div>
            <div>
              <Label className="text-xs">Cool Side (°F)</Label>
              <Input type="number" value={tempCool} onChange={e => setTempCool(e.target.value)} placeholder="78" />
            </div>
            <div>
              <Label className="text-xs">Humidity (%)</Label>
              <Input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="60" />
            </div>
            <div>
              <Label className="text-xs">UVB Index</Label>
              <Input type="number" value={uvbIndex} onChange={e => setUvbIndex(e.target.value)} placeholder="3" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Light Hours</Label>
              <Input type="number" value={lightHours} onChange={e => setLightHours(e.target.value)} placeholder="12" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} className="flex-1">Save</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="flex-1">Cancel</Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Log Reading
        </Button>
      )}

      {/* History */}
      {readings.length > 1 && (
        <div className="space-y-1">
          <h4 className="section-header">History</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {readings.slice(1, 10).map(r => (
              <div key={r.id} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                <span className="text-muted-foreground">{format(new Date(r.timestamp), 'MMM d, h:mm a')}</span>
                <div className="flex gap-3">
                  {r.tempHot && <span>{r.tempHot}°F</span>}
                  {r.humidity && <span>{r.humidity}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
