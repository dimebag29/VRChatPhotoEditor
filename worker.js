self.onmessage = function(e) {
  const { imageData, settings, originalWidth, originalHeight } = e.data;
  const w = originalWidth;
  const h = originalHeight;
  const d = imageData.data;
  const s = settings;

  const bright = s.brightness / 100,
        den = bright >= 0 ? 1 - bright * .92 : 1 + (-bright) * 3,
        brightMul = 1 / den;
  const rg = 1 + s.red / 100,
        gg = 1 + s.green / 100,
        bg = 1 + s.blue / 100,
        t = s.temperature / 100,
        tr = 1 + .22 * t,
        tg = 1 + .02 * t,
        tb = 1 - .22 * t;
  const cf = s.contrast / 100,
        contrast = cf >= 0 ? 1 + cf * 2.2 : 1 + cf * .85,
        sat = 1 + s.saturation / 100,
        sh = s.shadows / 100,
        hi = s.highlights / 100,
        sharp = s.sharpness / 100,
        clar = s.clarity / 100;

  // 1パス目：基本補正（フル解像度）
  for (let i = 0; i < d.length; i += 4) {
    let r = Math.min(255, Math.max(0, d[i] * brightMul * rg * tr)),
        g = Math.min(255, Math.max(0, d[i + 1] * brightMul * gg * tg)),
        b = Math.min(255, Math.max(0, d[i + 2] * brightMul * bg * tb));
    const lum = (.2126 * r + .7152 * g + .0722 * b) / 255,
          tonal = 1 + sh * .9 * Math.pow(1 - lum, 1.7) + hi * .75 * Math.pow(lum, 1.7);
    r = Math.min(255, Math.max(0, r * tonal));
    g = Math.min(255, Math.max(0, g * tonal));
    b = Math.min(255, Math.max(0, b * tonal));
    r = Math.min(255, Math.max(0, (r - 127.5) * contrast + 127.5));
    g = Math.min(255, Math.max(0, (g - 127.5) * contrast + 127.5));
    b = Math.min(255, Math.max(0, (b - 127.5) * contrast + 127.5));
    const l = .2126 * r + .7152 * g + .0722 * b;
    d[i] = Math.min(255, Math.max(0, l + (r - l) * sat));
    d[i + 1] = Math.min(255, Math.max(0, l + (g - l) * sat));
    d[i + 2] = Math.min(255, Math.max(0, l + (b - l) * sat));
  }

  // 2パス目：鮮明さ・明瞭度（フル解像度）
  if (sharp > 0 || clar !== 0) {
    const src = new Float32Array(d.length);
    for (let i = 0; i < d.length; i += 4) {
      src[i] = d[i];
      src[i+1] = d[i+1];
      src[i+2] = d[i+2];
    }
    const amount = sharp * 1.25 + clar * .65;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const p = (row + x) * 4,
              left = (row + Math.max(0, x - 1)) * 4,
              right = (row + Math.min(w - 1, x + 1)) * 4,
              up = (Math.max(0, y - 1) * w + x) * 4,
              down = (Math.min(h - 1, y + 1) * w + x) * 4;
        for (let ch = 0; ch < 3; ch++) {
          const blur = (src[p + ch] + src[left + ch] + src[right + ch] + src[up + ch] + src[down + ch]) * .2;
          d[p + ch] = Math.min(255, Math.max(0, src[p + ch] + (src[p + ch] - blur) * amount));
        }
      }
    }
  }

  // 処理済みの画像データをメインスレッドへ返却
  self.postMessage({ imageData }, [imageData.data.buffer]);
};
