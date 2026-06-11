import { useCallback, useState } from "react";
import { polygonArea, polygonPerimeter } from "@/lib/geometry";

// Manages active drawing polygon (list of world points in meters).
export const useAreaTool = () => {
  const [points, setPoints] = useState([]);
  const [hoverPoint, setHoverPoint] = useState(null); // [x,y] live preview

  const addPoint = useCallback((p) => {
    setPoints((arr) => [...arr, p]);
  }, []);

  const popLast = useCallback(() => {
    setPoints((arr) => arr.slice(0, -1));
  }, []);

  const reset = useCallback(() => {
    setPoints([]);
    setHoverPoint(null);
  }, []);

  // Live area using hover as ghost-closing vertex
  const liveAreaM2 = (() => {
    const tail = hoverPoint && points.length >= 2 ? [...points, hoverPoint] : points;
    return polygonArea(tail);
  })();
  const livePerimeterM = (() => {
    if (points.length === 0) return 0;
    const tail = hoverPoint ? [...points, hoverPoint] : points;
    return polygonPerimeter(tail, points.length >= 2);
  })();

  return {
    points,
    setPoints,
    addPoint,
    popLast,
    reset,
    hoverPoint,
    setHoverPoint,
    liveAreaM2,
    livePerimeterM,
  };
};
