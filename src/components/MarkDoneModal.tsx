import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TaskType } from '@/types';

const taskLabels: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

interface MarkDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details?: string) => void;
  reptileName: string;
  taskType: TaskType;
  isLoading?: boolean;
}

export function MarkDoneModal({
  isOpen,
  onClose,
  onConfirm,
  reptileName,
  taskType,
  isLoading = false,
}: MarkDoneModalProps) {
  const [details, setDetails] = useState('');

  const handleConfirm = () => {
    onConfirm(details.trim() || undefined);
    setDetails('');
  };

  const handleClose = () => {
    setDetails('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mark {taskLabels[taskType]} Done</DialogTitle>
          <DialogDescription>
            Completing {taskLabels[taskType].toLowerCase()} for {reptileName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="details">Notes (optional)</Label>
            <Textarea
              id="details"
              placeholder="Add any details about this task..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
