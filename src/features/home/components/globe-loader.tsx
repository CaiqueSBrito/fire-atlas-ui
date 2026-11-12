"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";

/** Representação estática usada enquanto carrega ou se o WebGL falhar. */
function GlobePlaceholder() {
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center lg:justify-end lg:pr-[12%]">
      <div className="h-[min(70vw,60svh)] w-[min(70vw,60svh)] animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,#3aa6ff,#0a2a5e_55%,#04060c)] shadow-[0_0_80px_rgba(58,166,255,0.25)]" />
    </div>
  );
}

class WebGLBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <GlobePlaceholder /> : this.props.children;
  }
}

// three.js é pesado: carrega só no cliente e depois do primeiro render.
const Globe = dynamic(() => import("./globe"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

export function GlobeLoader() {
  return (
    <WebGLBoundary>
      <Globe />
    </WebGLBoundary>
  );
}
