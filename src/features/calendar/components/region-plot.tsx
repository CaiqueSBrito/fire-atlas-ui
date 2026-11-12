import type { Region } from "@/config/regions";
import type { Detection } from "@/types/calendar";

// Visualização geográfica esquemática: posiciona detecções (lat/lon) dentro da
// caixa envolvente da região. NÃO é um mapa base — o mapa real é do NASA-012.
// Sensores distinguidos por forma (VIIRS = círculo, MODIS = losango), não só cor.

const H = 100;

export function RegionPlot({
  region,
  detections,
  title,
}: {
  region: Region;
  detections: Detection[];
  title: string;
}) {
  const [w, s, e, n] = region.bbox;
  const dx = e - w;
  const dy = n - s;
  const W = Math.min(220, Math.max(60, (H * dx) / dy));
  const px = (lon: number) => ((lon - w) / dx) * W;
  const py = (lat: number) => ((n - lat) / dy) * H;
  const lines = [0.25, 0.5, 0.75];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={title}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="rp-glow">
          <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rp-bg" cx="50%" cy="50%" r="75%">
          <stop offset="0" stopColor="#16213f" />
          <stop offset="1" stopColor="#070b17" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#rp-bg)" />
      {lines.map((f) => (
        <g key={f} stroke="var(--space-600)" strokeWidth="0.3">
          <line x1={W * f} x2={W * f} y1={0} y2={H} />
          <line x1={0} x2={W} y1={H * f} y2={H * f} />
        </g>
      ))}
      <rect
        x="0.4"
        y="0.4"
        width={W - 0.8}
        height={H - 0.8}
        fill="none"
        stroke="var(--ember-400)"
        strokeWidth="0.6"
        strokeDasharray="2 1.5"
      />
      {detections.map((d, i) => (
        <circle
          key={`g${i}`}
          cx={px(d.lon)}
          cy={py(d.lat)}
          r={Math.max(3.5, W / 30)}
          fill="url(#rp-glow)"
        />
      ))}
      {detections.map((d, i) =>
        d.sensor === "VIIRS" ? (
          <circle
            key={i}
            cx={px(d.lon)}
            cy={py(d.lat)}
            r={Math.max(0.9, W / 120)}
            fill="var(--fire-400)"
          />
        ) : (
          <rect
            key={i}
            x={px(d.lon) - 1}
            y={py(d.lat) - 1}
            width={2}
            height={2}
            fill="var(--ember-400)"
            transform={`rotate(45 ${px(d.lon)} ${py(d.lat)})`}
          />
        ),
      )}
      <g fontSize="3.2" fill="var(--ink-300)" fontFamily="var(--font-data)">
        <text x="1.5" y="5">N {n.toFixed(1)}°</text>
        <text x="1.5" y={H - 5.5}>S {s.toFixed(1)}°</text>
        <text x="1.5" y={H - 2}>O {w.toFixed(1)}°</text>
        <text x={W - 1.5} y={H - 2} textAnchor="end">L {e.toFixed(1)}°</text>
      </g>
    </svg>
  );
}
