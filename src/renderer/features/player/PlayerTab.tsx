import React, { useEffect } from "react";

import { RootState } from "../../app/store";
import { useSelector, useDispatch } from "react-redux";
import { enableRemote, setPlayerId } from "./playerSlice";
import { TabItem } from "../tabs/TabItem";
import { getBounds } from "../tabs/getBounds";
import { selectTab } from "../tabs/tabsSlice";

export function PlayerTab() {
  const dispatch = useDispatch();

  const player = useSelector((state: RootState) => state.player);
  const tabs = useSelector((state: RootState) => state.tabs);

  useEffect(() => {
    const createTab = async () => {
      const bounds = getBounds();
      const id = await window.kenku.createBrowserView(
        player.tab.url,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        player.tab.preload
      );
      window.kenku.playerRegisterView(id);
      dispatch(setPlayerId(id));
      dispatch(selectTab(id));
    };

    if (player.tab.id === -1) {
      createTab();
    }
  }, [player.tab]);

  useEffect(() => {
    window.kenku.on("PLAYER_REMOTE_ENABLED", (args) => {
      const enabled = args[0];
      dispatch(enableRemote(enabled));
    });

    return () => {
      window.kenku.removeAllListeners("PLAYER_REMOTE_ENABLED");
    };
  }, []);

  return (
    <TabItem tab={player.tab} selected={tabs.selectedTab === player.tab.id} />
  );
}
