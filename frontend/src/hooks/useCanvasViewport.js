import { useCallback, useRef, useState } from "react";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEPS, zoomToScale } from "@/lib/geometry";

// Manages pan offset (meters) + zoom percentage.
export const useCanvasViewport = (initial = { zoom: 100, offsetX: -10, offsetY: -10 }) => {
  const [zoom, setZoom] = useState(initial.zoom);
  const [offset, setOffset] = useState({ x: initial.offsetX, y: initial.offsetY });
  const ref = useRef({ zoom: initial.zoom, offset: { x: initial.offsetX, y: initial.offsetY } });
  ref.current = { zoom, offset };

  const scale = zoomToScale(zoom);

  const screenToWorld = useCallback(
    (sx, sy) => {
      const s = zoomToScale(ref.current.zoom);
      return { x: ref.current.offset.x + sx / s, y: ref.current.offset.y + sy / s };
    },
    []
  );

  const worldToScreen = useCallback(
    (wx, wy) => {
      const s = zoomToScale(ref.current.zoom);
      return { x: (wx - ref.current.offset.x) * s, y: (wy - ref.current.offset.y) * s };
    },
    []
  );

  const pan = useCallback((dxPx, dyPx) => {
    setOffset((o) => ({ x: o.x - dxPx / zoomToScale(ref.current.zoom), y: o.y - dyPx / zoomToScale(ref.current.zoom) }));
  }, []);

  const setZoomClamped = useCallback((next) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
  }, []);

  // Zoom around a screen anchor point so the world point under cursor stays put.
  const zoomAt = useCallback((nextZoom, anchorPx) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const sOld = zoomToScale(ref.current.zoom);
    const sNew = zoomToScale(clamped);
    const wx = ref.current.offset.x + anchorPx.x / sOld;
    const wy = ref.current.offset.y + anchorPx.y / sOld;
    const newOffsetX = wx - anchorPx.x / sNew;
    const newOffsetY = wy - anchorPx.y / sNew;
    setOffset({ x: newOffsetX, y: newOffsetY });
    setZoom(clamped);
  }, []);

  const zoomIn = useCallback((anchor) => {
    const next = ZOOM_STEPS.find((z) => z > ref.current.zoom) ?? MAX_ZOOM;
    zoomAt(next, anchor || { x: 0, y: 0 });
  }, [zoomAt]);

  const zoomOut = useCallback((anchor) => {
    const reversed = [...ZOOM_STEPS].reverse();
    const next = reversed.find((z) => z < ref.current.zoom) ?? MIN_ZOOM;
    zoomAt(next, anchor || { x: 0, y: 0 });
  }, [zoomAt]);

  const reset = useCallback(() => {
    setZoom(100);
    setOffset({ x: initial.offsetX, y: initial.offsetY });
  }, [initial.offsetX, initial.offsetY]);

  return {
    zoom,
    offset,
    scale,
    setZoom: setZoomClamped,
    setOffset,
    pan,
    zoomIn,
    zoomOut,
    zoomAt,
    reset,
    screenToWorld,
    worldToScreen,
  };
};
