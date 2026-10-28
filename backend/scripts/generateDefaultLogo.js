const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'uploads', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const svg = `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <!-- Outer Shield -->
  <path d="M120 15 L205 50 C205 140 120 215 120 215 C120 215 35 140 35 50 Z" fill="url(#grad)" stroke="url(#gold)" stroke-width="6"/>
  <!-- Inner Shield Ring -->
  <path d="M120 28 L190 58 C190 135 120 198 120 198 C120 198 50 135 50 58 Z" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.7"/>
  <!-- Academic Cap / Book Icon -->
  <path d="M120 70 L160 88 L120 106 L80 88 Z" fill="#f8fafc"/>
  <path d="M95 102 L95 125 C95 136 145 136 145 125 L145 102" fill="none" stroke="#f8fafc" stroke-width="4"/>
  <line x1="160" y1="88" x2="160" y2="125" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="160" cy="127" r="4" fill="#f59e0b"/>
  <!-- Open Book -->
  <path d="M85 145 C100 142 115 147 120 152 C125 147 140 142 155 145 L155 170 C140 167 125 172 120 176 C115 172 100 167 85 170 Z" fill="#f8fafc" opacity="0.9"/>
  <!-- Text -->
  <text x="120" y="195" font-family="Arial, sans-serif" font-weight="bold" font-size="11" fill="#f59e0b" text-anchor="middle" letter-spacing="1">INSTITUTION SEAL</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(assetsDir, 'college-logo.png'))
  .then(() => console.log('Successfully generated default college-logo.png'))
  .catch((err) => console.error(err));
