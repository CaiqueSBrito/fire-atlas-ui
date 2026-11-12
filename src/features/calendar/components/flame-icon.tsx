import { useId } from "react";

export function FlameIcon({
  className,
  muted = false,
}: {
  className?: string;
  muted?: boolean;
}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 24 32"
      aria-hidden="true"
      className={className}
      style={muted ? { opacity: 0.35, filter: "grayscale(1)" } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff3d2e" />
          <stop offset="0.6" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ffd166" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 1C12 1 15.500 5.500 15.600 10C17.700 8.600 18.200 6.500 18.200 6.500C21.200 10 22.600 14 22.600 19C22.600 25.500 18 31 12 31C6 31 1.400 25.500 1.400 19C1.400 14.500 4 11.500 6 9.500C6.300 11.500 7.300 13 8.800 13.800C8.300 9.500 9.800 4.500 12 1Z"
      />
      <path
        fill="#fff3c4"
        opacity="0.9"
        d="M12 17C12 17 15.600 20 15.600 23.600C15.600 26.300 14 28.200 12 28.200C10 28.200 8.400 26.300 8.400 23.600C8.400 20.500 10.500 19.500 12 17Z"
      />
    </svg>
  );
}
