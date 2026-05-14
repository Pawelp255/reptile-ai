// PDF Report Generator (generates printable HTML)
import { format } from 'date-fns';
import type { jsPDF as JsPDF } from 'jspdf';
import { stripDemoMarkerForDisplay } from '@/lib/display/stripDemoMarker';
import type { Reptile, CareEvent, EventType } from '@/types';
import { formatLocalDateKey, subtractDaysLocal } from '@/lib/date/localDateKey';
import { getToday } from '@/lib/storage/db';

const eventLabels: Record<EventType, string> = {
  feeding: 'Feeding',
  cleaning: 'Cleaning',
  shedding: 'Shedding',
  health: 'Health Check',
  handling: 'Handling',
  note: 'Note',
};

const sexLabels = {
  unknown: 'Unknown',
  male: 'Male',
  female: 'Female',
};

const dietLabels: Record<string, string> = {
  insects: 'Insects',
  rodents: 'Rodents',
  fish: 'Fish',
  herbivore: 'Herbivore',
  omnivore: 'Omnivore',
  pellets: 'Pellets / Prepared',
  mixed: 'Mixed',
};

export function generatePDFReport(reptiles: Reptile[], events: CareEvent[]): string {
  const today = new Date();
  const cutoffDate = subtractDaysLocal(getToday(), 30);

  // Filter recent events
  const recentEvents = events.filter(e => e.eventDate >= cutoffDate);

  // Group events by reptile
  const eventsByReptile = new Map<string, CareEvent[]>();
  for (const event of recentEvents) {
    const existing = eventsByReptile.get(event.reptileId) || [];
    existing.push(event);
    eventsByReptile.set(event.reptileId, existing);
  }

  const reptileCards = reptiles.map(reptile => {
    const reptileEvents = eventsByReptile.get(reptile.id) || [];
    
    // Group events by type for summary
    const eventCounts: Record<EventType, number> = {
      feeding: 0,
      cleaning: 0,
      shedding: 0,
      health: 0,
      handling: 0,
      note: 0,
    };
    
    for (const event of reptileEvents) {
      eventCounts[event.eventType]++;
    }

    const eventSummary = Object.entries(eventCounts)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${eventLabels[type as EventType]}: ${count}`)
      .join(', ');

    const recentEventsList = reptileEvents
      .slice(0, 10) // Last 10 events
      .map(event => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatLocalDateKey(event.eventDate, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${eventLabels[event.eventType]}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${stripDemoMarkerForDisplay(event.details) || '-'}</td>
        </tr>
      `)
      .join('');

    return `
      <div style="page-break-inside: avoid; margin-bottom: 32px; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
        <h2 style="margin: 0 0 4px 0; color: #1a1a1a; font-size: 24px;">${reptile.name}</h2>
        <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">${reptile.species}${reptile.morph ? ` • ${reptile.morph}` : ''}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #666; font-size: 14px;">Sex</td>
            <td style="padding: 8px 0; font-weight: 500;">${sexLabels[reptile.sex]}</td>
            <td style="padding: 8px 16px 8px 0; color: #666; font-size: 14px;">Diet</td>
            <td style="padding: 8px 0; font-weight: 500;">${dietLabels[reptile.dietType] ?? reptile.dietType}</td>
          </tr>
          ${reptile.birthDate ? `
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #666; font-size: 14px;">Birth Date</td>
            <td style="padding: 8px 0; font-weight: 500;" colspan="3">${format(new Date(reptile.birthDate), 'MMMM d, yyyy')}</td>
          </tr>
          ` : ''}
          ${reptile.acquisitionDate ? `
          <tr>
            <td style="padding: 8px 16px 8px 0; color: #666; font-size: 14px;">Acquired</td>
            <td style="padding: 8px 0; font-weight: 500;" colspan="3">${format(new Date(reptile.acquisitionDate), 'MMMM d, yyyy')}</td>
          </tr>
          ` : ''}
        </table>

        ${stripDemoMarkerForDisplay(reptile.notes) ? `
        <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #333;"><strong>Notes:</strong> ${stripDemoMarkerForDisplay(reptile.notes)}</p>
        </div>
        ` : ''}

        <h3 style="margin: 24px 0 12px 0; font-size: 16px; color: #333;">Last 30 Days Summary</h3>
        ${eventSummary ? `
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">${eventSummary}</p>
        ` : '<p style="margin: 0 0 16px 0; font-size: 14px; color: #999;">No events recorded in the last 30 days.</p>'}

        ${reptileEvents.length > 0 ? `
        <h4 style="margin: 16px 0 8px 0; font-size: 14px; color: #333;">Recent Events</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Date</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Type</th>
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${recentEventsList}
          </tbody>
        </table>
        ` : ''}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reptilita Care Report - ${format(today, 'MMMM d, yyyy')}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #1a1a1a;
      line-height: 1.5;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; padding: 16px; background: #e8f5e9; border-radius: 8px;">
    <p style="margin: 0; font-size: 14px;">
      <strong>Tip:</strong> Use your browser's Print function (Ctrl/Cmd + P) and select "Save as PDF" to save this report.
    </p>
  </div>

  <header style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #2e7d32; padding-bottom: 16px;">
    <h1 style="margin: 0 0 8px 0; color: #2e7d32; font-size: 28px;">🦎 Reptilita Care Report</h1>
    <p style="margin: 0; color: #666; font-size: 14px;">Generated: ${format(today, 'MMMM d, yyyy')}</p>
    <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Report covers last 30 days of care events</p>
  </header>

  ${reptileCards}

  <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #999;">Generated by Reptilita</p>
  </footer>
</body>
</html>
  `;
}

function safeDateLabel(dateKey: string): string {
  try {
    return formatLocalDateKey(dateKey, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateKey;
  }
}

function addWrappedText(doc: JsPDF, text: string, x: number, y: number, width: number): number {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + Math.max(lines.length, 1) * 4.5;
}

export async function generatePDFReportBlob(reptiles: Reptile[], events: CareEvent[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const today = new Date();
  const cutoffDate = subtractDaysLocal(getToday(), 30);
  const recentEvents = events
    .filter((event) => event.eventDate >= cutoffDate)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.createdAt.localeCompare(a.createdAt));

  const eventsByReptile = new Map<string, CareEvent[]>();
  for (const event of recentEvents) {
    const list = eventsByReptile.get(event.reptileId) || [];
    list.push(event);
    eventsByReptile.set(event.reptileId, list);
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Reptilita Care Report', margin, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${format(today, 'MMMM d, yyyy')}`, margin, y);
  y += 5;
  doc.text('Report covers last 30 days of care events', margin, y);
  y += 8;
  doc.setDrawColor(42, 157, 143);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  for (const reptile of reptiles) {
    const reptileEvents = eventsByReptile.get(reptile.id) || [];
    checkPageBreak(34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(reptile.name, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = addWrappedText(
      doc,
      `${reptile.species}${reptile.morph ? ` | ${reptile.morph}` : ''}`,
      margin,
      y,
      contentWidth,
    );
    y += 2;

    const profileLine = [
      `Sex: ${sexLabels[reptile.sex]}`,
      `Diet: ${dietLabels[reptile.dietType] ?? reptile.dietType}`,
      reptile.birthDate ? `Birth: ${safeDateLabel(reptile.birthDate)}` : undefined,
      reptile.acquisitionDate ? `Acquired: ${safeDateLabel(reptile.acquisitionDate)}` : undefined,
    ].filter(Boolean).join(' | ');
    y = addWrappedText(doc, profileLine, margin, y, contentWidth);

    const notes = stripDemoMarkerForDisplay(reptile.notes);
    if (notes) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      y = addWrappedText(doc, notes, margin, y, contentWidth);
    }

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Last 30 Days', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');

    if (reptileEvents.length === 0) {
      doc.text('No events recorded in this period.', margin, y);
      y += 7;
    } else {
      for (const event of reptileEvents.slice(0, 10)) {
        checkPageBreak(10);
        const details = stripDemoMarkerForDisplay(event.details) || '-';
        const metrics = [
          event.weightGrams ? `${event.weightGrams}g` : undefined,
          event.lengthCm ? `${event.lengthCm}cm` : undefined,
        ].filter(Boolean).join(', ');
        const line = `${safeDateLabel(event.eventDate)} - ${eventLabels[event.eventType]}: ${details}${metrics ? ` (${metrics})` : ''}`;
        y = addWrappedText(doc, line, margin, y, contentWidth);
        y += 1.5;
      }
    }

    y += 6;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by Reptilita - for informational purposes only', pageWidth / 2, pageHeight - 8, {
      align: 'center',
    });
    doc.setTextColor(0, 0, 0);
  }

  return doc.output('blob');
}
