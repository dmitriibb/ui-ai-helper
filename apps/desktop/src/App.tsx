import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    const unlisten = listen<{ items: OverlayItem[]; ttlMs?: number }>(
      "overlay-updated",
      (event) => {
        setOverlayItems(event.payload.items);

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
        <OverlayCanvas items={overlayItems} />
      </div>
    </div>
  );
}
