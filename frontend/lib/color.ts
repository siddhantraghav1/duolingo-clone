/**
 * Make a hex colour darker, for the 3D bottom edge of coloured shapes.
 *   darken("#58cc02", 0.2)  ->  "rgb(70, 163, 2)"   (20% darker)
 * Units get their colour from the database, so we can't hard-code the dark shades.
 */
export function darken(hex: string, amount = 0.2): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const scale = (channel: number) => Math.round(channel * (1 - amount));
  return `rgb(${scale(red)}, ${scale(green)}, ${scale(blue)})`;
}
