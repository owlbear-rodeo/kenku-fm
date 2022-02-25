// Import all images in this folder at build time
// @ts-ignore
const images = require.context("./", false, /\.(png|jpe?g|svg|webp)$/);

export const backgrounds: Record<string, string> = images.keys().reduce(
  (bg: Record<string, string>, path: string) => ({
    // Use just the file name as the key
    [path.replace(/\.\/(.+?)(\.[^.]*$|$)/, "$1")]: images(path),
    ...bg,
  }),
  {}
);

export type Background = keyof typeof backgrounds;

export function getRandomBackground(): Background {
  const keys = Object.keys(backgrounds);
  return keys[Math.floor(Math.random() * keys.length)] as Background;
}

export function isBackground(background: string): background is Background {
  return background in backgrounds;
}
