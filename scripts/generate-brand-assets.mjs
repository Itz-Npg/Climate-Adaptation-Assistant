/**
 * Generates the brand assets in client/public without any image dependency:
 * favicon.svg, PNG app icons, an Open Graph share image, plus robots.txt,
 * sitemap.xml and the web app manifest.
 *
 * Run with: node scripts/generate-brand-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'client', 'public');
mkdirSync(OUT_DIR, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

/**
 * Draws the mark: forest-green gradient tile with a white leaf.
 * `rounded` > 0 gives app-icon corners; 0 fills the whole canvas.
 */
function render(width, height, { rounded = 0.22, leafScale = 1, leafOffsetX = 0 } = {}) {
  const pixels = new Uint8Array(width * height * 4);
  const half = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const nx = (x + 0.5 - width / 2) / half;
      const ny = (y + 0.5 - height / 2) / half;

      // rounded-rectangle (superellipse) mask
      let inside = 1;
      if (rounded > 0) {
        const power = 2 / rounded;
        inside =
          Math.pow(Math.abs(nx), power) + Math.pow(Math.abs(ny), power) <= 1 ? 1 : 0;
      }
      if (!inside) {
        pixels[index + 3] = 0;
        continue;
      }

      // diagonal forest gradient
      const t = Math.max(0, Math.min(1, (nx + ny + 2) / 4));
      let r = mix(0x2f, 0x4c, t);
      let g = mix(0x6b, 0x90, t);
      let b = mix(0x4a, 0x60, t);

      // soft radial glow behind the leaf
      const glow = Math.max(0, 1 - Math.hypot(nx, ny) / 1.15);
      r = mix(r, 0x1e, glow * 0.25);
      g = mix(g, 0x45, glow * 0.25);
      b = mix(b, 0x31, glow * 0.25);

      // leaf: rotated almond shape
      const angle = -Math.PI / 4;
      const px = nx - leafOffsetX;
      const lx = px * Math.cos(angle) - ny * Math.sin(angle);
      const ly = px * Math.sin(angle) + ny * Math.cos(angle);
      const a = 0.52 * leafScale;
      const c = 0.25 * leafScale;
      const leaf =
        Math.pow(Math.abs(lx) / a, 2.4) + Math.pow(Math.abs(ly) / c, 2.4) <= 1;

      if (leaf) {
        r = 255;
        g = 255;
        b = 255;
        // central vein in forest green
        if (Math.abs(ly) < 0.018 * leafScale && Math.abs(lx) < a * 0.92) {
          r = 0x26;
          g = 0x56;
          b = 0x3c;
        }
      }

      pixels[index] = r;
      pixels[index + 1] = g;
      pixels[index + 2] = b;
      pixels[index + 3] = 255;
    }
  }
  return encodePng(width, height, pixels);
}

const assets = [
  ['icon-192.png', 192, 192, {}],
  ['icon-512.png', 512, 512, {}],
  ['apple-touch-icon.png', 180, 180, {}],
  ['og-image.png', 1200, 630, { rounded: 0, leafScale: 0.62, leafOffsetX: 0 }],
  ['twitter-card.png', 1200, 600, { rounded: 0, leafScale: 0.6, leafOffsetX: 0 }],
];

for (const [name, width, height, options] of assets) {
  writeFileSync(path.join(OUT_DIR, name), render(width, height, options));
  console.log(`wrote ${name} (${width}x${height})`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Climate Adaptation Assistant">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f6b4a"/>
      <stop offset="1" stop-color="#4c9060"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M46 18c0 13-8.4 22-20 22-3 0-5-.4-6.8-1.1C21 26.6 31 18.6 46 18Z" fill="#fff"/>
  <path d="M19 47c3.4-7.6 8.6-13.5 15.6-17.9" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>
`;
writeFileSync(path.join(OUT_DIR, 'favicon.svg'), favicon);

const maskIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M46 18c0 13-8.4 22-20 22-3 0-5-.4-6.8-1.1C21 26.6 31 18.6 46 18Z" fill="#fff"/>
  <path d="M19 47c3.4-7.6 8.6-13.5 15.6-17.9" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>
`;
writeFileSync(path.join(OUT_DIR, 'safari-pinned-tab.svg'), maskIcon);

const manifest = {
  name: 'Climate Adaptation Assistant',
  short_name: 'Climate Adapt',
  description:
    'Understand local climate risks, plan household adaptation tasks and compare places.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#2f6b4a',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync(path.join(OUT_DIR, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);

const today = new Date().toISOString().slice(0, 10);
const routes = [
  ['/', '1.0', 'weekly'],
  ['/map', '0.9', 'weekly'],
  ['/team', '0.6', 'monthly'],
  ['/login', '0.4', 'yearly'],
  ['/signup', '0.5', 'yearly'],
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ([route, priority, changefreq]) => `  <url>
    <loc>https://climate-adaptation-assistant.example${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap);

const robots = `# Climate Adaptation Assistant
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /risk-checker
Disallow: /planner
Disallow: /compare
Disallow: /reset-password

Sitemap: https://climate-adaptation-assistant.example/sitemap.xml
`;
writeFileSync(path.join(OUT_DIR, 'robots.txt'), robots);

console.log('wrote favicon.svg, site.webmanifest, sitemap.xml, robots.txt');
