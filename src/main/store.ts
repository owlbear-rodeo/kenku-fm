import Store from "electron-store";
import StoreType from "../types/store";

Store.initRenderer();
const store = new Store<StoreType>({
  defaults: {
    showControls: false,
  },
});

export default store;
