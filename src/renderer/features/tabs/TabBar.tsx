import React, { useEffect, useRef, useState } from "react";
import List from "@mui/material/List";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../app/store";
import { moveTab, Tab } from "./tabsSlice";

import { TabItem } from "./TabItem";
import { PlayerTab } from "../player/PlayerTab";
import { AddTabButton } from "./AddTabButton";
import { SortableItem } from "../../common/SortableItem";
import { WindowControls } from "../../common/WindowControls";

export function TabBar() {
  const dispatch = useDispatch();

  const tabs = useSelector((state: RootState) => state.tabs);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, keyboardSensor);

  const [dragId, setDragId] = useState<string | null>(null);
  function handleDragStart(event: DragStartEvent) {
    setDragId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over.id) {
      dispatch(
        moveTab({
          active: Number.parseInt(active.id),
          over: Number.parseInt(over.id),
        })
      );
    }

    setDragId(null);
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [smallTabs, setSmallTabs] = useState(false);
  // Observe tab bar size and change to small tabs mode if needed
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const tabLength = Math.max(tabs.tabs.allIds.length + 1, 1);
      const updateTabSizeIfNeeded = (tabSize: number) => {
        if (tabSize < 150 && !smallTabs) {
          setSmallTabs(true);
        } else if (tabSize > 180 && smallTabs) {
          setSmallTabs(false);
        }
      };

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        const rect = entry?.contentRect;
        if (rect) {
          updateTabSizeIfNeeded(rect.width / tabLength);
        }
      });

      updateTabSizeIfNeeded(container.clientWidth / tabLength);

      observer.observe(container);

      return () => {
        observer.unobserve(container);
      };
    }
  }, [smallTabs, tabs.tabs.allIds]);

  const items = tabs.tabs.allIds.map((id) => tabs.tabs.byId[id]);

  function getTabComponent(tab: Tab, shadow = false) {
    return (
      <TabItem
        tab={{
          ...tab,
          icon:
            // Hide icon if we're in small tab mode and the tab is selected to ensure the close icon will fit
            smallTabs && tabs.selectedTab === tab.id ? "" : tab.icon,
        }}
        selected={tabs.selectedTab === tab.id}
        // Hide the close icon if we're in small tab mode and we're not selected
        allowClose={smallTabs ? tabs.selectedTab === tab.id : true}
        shadow={shadow}
      />
    );
  }

  return (
    <List
      component="div"
      ref={containerRef}
      sx={{
        flexDirection: "row",
        display: "flex",
        alignItems: "center",
        px: 1,
        overflowX: "auto",
        WebkitAppRegion: "drag",
      }}
      onDoubleClick={() => window.kenku.toggleMaximize()}
    >
      <PlayerTab />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.tabs.allIds.map((id) => `${id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {items.map((tab) => (
            <SortableItem
              key={tab.id}
              id={`${tab.id}`}
              style={{ width: "100%", minWidth: "76px" }}
            >
              {getTabComponent(tab)}
            </SortableItem>
          ))}
          <DragOverlay>
            {dragId
              ? getTabComponent(tabs.tabs.byId[Number.parseInt(dragId)], true)
              : null}
          </DragOverlay>
        </SortableContext>
      </DndContext>
      <AddTabButton />
      {/* Show window controls in the tab bar for windows */}
      {window.kenku.platform === "win32" && <WindowControls />}
    </List>
  );
}
