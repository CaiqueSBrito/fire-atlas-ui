import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  // Botão vermelho de acesso (RN02). Branco sobre fire-500 = contraste 4.5:1.
  primary:
    "bg-fire-500 text-white shadow-[0_0_40px_rgba(229,36,43,0.55)] hover:brightness-110",
  secondary:
    "border border-space-600 bg-space-800 text-ink-100 hover:border-ink-300",
  ghost: "text-ink-300 hover:text-ink-100",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-small", // 44px: alvo de toque mínimo
  lg: "min-h-14 px-8 text-lg",
};

/** Classes do botão — use também em <Link> para manter o mesmo visual. */
export function buttonVariants({
  variant = "secondary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type="button"
      {...props}
      className={buttonVariants({ variant, size, className })}
    />
  );
}
