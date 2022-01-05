import { drawerWidth } from "../../common/ActionDrawer";

export function getBounds() {
  const controls = document.getElementById("controls");
  const y = controls?.clientHeight || 0;
  return {
    x: drawerWidth,
    y,
    width: window.innerWidth - drawerWidth,
    height: window.innerHeight - y,
  };
}
