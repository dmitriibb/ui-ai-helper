import { useEffect, useRef, CSSProperties } from "react";
import { OverlayItem } from "../types";

interface Props {
  items: OverlayItem[];
  onDismiss?: (id: string) => void;
}

const DEFAULT_COLOR = "#ff4444";
const LABEL_FONT = "bold 13px system-ui, sans-serif";
const LABEL_PADDING = 4;

// ─── X-button positioning ────────────────────────────────────────────────────

/** Returns the centre position (in canvas/CSS logical pixels) for the dismiss
 *  button of each item type. Returns null if there's nothing to anchor to. */
function getXButtonPos(item: OverlayItem): { x: number; y: number } | null {
  switch (item.type) {
    case "rectangle":
    case "highlight": {
      const { x = 0, y = 0, width = 80 } = item;
      // Top-right corner of the box
      return { x: x + width, y };
    }
    case "circle": {
      const { x = 0, y = 0, radius = 30 } = item;
      // 45° above-right on the circle edge
      return { x: x + radius * 0.707, y: y - radius * 0.707 };
    }
    case "arrow": {
      if (!item.from || !item.to) return null;
      // Midpoint of the arrow, shifted slightly above
      return {
        x: (item.from.x + item.to.x) / 2,
        y: Math.min(item.from.y, item.to.y) - 12,
      };
    }
    case "text": {
      const { x = 0, y = 0 } = item;
      return { x: x + 40, y: y - 12 };
    }
    default:
      return null;
  }
}

// ─── Dismiss button styles ───────────────────────────────────────────────────

const dismissBtnStyle: CSSProperties = {
  position: "absolute",
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "rgba(20, 20, 30, 0.88)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  color: "#fff",
  fontSize: 12,
  lineHeight: 1,
  cursor: "pointer",
  // pointer-events: auto overrides the parent's none so only these
  // tiny buttons intercept mouse events — everything else passes through.
  pointerEvents: "auto",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  // Centre the button on the anchor point
  transform: "translate(-50%, -50%)",
  zIndex: 100,
  userSelect: "none",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function OverlayCanvas({ items, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize canvas to match container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      redraw(canvas, items);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [items]);

  // Redraw when items change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redraw(canvas, items);
  }, [items]);

  return (
    // Outer wrapper: pointer-events none so all clicks pass through to the
    // underlying content, EXCEPT for the explicit dismiss buttons below which
    // set pointer-events: auto to override their parent.
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />

      {/* Per-item dismiss (×) buttons */}
      {items.map((item) => {
        if (!item.id) return null;
        const pos = getXButtonPos(item);
        if (!pos) return null;

        return (
          <button
            key={item.id}
            title="Dismiss"
            onClick={() => onDismiss?.(item.id!)}
            style={{
              ...dismissBtnStyle,
              left: pos.x,
              top: pos.y,
            }}
          >
            ×
          </button>
        );
      })}
    </div>
  );
}

// ─── Canvas drawing ──────────────────────────────────────────────────────────

function redraw(canvas: HTMLCanvasElement, items: OverlayItem[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of items) {
    drawItem(ctx, item);
  }
}

function drawItem(ctx: CanvasRenderingContext2D, item: OverlayItem) {
  const color = item.color ?? DEFAULT_COLOR;

  switch (item.type) {
    case "rectangle": {
      const { x = 0, y = 0, width = 80, height = 40 } = item;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
      if (item.label) drawLabel(ctx, item.label, x + width / 2, y - 6, color);
      break;
    }

    case "highlight": {
      const { x = 0, y = 0, width = 80, height = 40 } = item;
      ctx.save();
      ctx.fillStyle = color.startsWith("rgba") ? color : hexToRgba(color, 0.25);
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
      if (item.label) drawLabel(ctx, item.label, x + width / 2, y - 6, color);
      break;
    }

    case "circle": {
      const { x = 0, y = 0, radius = 30 } = item;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      if (item.label) drawLabel(ctx, item.label, x, y - radius - 6, color);
      break;
    }

    case "arrow": {
      if (!item.from || !item.to) break;
      const { from, to } = item;
      drawArrow(ctx, from.x, from.y, to.x, to.y, color);
      if (item.label) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 - 10;
        drawLabel(ctx, item.label, midX, midY, color);
      }
      break;
    }

    case "text": {
      const { x = 0, y = 0 } = item;
      if (item.label) drawLabel(ctx, item.label, x, y, color, true);
      break;
    }
  }
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) {
  const headLen = 14;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  color: string,
  standalone = false
) {
  ctx.save();
  ctx.font = LABEL_FONT;
  const metrics = ctx.measureText(text);
  const w = metrics.width + LABEL_PADDING * 2;
  const h = 18;
  const x = cx - w / 2;
  const y = cy - (standalone ? h / 2 : h);

  // Background pill
  ctx.fillStyle = "rgba(10, 10, 20, 0.75)";
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 4);
  ctx.stroke();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + LABEL_PADDING, y + h - 5);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
