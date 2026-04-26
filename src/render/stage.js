// Sumi-e stage: paper background with grain, distant brushed mountains, red sun disc.
// Rendered once to an offscreen canvas and re-blit each frame for cheap grain noise.

let bgCache = null;

export function drawStage(ctx, w, h) {
  if (!bgCache || bgCache.w !== w || bgCache.h !== h) {
    bgCache = buildBackground(w, h);
  }
  ctx.drawImage(bgCache.canvas, 0, 0);
}

function buildBackground(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d');
  // Paper
  cx.fillStyle = '#efe7d6';
  cx.fillRect(0, 0, w, h);

  // Sun disc
  cx.save();
  cx.fillStyle = 'rgba(179, 35, 27, 0.92)';
  cx.beginPath();
  cx.arc(w * 0.72, h * 0.28, Math.min(w, h) * 0.09, 0, Math.PI * 2);
  cx.fill();
  cx.restore();

  // Distant brushed mountains
  cx.save();
  cx.strokeStyle = 'rgba(17,17,17,0.55)';
  cx.lineCap = 'round';
  cx.lineJoin = 'round';
  for (let pass = 0; pass < 3; pass++) {
    cx.lineWidth = [3, 6, 12][pass];
    cx.globalAlpha = [0.35, 0.5, 0.7][pass];
    cx.beginPath();
    const baseY = h * (0.55 + pass * 0.04);
    cx.moveTo(-20, baseY);
    let x = -20;
    while (x < w + 20) {
      const peak = baseY - 60 - Math.random() * (110 - pass * 20);
      const dx = 80 + Math.random() * 140;
      cx.lineTo(x + dx * 0.4, peak);
      cx.lineTo(x + dx, baseY - 10 + Math.random() * 20);
      x += dx;
    }
    cx.stroke();
  }
  cx.restore();

  // Ground line
  cx.save();
  cx.strokeStyle = 'rgba(17,17,17,0.7)';
  cx.lineWidth = 4;
  cx.beginPath();
  const gy = h * 0.82;
  cx.moveTo(0, gy);
  cx.lineTo(w, gy);
  cx.stroke();
  // wash under ground
  cx.fillStyle = 'rgba(17,17,17,0.05)';
  cx.fillRect(0, gy, w, h - gy);
  cx.restore();

  // Grain noise
  const img = cx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[i] = clamp(d[i] + n);
    d[i+1] = clamp(d[i+1] + n);
    d[i+2] = clamp(d[i+2] + n);
  }
  cx.putImageData(img, 0, 0);

  return { canvas: c, w, h };
}

function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

export function invalidateStage() { bgCache = null; }
