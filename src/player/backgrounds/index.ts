import castle from "./shutter/castle.jpg";
import dragon from "./shutter/dragon.jpg";
import tavern from "./shutter/tavern.jpg";
import town from "./shutter/town.jpg";
import war from "./shutter/war.jpg";
import autumn from "./pexels/autumn.jpg";
import beach from "./pexels/beach.jpg";
import butterflys from "./pexels/butterflys.jpg";
import cathedral from "./pexels/cathedral.jpg";
import haunted from "./pexels/haunted.jpg";
import lines from "./pexels/lines.jpg";
import mountain from "./pexels/mountain.jpg";
import sand from "./pexels/sand.jpg";
import skulls from "./pexels/skulls.jpg";
import sky from "./pexels/sky.jpg";
import smoke from "./pexels/smoke.jpg";
import sparks from "./pexels/sparks.jpg";
import stars from "./pexels/stars.jpg";
import texture from "./pexels/texture.jpg";
import tree from "./pexels/tree.jpg";
import veins from "./pexels/veins.jpg";
import volcano from "./pexels/volcano.jpg";
import winter from "./pexels/winter.jpg";

export const backgrounds = {
  castle,
  dragon,
  tavern,
  town,
  war,
  autumn,
  beach,
  butterflys,
  cathedral,
  haunted,
  lines,
  mountain,
  sand,
  skulls,
  sky,
  smoke,
  sparks,
  stars,
  texture,
  tree,
  veins,
  volcano,
  winter,
};

export type Background = keyof typeof backgrounds;

export function getRandomBackground(): Background {
  const keys = Object.keys(backgrounds);
  return keys[Math.floor(Math.random() * keys.length)] as Background;
}

export function isBackground(background: string): background is Background {
  return background in backgrounds;
}
