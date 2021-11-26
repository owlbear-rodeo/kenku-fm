import red from "./red.svg";
import orange from "./orange.svg";
import green from "./green.svg";
import yellow from "./yellow.svg";

export const backgrounds = {
  red,
  orange,
  green,
  yellow,
};

export type Background = keyof typeof backgrounds;

export function getRandomBackground(): Background {
  const keys = Object.keys(backgrounds);
  return keys[Math.floor(Math.random() * keys.length)] as Background;
}

export function isBackground(background: string): background is Background {
  return background in backgrounds;
}
