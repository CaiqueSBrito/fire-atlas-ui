"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/feedback/loading-state";

export const FireMap = dynamic(() => import("./fire-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-space-950">
      <LoadingState label="Carregando mapa…" />
    </div>
  ),
});
