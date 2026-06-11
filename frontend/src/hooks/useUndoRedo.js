import { useCallback, useRef, useState } from "react";

// Undo/redo stack of {label, undo, redo} actions.
// Each `undo` and `redo` is async — they should re-execute the inverse via API + state updates.
export const useUndoRedo = (maxSize = 50) => {
  const [, setVersion] = useState(0);
  const past = useRef([]);
  const future = useRef([]);
  const busy = useRef(false);

  const bump = () => setVersion((v) => v + 1);

  const record = useCallback((action) => {
    past.current.push(action);
    if (past.current.length > maxSize) past.current = past.current.slice(-maxSize);
    future.current = [];
    bump();
  }, [maxSize]);

  const undo = useCallback(async () => {
    if (busy.current) return;
    const action = past.current[past.current.length - 1];
    if (!action) return;
    busy.current = true;
    try {
      await action.undo();
      past.current.pop();
      future.current.push(action);
      bump();
    } finally {
      busy.current = false;
    }
  }, []);

  const redo = useCallback(async () => {
    if (busy.current) return;
    const action = future.current[future.current.length - 1];
    if (!action) return;
    busy.current = true;
    try {
      await action.redo();
      future.current.pop();
      past.current.push(action);
      bump();
    } finally {
      busy.current = false;
    }
  }, []);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    bump();
  }, []);

  return {
    record,
    undo,
    redo,
    clear,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    lastLabel: past.current[past.current.length - 1]?.label ?? null,
  };
};
