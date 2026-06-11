import { useCallback, useState } from "react";
import { polylineLength } from "@/lib/geometry";

// Polyline (Odcinek) drawing — points in world meters.
export const useLineTool = () => {
  const [points, setPoints] = useState([]);
  const [hoverPoint, setHoverPoint] = useState(null);

  const addPoint = useCallback((p) => setPoints((arr) => [...arr, p]), []);
  const popLast = useCallback(() => setPoints((arr) => arr.slice(0, -1)), []);
  const reset = useCallback(() => {
    setPoints([]);
    setHoverPoint(null);
  }, []);

  const liveLengthM = (() => {
    if (points.length === 0) return 0;
    const tail = hoverPoint ? [...points, hoverPoint] : points;
    return polylineLength(tail);
  })();

  return {
    points,
    setPoints,
    addPoint,
    popLast,
    reset,
    hoverPoint,
    setHoverPoint,
    liveLengthM,
  };
};
