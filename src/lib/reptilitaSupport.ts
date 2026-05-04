/** App Store / in-app support and account requests (update if your ops email changes). */
export const REPTILITA_SUPPORT_EMAIL = 'support@reptilita.com';

export function reptilitaMailto(subject: string, body?: string): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  if (body?.trim()) params.set('body', body.trim());
  return `mailto:${REPTILITA_SUPPORT_EMAIL}?${params.toString()}`;
}
