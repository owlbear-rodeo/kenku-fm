import Store from "electron-store";
import StoreType from "../types/store";

Store.initRenderer();
const store = new Store<StoreType>({
  defaults: {
    showControls: false,
    remoteEnabled: false,
    remoteHost: "127.0.0.1",
    remotePort: 3333,
  },
});

export default store;
