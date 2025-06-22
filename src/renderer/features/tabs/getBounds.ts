import { store } from "../../app/store";
import { drawerWidth } from "../../common/ActionDrawer";

export function getBounds() {
  const controls = document.getElementById("controls");
  const menuOpen = store.getState().menu.menuOpen;
  const y = controls?.clientHeight || 0;
  const x = menuOpen ? drawerWidth : 0;
  const width = window.innerWidth - (menuOpen ? drawerWidth : 0);
  return {
    x,
    y,
    width,
    height: window.innerHeight - y,
  };
}
