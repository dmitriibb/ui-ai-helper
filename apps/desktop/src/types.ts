export interface Point {
  x: number;
  y: number;
}

export type OverlayItemType = "rectangle" | "arrow" | "circle" | "text" | "highlight";

export interface OverlayItem {
  type: OverlayItemType;
  // For rectangle, highlight
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // For circle
  radius?: number;
  // For arrow
  from?: Point;
  to?: Point;
  // Shared
  label?: string;
  color?: string;
}

export interface OverlayPayload {
  items: OverlayItem[];
  ttlMs?: number;
}
