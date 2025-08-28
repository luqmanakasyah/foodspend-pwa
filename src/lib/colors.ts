// Utility to generate provisional colors for user-defined categories without hardcoded CSS.
// Produces a stable gradient based on a simple hash of the category label.

export function categoryGradient(cat: string): string {
  const h = hash(cat);
  const hue = h % 360; // full spectrum
  const hue2 = (hue + 25) % 360; // slight offset for gradient depth
  // Muted saturation & controlled lightness for dark/light theme compatibility
  return `linear-gradient(180deg, hsl(${hue} 35% 48%), hsl(${hue2} 40% 32%))`;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 131 + str.charCodeAt(i)) >>> 0; // unsigned 32-bit
  }
  return h;
}
