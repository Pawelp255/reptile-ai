// Promo Card Generator for Expo Demo Mode
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export async function generatePromoCard(appUrl?: string): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: [100, 150], orientation: 'portrait' });
  const w = 100;
  const h = 150;

  // Background
  doc.setFillColor(42, 157, 143);
  doc.rect(0, 0, w, h, 'F');

  // White card area
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(8, 8, w - 16, h - 16, 4, 4, 'F');

  // App name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(42, 157, 143);
  doc.text('🦎 Reptilita', w / 2, 28, { align: 'center' });

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Your smart reptile care companion', w / 2, 36, { align: 'center' });

  // Divider
  doc.setDrawColor(42, 157, 143);
  doc.setLineWidth(0.3);
  doc.line(20, 42, w - 20, 42);

  // Value props
  const bullets = [
    '✅ Smart schedules & reminders',
    '✅ Breeding + genetics calculator',
    '✅ AI assistant with your data (BYOK)',
  ];

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  let by = 52;
  for (const bullet of bullets) {
    doc.text(bullet, 16, by);
    by += 8;
  }

  // QR Code
  const qrUrl = appUrl || window.location.origin;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#2a9d8f', light: '#ffffff' },
    });
    doc.addImage(qrDataUrl, 'PNG', w / 2 - 18, by + 4, 36, 36);
  } catch {
    // If QR generation fails, show URL text instead
    doc.setFontSize(8);
    doc.text(qrUrl, w / 2, by + 20, { align: 'center' });
  }

  // URL label
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('Scan to try the app', w / 2, h - 16, { align: 'center' });

  return doc.output('blob');
}

export async function downloadPromoCard(appUrl?: string): Promise<void> {
  const blob = await generatePromoCard(appUrl);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reptilita-promo.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
