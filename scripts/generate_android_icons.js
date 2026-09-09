import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const RES_DIR = path.resolve('android/app/src/main/res');

// Density mappings
const DENSITIES = [
  { name: 'mdpi', launcherSize: 48, foregroundSize: 108 },
  { name: 'hdpi', launcherSize: 72, foregroundSize: 162 },
  { name: 'xhdpi', launcherSize: 96, foregroundSize: 216 },
  { name: 'xxhdpi', launcherSize: 144, foregroundSize: 324 },
  { name: 'xxxhdpi', launcherSize: 192, foregroundSize: 432 },
];

const squareSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0B1220"/>
  <defs>
    <linearGradient id="logo-grad-sq" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>
  <g transform="translate(64, 36) scale(0.75)">
    <path d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#logo-grad-sq)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#logo-grad-sq)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 335 220 H 395 V 280"
          stroke="url(#logo-grad-sq)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <text x="256" y="445" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="44" letter-spacing="-0.5" text-anchor="middle">PocketLedger</text>
</svg>
`;

const roundSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="256" fill="#0B1220"/>
  <defs>
    <linearGradient id="logo-grad-rd" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>
  <g transform="translate(64, 36) scale(0.75)">
    <path d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#logo-grad-rd)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#logo-grad-rd)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 335 220 H 395 V 280"
          stroke="url(#logo-grad-rd)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
  </g>
  <text x="256" y="445" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-weight="bold" font-size="44" letter-spacing="-0.5" text-anchor="middle">PocketLedger</text>
</svg>
`;

// Adaptive foreground (transparent background, centered within safe zone)
const foregroundSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logo-grad-fg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>
  <g transform="translate(85.3, 85.3) scale(0.667)">
    <path d="M 185 150 H 290 C 330 150 360 180 360 220 C 360 260 330 290 290 290 H 185 V 360"
          stroke="url(#logo-grad-fg)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 185 340 L 255 260 L 305 310 L 395 220"
          stroke="url(#logo-grad-fg)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 335 220 H 395 V 280"
          stroke="url(#logo-grad-fg)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
`;

async function generateIcons() {
  for (const d of DENSITIES) {
    const dir = path.join(RES_DIR, `mipmap-${d.name}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`Generating icons for ${d.name}...`);

    // 1. ic_launcher.png
    await sharp(Buffer.from(squareSvg))
      .resize(d.launcherSize, d.launcherSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png
    await sharp(Buffer.from(roundSvg))
      .resize(d.launcherSize, d.launcherSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png
    await sharp(Buffer.from(foregroundSvg))
      .resize(d.foregroundSize, d.foregroundSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('All Android icons generated successfully!');
}

generateIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
