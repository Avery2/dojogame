// Pixel-art stage: paper background, blocky mountains, solid sun, hard ground line.
// Cached to an offscreen canvas because the silhouette doesn't change frame to frame.

let bgCache = null;

export function drawStage(ctx, w, h) {
  if (!bgCache || bgCache.w !== w || bgCache.h !== h) {
    bgCache = buildBackground(w, h);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bgCache.canvas, 0, 0);
}

function buildBackground(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;

  // Paper / sky
  cx.fillStyle = '#efe7d6';
  cx.fillRect(0, 0, w, h);

  // Sun: chunky pixel disc
  const sunCx = Math.round(w * 0.74);
  const sunCy = Math.round(h * 0.26);
  const sunR  = Math.round(Math.min(w, h) * 0.085);
  pixelCircle(cx, sunCx, sunCy, sunR, '#b3231b', 4);

  // Far mountains: a few stepped triangles in dark ink
  const mtnBaseY = Math.round(h * 0.62);
  drawMountains(cx, w, mtnBaseY, [
    { peakY: mtnBaseY - Math.round(h * 0.18), color: '#1a1a1a', step: 6, count: 4 },
    { peakY: mtnBaseY - Math.round(h * 0.12), color: '#222', step: 4, count: 6 },
  ]);

  // Ground band
  const gy = Math.round(h * 0.82);
  cx.fillStyle = '#111';
  cx.fillRect(0, gy, w, 4);
  cx.fillStyle = 'rgba(17,17,17,0.08)';
  cx.fillRect(0, gy + 4, w, h - gy - 4);

  // Grass tufts every ~80px
  cx.fillStyle = '#111';
  for (let x = 0; x < w; x += 80) {
    cx.fillRect(x + 14, gy - 4, 4, 4);
    cx.fillRect(x + 18, gy - 8, 4, 4);
    cx.fillRect(x + 22, gy - 4, 4, 4);
  }

  // Stars / dots in upper sky
  cx.fillStyle = 'rgba(17,17,17,0.25)';
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * w / 4) * 4;
    const y = Math.floor(Math.random() * h * 0.4 / 4) * 4;
    cx.fillRect(x, y, 4, 4);
  }

  return { canvas: c, w, h };
}

function pixelCircle(cx, x0, y0, r, color, step) {
  cx.fillStyle = color;
  for (let dy = -r; dy <= r; dy += step) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy) / step) * step;
    cx.fillRect(x0 - dx, y0 + dy, dx * 2 + step, step);
  }
}

function drawMountains(cx, w, baseY, layers) {
  for (const layer of layers) {
    cx.fillStyle = layer.color;
    const peakSpacing = w / layer.count;
    for (let i = 0; i < layer.count; i++) {
      const cxPos = (i + 0.5) * peakSpacing;
      const peakHeight = baseY - layer.peakY;
      const halfBase = peakSpacing * 0.55;
      // Stepped triangle
      for (let row = 0; row < peakHeight; row += layer.step) {
        const widthAtRow = halfBase * (1 - row / peakHeight);
        cx.fillRect(
          Math.round(cxPos - widthAtRow),
          Math.round(baseY - row - layer.step),
          Math.round(widthAtRow * 2),
          layer.step,
        );
      }
    }
  }
}

export function invalidateStage() { bgCache = null; }
