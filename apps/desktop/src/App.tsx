import { useEffect, useRef, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { TitleBar } from "./components/TitleBar";
import { OverlayCanvas } from "./components/OverlayCanvas";
import { OverlayItem } from "./types";
import "./App.css";

const TITLE_BAR_HEIGHT = 36; // logical px
const BORDER_WIDTH = 3;       // logical px

export default function App() {
  const [overlayItems, setOverlayItems] = useState<OverlayItem[]>([]);
  const ttlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback((id: string) => {
    setOverlayItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const unlisten = listen<{ items: OverlayItem[]; ttlMs?: number }>(
      "overlay-updated",
      (event) => {
        // Assign a unique id to every item so each can be dismissed individually.
        const itemsWithIds: OverlayItem[] = event.payload.items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
        }));
        setOverlayItems(itemsWithIds);

        if (ttlTimerRef.current) {
          clearTimeout(ttlTimerRef.current);
          ttlTimerRef.current = null;
        }

        if (event.payload.ttlMs && event.payload.ttlMs > 0) {
          ttlTimerRef.current = setTimeout(() => {
            setOverlayItems([]);
          }, event.payload.ttlMs);
        }
      }
    );

    return () => {
      unlisten.then((fn) => fn());
      if (ttlTimerRef.current) clearTimeout(ttlTimerRef.current);
    };
  }, []);

  return (
    <div className="app-root">
      <TitleBar />
      <div
        className="capture-area"
        style={{
          top: TITLE_BAR_HEIGHT,
          left: BORDER_WIDTH,
          right: BORDER_WIDTH,
          bottom: BORDER_WIDTH,
        }}
      >
        <OverlayCanvas items={overlayItems} onDismiss={handleDismiss} />
      </div>
    </div>
  );
}
