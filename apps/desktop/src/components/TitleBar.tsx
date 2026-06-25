import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const handleDragStart = (e: React.MouseEvent) => {
    // Only start drag on primary mouse button, and only when NOT clicking a button
    if (e.button === 0) {
      appWindow.startDragging();
    }
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragStart}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        background: "rgba(20, 20, 30, 0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none",
        borderBottom: "1px solid rgba(74, 158, 255, 0.4)",
        zIndex: 100,
      }}
    >
      {/* App label — also drag-region, pointer-events off so it doesn't interfere */}
      <span
        data-tauri-drag-region
        style={{
          color: "rgba(200, 220, 255, 0.85)",
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 500,
          paddingLeft: 10,
          letterSpacing: "0.04em",
          pointerEvents: "none",
        }}
      >
        UI AI Helper — frame
      </span>

      {/* Window controls — stop mousedown propagation so drag doesn't fire */}
      <div
        style={{ display: "flex" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <WinBtn title="Minimize" hoverBg="rgba(255,255,255,0.12)" onClick={() => appWindow.minimize()}>
          &#8212;
        </WinBtn>
        <WinBtn title="Close" hoverBg="rgba(231,76,60,0.85)" onClick={() => appWindow.close()}>
          &#x2715;
        </WinBtn>
      </div>
    </div>
  );
}

function WinBtn({
  children,
  title,
  hoverBg,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  hoverBg: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? hoverBg : "transparent",
        border: "none",
        color: "rgba(200, 220, 255, 0.8)",
        cursor: "pointer",
        width: 40,
        height: 36,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.12s",
        outline: "none",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
