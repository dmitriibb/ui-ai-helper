/**
 * Typed client for the UI AI Helper desktop app HTTP API.
 * The desktop app must be running before calling any method.
 */

const BASE_URL = "http://127.0.0.1:7765";

export interface Point {
  x: number;
  y: number;
}

export type OverlayItemType =
  | "rectangle"
  | "arrow"
  | "circle"
  | "text"
  | "highlight";

export interface OverlayItem {
  type: OverlayItemType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  from?: Point;
  to?: Point;
  label?: string;
  /** CSS colour string, e.g. "#ff4444" or "rgba(255,0,0,0.5)" */
  color?: string;
}

export interface FrameState {
  window: {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
  };
  captureArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CaptureResult {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options?.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getFrameState(): Promise<FrameState> {
  return apiFetch<FrameState>("/frame");
}

export async function setFrame(params: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}): Promise<void> {
  await apiFetch("/frame", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function captureFrame(): Promise<CaptureResult> {
  return apiFetch<CaptureResult>("/capture", { method: "POST" });
}

export async function showOverlay(
  items: OverlayItem[],
  ttlMs?: number
): Promise<void> {
  await apiFetch("/overlay", {
    method: "POST",
    body: JSON.stringify({ items, ttlMs }),
  });
}

export async function clearOverlay(): Promise<void> {
  await apiFetch("/overlay", { method: "DELETE" });
}

export async function checkHealth(): Promise<boolean> {
  try {
    await apiFetch("/health");
    return true;
  } catch {
    return false;
  }
}
