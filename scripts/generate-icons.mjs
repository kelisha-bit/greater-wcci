#!/usr/bin/env node
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    await mkdir(iconsDir, { recursive: true });
  } catch (e) {
    // Directory exists
  }

  const svgPath = join(iconsDir, 'icon.svg');
  const svgBuffer = await readFile(svgPath);

  console.log('Generating PWA icons...');

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created: icon-${size}x${size}.png`);
  }

  // Generate maskable icon (with safe zone padding)
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1e40af"/>
        <stop offset="100%" style="stop-color:#3b82f6"/>
      </linearGradient>
    </defs>
    <circle cx="256" cy="256" r="256" fill="url(#bg)"/>
    <g transform="translate(64, 64) scale(0.75)">
      <g fill="white">
        <rect x="180" y="220" width="152" height="140" rx="4"/>
        <polygon points="256,100 340,220 172,220"/>
        <rect x="248" y="70" width="16" height="50"/>
        <rect x="238" y="85" width="36" height="12"/>
        <rect x="230" y="290" width="52" height="70" rx="26" ry="26"/>
        <circle cx="210" cy="270" r="15"/>
        <circle cx="302" cy="270" r="15"/>
        <rect x="252" y="150" width="8" height="30"/>
        <rect x="244" y="158" width="24" height="8"/>
      </g>
    </g>
  </svg>`;

  const maskablePath = join(iconsDir, 'maskable-icon-512x512.png');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(maskablePath);
  console.log('  Created: maskable-icon-512x512.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
