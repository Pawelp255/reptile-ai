// PDF Report Generator (generates printable HTML)
import { format } from 'date-fns';
import type { Reptile, CareEvent, EventType } from '@/types';

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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

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
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${format(new Date(event.eventDate), 'MMM d, yyyy')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${eventLabels[event.eventType]}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${event.details || '-'}</td>
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

        ${reptile.notes ? `
        <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 14px; color: #333;"><strong>Notes:</strong> ${reptile.notes}</p>
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
  <title>Reptile Care Report - ${format(today, 'MMMM d, yyyy')}</title>
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
    <h1 style="margin: 0 0 8px 0; color: #2e7d32; font-size: 28px;">🦎 Reptile Care Report</h1>
    <p style="margin: 0; color: #666; font-size: 14px;">Generated: ${format(today, 'MMMM d, yyyy')}</p>
    <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">Report covers last 30 days of care events</p>
  </header>

  ${reptileCards}

  <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #999;">Generated by Reptile AI</p>
  </footer>
</body>
</html>
  `;
}
