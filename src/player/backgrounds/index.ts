import blank from "../../assets/blank.png";
// Import all images in this folder at build time
// @ts-ignore
const images = require.context("./", false, /\.(png|jpe?g|svg|webp)$/);
const keys = images.keys();

export const backgrounds: Record<string, string> =
  keys.length === 0
    ? { blank } // Load a blank image if we don't have any backgrounds installed
    : images.keys().reduce(
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
