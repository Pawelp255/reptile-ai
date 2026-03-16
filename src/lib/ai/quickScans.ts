// Quick Scan templates for 1-tap AI queries

export interface QuickScan {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export const QUICK_SCANS: QuickScan[] = [
  {
    id: 'overdue-tasks',
    label: 'Overdue Tasks',
    emoji: '⚠️',
    prompt: 'What\'s overdue today? Review the upcoming tasks context and identify any that are past due or due today. If tasks are missing, propose creating schedule items for them using the action JSON format.',
  },
  {
    id: 'feeding-plan',
    label: 'Feeding Plan',
    emoji: '🍽️',
    prompt: 'Build a detailed feeding plan for the selected reptile. Based on species, age, and recent feeding history, recommend prey type, size, frequency, and a supplement schedule (calcium, D3, multivitamin). Propose creating schedule items if helpful.',
  },
  {
    id: 'supplement-schedule',
    label: 'Supplements',
    emoji: '💊',
    prompt: 'Suggest a safe, general supplement schedule for this reptile based on its species and diet type. Cover calcium, D3, and multivitamin timing. Note: this is general guidance only—always confirm with a vet for specific animals.',
  },
  {
    id: 'breeding-readiness',
    label: 'Breeding Ready',
    emoji: '🥚',
    prompt: 'Evaluate this reptile\'s breeding readiness based on species, age, weight, and breeding status. Provide a checklist covering minimum weight/age requirements, cycling conditions, and any concerns. If pairing data is available, analyze compatibility.',
  },
  {
    id: 'incubation-timeline',
    label: 'Incubation',
    emoji: '🔥',
    prompt: 'If a pairing is selected, create an incubation timeline with key milestones and suggested reminders (egg checks, temperature logs, expected hatch window). Propose schedule items for reminders using the action JSON format. If no pairing is selected, explain what data is needed.',
  },
  {
    id: 'journal-summary',
    label: 'Journal Summary',
    emoji: '📝',
    prompt: 'Summarize the last 30 days of journal entries into concise notes. Group by reptile if multiple are included. Highlight trends, concerns, and notable events. If appropriate, propose creating a "note" event with the summary using the action JSON format.',
  },
];
