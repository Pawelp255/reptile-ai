// Vet PDF Export using jsPDF
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import {
  getReptileById,
  getCareEventsByReptile,
  getScheduleByReptile,
} from '@/lib/storage';
import type { Reptile, CareEvent, ScheduleItem, EventType, TaskType } from '@/types';

const EVENT_LABELS: Record<EventType, string> = {
  feeding: 'Feeding',
  cleaning: 'Cleaning',
  shedding: 'Shedding',
  health: 'Health Check',
  handling: 'Handling',
  note: 'Note',
};

const TASK_LABELS: Record<TaskType, string> = {
  feed: 'Feeding',
  clean: 'Cleaning',
  check: 'Health Check',
};

const SEX_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
};

export interface VetPdfOptions {
  rangeDays?: number;
  includeGenetics?: boolean;
  includeSchedule?: boolean;
}

export async function exportVetPdf(
  reptileId: string,
  options: VetPdfOptions = {},
): Promise<Blob> {
  const rangeDays = options.rangeDays ?? 30;
  const includeGenetics = options.includeGenetics ?? true;
  const includeSchedule = options.includeSchedule ?? true;

  const reptile = await getReptileById(reptileId);
  if (!reptile) throw new Error('Reptile not found');

  const [events, schedule] = await Promise.all([
    getCareEventsByReptile(reptileId),
    getScheduleByReptile(reptileId),
  ]);

  // Filter events to range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const recentEvents = events.filter(e => e.eventDate >= cutoffStr);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add page break if needed
  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Veterinary Care Report', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, margin, y);
  y += 4;
  doc.text(`Report covers last ${rangeDays} days`, margin, y);
  y += 8;

  // Divider
  doc.setDrawColor(42, 157, 143);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Reptile Profile
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(reptile.name, margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${reptile.species}${reptile.morph ? ` • ${reptile.morph}` : ''}`, margin, y);
  y += 7;

  // Profile details
  const profileRows: [string, string][] = [
    ['Sex', SEX_LABELS[reptile.sex] || 'Unknown'],
    ['Diet', reptile.dietType.charAt(0).toUpperCase() + reptile.dietType.slice(1)],
    ['Breeding Status', reptile.breedingStatus.charAt(0).toUpperCase() + reptile.breedingStatus.slice(1)],
  ];

  if (reptile.birthDate) {
    profileRows.push(['Birth Date', format(new Date(reptile.birthDate), 'MMMM d, yyyy')]);
  }
  if (reptile.estimatedAgeMonths) {
    profileRows.push(['Est. Age', `${reptile.estimatedAgeMonths} months`]);
  }
  if (reptile.acquisitionDate) {
    profileRows.push(['Acquired', format(new Date(reptile.acquisitionDate), 'MMMM d, yyyy')]);
  }

  doc.setFontSize(10);
  for (const [label, value] of profileRows) {
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 35, y);
    y += 5;
  }

  if (reptile.notes) {
    y += 3;
    checkPageBreak(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(reptile.notes, contentWidth);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4.5;
  }

  // Genetics section
  if (includeGenetics && (reptile.hets?.length || reptile.geneticsNotes || reptile.genes?.length)) {
    y += 5;
    checkPageBreak(15);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Genetics', margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (reptile.hets?.length) {
      doc.text(`Het: ${reptile.hets.join(', ')}`, margin, y);
      y += 5;
    }
    if (reptile.genes?.length) {
      const geneStr = reptile.genes.map(g => `${g.name} (${g.mode}: ${g.state})`).join(', ');
      const geneLines = doc.splitTextToSize(`Genes: ${geneStr}`, contentWidth);
      doc.text(geneLines, margin, y);
      y += geneLines.length * 4.5;
    }
    if (reptile.geneticsNotes) {
      const genLines = doc.splitTextToSize(reptile.geneticsNotes, contentWidth);
      doc.text(genLines, margin, y);
      y += genLines.length * 4.5;
    }
  }

  // Recent Events
  y += 5;
  checkPageBreak(15);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Care Events (last ${rangeDays} days)`, margin, y);
  y += 6;

  if (recentEvents.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No events recorded in this period.', margin, y);
    y += 5;
  } else {
    // Table header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', margin, y);
    doc.text('Type', margin + 30, y);
    doc.text('Details', margin + 55, y);
    y += 1;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    for (const event of recentEvents.slice(0, 30)) {
      checkPageBreak(8);
      doc.text(format(new Date(event.eventDate), 'MMM d'), margin, y);
      doc.text(EVENT_LABELS[event.eventType], margin + 30, y);
      
      let detail = event.details || '-';
      if (event.weightGrams) detail += ` (${event.weightGrams}g)`;
      const detailLines = doc.splitTextToSize(detail, contentWidth - 55);
      doc.text(detailLines, margin + 55, y);
      y += Math.max(detailLines.length * 4, 5);
    }
  }

  // Schedule
  if (includeSchedule && schedule.length > 0) {
    y += 5;
    checkPageBreak(15);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Upcoming Schedule', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const item of schedule) {
      checkPageBreak(6);
      doc.text(
        `${TASK_LABELS[item.taskType]} — every ${item.frequencyDays} days — next: ${format(new Date(item.nextDueDate), 'MMM d, yyyy')}`,
        margin, y
      );
      y += 5;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Generated by Reptilita — for informational purposes only',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}

export async function downloadVetPdf(reptileId: string, reptileName: string, options?: VetPdfOptions): Promise<void> {
  const blob = await exportVetPdf(reptileId, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${reptileName.replace(/\s+/g, '-').toLowerCase()}-vet-report.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
