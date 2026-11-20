/**
 * Pure HTML5 Canvas Pass Image Exporter
 * 
 * Generates an ultra-crisp, high-resolution PNG pass that downloads directly
 * to the tourist's phone photo gallery or downloads folder.
 * Works 100% offline with zero external canvas dependencies.
 */

import QRCode from 'qrcode';

export async function downloadPassImage(pass, qrDataUrl) {
  if (!pass) return;

  let activeQrUrl = qrDataUrl;
  if (!activeQrUrl && (pass.token || pass.qrPayload || pass.reference)) {
    try {
      const raw = pass.qrPayload || pass.token || pass.reference;
      activeQrUrl = await QRCode.toDataURL(raw, { width: 480, margin: 2 });
    } catch {
      // fallback
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#090D15';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Decorative Border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Inner Subtle Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  // Top Header Banner
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.fillRect(50, 50, canvas.width - 100, 160);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GLOBETROTTER GATEWAY', canvas.width / 2, 110);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '22px monospace';
  ctx.fillText('OFFLINE ITINERARY & GATE COMPANION PASS', canvas.width / 2, 150);

  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('ANDHRA PRADESH & TELANGANA HERITAGE CORRIDORS', canvas.width / 2, 185);

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 230);
  ctx.lineTo(canvas.width - 70, 230);
  ctx.stroke();

  // Pass Reference Box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fillRect(70, 250, canvas.width - 140, 90);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeRect(70, 250, canvas.width - 140, 90);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px monospace';
  ctx.fillText('PASS ORDER REF:', 100, 290);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(pass.reference || 'GT-2026-PASS', 100, 325);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('OFFLINE VERIFIED', canvas.width - 100, 310);

  // Circuit / Route Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px sans-serif';
  ctx.fillText('ROUTE / TOUR TITLE:', 100, 390);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px sans-serif';
  const circuitTitle = pass.circuitName || 'Cultural Corridor Tour Pass';
  ctx.fillText(circuitTitle.length > 36 ? circuitTitle.substring(0, 34) + '...' : circuitTitle, 100, 435);

  // 2-Column Metadata Grid
  // Left: Visitor Name & Date
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px sans-serif';
  ctx.fillText('VISITOR:', 100, 500);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(pass.touristName || 'Registered Visitor', 100, 535);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px sans-serif';
  ctx.fillText('SCHEDULED VISIT DATE:', 100, 595);
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(pass.validFrom || 'Scheduled Visit', 100, 630);

  // Right: Total Fee & Validity
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px sans-serif';
  ctx.fillText('ENTRY FEE:', canvas.width - 100, 500);
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(pass.gateFeeTotal || 'Free Public Entry', canvas.width - 100, 535);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '20px sans-serif';
  ctx.fillText('ACCESS VALIDITY:', canvas.width - 100, 595);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(pass.validityLabel || 'Single Day Gate Access', canvas.width - 100, 630);

  // Included Attractions Section
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('COVERED ATTRACTIONS & STOPS:', 100, 695);

  const places = Array.isArray(pass.placesAllowed) && pass.placesAllowed.length > 0
    ? pass.placesAllowed
    : ['Cultural Heritage Checkpoint'];

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '22px sans-serif';
  places.slice(0, 5).forEach((p, idx) => {
    ctx.fillText(`• ${p}`, 120, 735 + (idx * 34));
  });

  // Perforated Tear Line
  const tearY = 930;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(60, tearY);
  ctx.lineTo(canvas.width - 60, tearY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // QR Code Box
  const qrBoxSize = 340;
  const qrX = (canvas.width - qrBoxSize) / 2;
  const qrY = 960;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 12, qrY - 12, qrBoxSize + 24, qrBoxSize + 24);

  if (activeQrUrl) {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, qrX, qrY, qrBoxSize, qrBoxSize);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = activeQrUrl;
    });
  }

  // Gate Advice & Zero-Internet Guidance
  ctx.textAlign = 'center';
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('OFFLINE GHAT ENTRY COMPANION', canvas.width / 2, 1375);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '17px sans-serif';
  ctx.fillText('Saved to phone gallery for Eastern Ghats & forest dead zones without cellular coverage.', canvas.width / 2, 1405);
  ctx.fillText('ASI Heritage sites require official ASI barcode tickets. Canyons & temples are free entry.', canvas.width / 2, 1430);

  // Footer Helplines
  ctx.fillStyle = '#64748B';
  ctx.font = '16px monospace';
  ctx.fillText('EMERGENCY: 112 (Police) • 108 (Ambulance) • 1363 (Tourism Helpline)', canvas.width / 2, 1475);

  // Trigger Download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Globetrotter-Pass-${pass.reference || 'Offline'}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
