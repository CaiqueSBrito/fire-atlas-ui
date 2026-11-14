"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type DrawModeValue = { drawing: boolean; setDrawing: (value: boolean) => void };

const DrawModeContext = createContext<DrawModeValue>({
  drawing: false,
  setDrawing: () => {},
});

export function DrawModeProvider({ children }: { children: ReactNode }) {
  const [drawing, setDrawing] = useState(false);
  const value = useMemo(() => ({ drawing, setDrawing }), [drawing]);
  return <DrawModeContext.Provider value={value}>{children}</DrawModeContext.Provider>;
}

export function useDrawMode(): DrawModeValue {
  return useContext(DrawModeContext);
}
