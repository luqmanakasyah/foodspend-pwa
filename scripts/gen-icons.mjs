// Simple icon generator to ensure valid PNGs exist.
// Creates 192x192 and 512x512 PNGs with a gradient.
import { writeFileSync, mkdirSync } from 'fs';
import { createCanvas } from 'canvas';

function make(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0,0,size,size);
  g.addColorStop(0,'#0ea5e9');
  g.addColorStop(1,'#0369a1');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle = 'white';
  ctx.font = `${Math.round(size*0.28)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍲', size/2, size/2+ (size*0.04));
  return canvas.toBuffer('image/png');
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', make(192));
writeFileSync('public/icons/icon-512.png', make(512));
console.log('[gen-icons] icons regenerated');
