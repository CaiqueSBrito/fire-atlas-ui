# Components

Framework: Next.js (App Router, React 19) · Tailwind CSS v4 (tokens em `src/app/globals.css` via `@theme inline`) · biblioteca de componentes própria (sem shadcn/MUI). Fontes: Space Grotesk (display), Fustat (texto), JetBrains Mono (dados).

## `src/components/ui/button.tsx`
Button + buttonVariants (primary/secondary/ghost; md/lg) — pílula arredondada

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-6 tracking-[-0.02em] whitespace-nowrap transition duration-200 ease-[ease] disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-fire-500 text-white shadow-[0_0_40px_rgba(229,36,43,0.55)] hover:brightness-110",
  secondary:
    "border border-space-600 bg-space-800 text-ink-100 hover:border-ink-300",
  ghost: "text-ink-300 hover:text-ink-100",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-4 text-base",
  lg: "h-14 px-8 text-lg",
};

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
```

## `src/components/ui/dialog.test.tsx`


```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        abrir
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Título"
        footer={<button type="button">rodapé</button>}
      >
        <input aria-label="campo" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("fechado não renderiza nada", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("aberto é um diálogo modal nomeado pelo título e leva o foco para dentro", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const dialog = screen.getByRole("dialog", { name: "Título" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("Esc fecha e o foco volta para quem abriu", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "abrir" });
    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
  });

  it("o botão Fechar e o clique fora também fecham", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const backdrop = screen.getByRole("dialog").previousElementSibling as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: backdrop });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Tab não escapa do diálogo", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await userEvent.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("trava a rolagem da página enquanto está aberto e libera ao fechar", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "abrir" }));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
```

## `src/components/ui/dialog.tsx`
Dialog modal (foco preso, Esc, vira gaveta no celular)

```tsx
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden
        onMouseDown={() => onCloseRef.current()}
        className="absolute inset-0 bg-space-950/75 backdrop-blur-sm"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92svh] w-full max-w-xl flex-col rounded-t-[32px] border border-space-600 bg-space-900 p-4 shadow-2xl sm:rounded-[32px]"
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-1">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Fechar"
            className="grid h-12 w-12 place-items-center rounded-full text-ink-300 transition-colors duration-200 hover:bg-space-800 hover:text-ink-100"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-space-600 px-2 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
```

## `src/components/ui/field.ts`
Classes compartilhadas de campos

```ts
export const fieldClass =
  "flex min-h-[58px] items-center gap-2 rounded-xl border border-space-600 bg-space-900 px-3 py-4 text-base leading-6 text-ink-100 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-ink-300 focus-within:border-ember-400 focus-within:ring-4 focus-within:ring-ember-400/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30";

export const fieldLabelClass =
  "mb-2 block text-small font-semibold tracking-[-0.02em] text-ink-300";
```

## `src/components/ui/select.test.tsx`


```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "./select";

const OPTIONS = [
  { value: "mundo", label: "Mundo" },
  { value: "brasil", label: "Brasil" },
  { value: "bahia", label: "Bahia" },
];

function setup(initial = "brasil") {
  const onChange = vi.fn();
  function Harness() {
    const [value, setValue] = useState(initial);
    return (
      <>
        <Select
          label="Local"
          value={value}
          options={OPTIONS}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
        <button type="button">fora</button>
      </>
    );
  }
  render(<Harness />);
  const trigger = screen.getByRole("combobox", { name: /Local/ });
  const chevron = () => trigger.querySelector("svg")!;
  return { onChange, trigger, chevron };
}

describe("Select — setinha animada", () => {
  it("começa fechado, com a setinha para baixo", () => {
    const { trigger, chevron } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("gira ao abrir", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(chevron()).toHaveClass("rotate-180");
    expect(chevron()).toHaveClass("transition-transform");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("desgira ao selecionar uma opção", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Bahia" }));
    expect(onChange).toHaveBeenCalledWith("bahia");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Bahia");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("desgira ao clicar em outra coisa", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    expect(chevron()).toHaveClass("rotate-180");
    await userEvent.click(screen.getByRole("button", { name: "fora" }));
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("desgira ao apertar Esc, sem mudar o valor", async () => {
    const { trigger, chevron, onChange } = setup();
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveTextContent("Brasil");
  });

  it("desgira ao clicar de novo no próprio botão", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("desgira ao sair com Tab", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.tab();
    expect(chevron()).not.toHaveClass("rotate-180");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("pode reabrir depois de fechar (gira de novo)", async () => {
    const { trigger, chevron } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("option", { name: "Mundo" }));
    await userEvent.click(trigger);
    expect(chevron()).toHaveClass("rotate-180");
  });
});

describe("Select — semântica e opções", () => {
  it("marca a opção atual e lista todas", async () => {
    const { trigger } = setup("bahia");
    await userEvent.click(trigger);
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent?.replace("✓", ""))).toEqual([
      "Mundo",
      "Brasil",
      "Bahia",
    ]);
    expect(screen.getByRole("option", { name: /Bahia/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: "Mundo" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("o botão é nomeado pelo rótulo e mostra o valor atual", () => {
    const { trigger } = setup("mundo");
    expect(trigger).toHaveAccessibleName("Local");
    expect(trigger).toHaveTextContent("Mundo");
  });

  it("funciona com valores numéricos (ano)", async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Ano"
        value={2026}
        options={[2027, 2026, 2025].map((y) => ({ value: y, label: String(y) }))}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "2025" }));
    expect(onChange).toHaveBeenCalledWith(2025);
  });
});

describe("Select — teclado", () => {
  it("ArrowDown abre; setas movem; Enter escolhe", async () => {
    const { trigger, onChange } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("bahia");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("ArrowUp não passa do início", async () => {
    const { trigger, onChange } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{ArrowUp}{Enter}");
    expect(onChange).toHaveBeenCalledWith("mundo");
  });

  it("Home e End vão para a primeira e a última opção", async () => {
    const { trigger, onChange } = setup("brasil");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{End}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("bahia");
    await userEvent.keyboard("{ArrowDown}{Home}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("mundo");
  });

  it("Espaço e Enter abrem quando fechado", async () => {
    const { trigger } = setup();
    trigger.focus();
    await userEvent.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("a opção ativa é anunciada por aria-activedescendant", async () => {
    const { trigger } = setup("mundo");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    const active = trigger.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveTextContent("Brasil");
  });

  it("o foco permanece no botão enquanto navega", async () => {
    const { trigger } = setup();
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(trigger).toHaveFocus();
  });
});
```

## `src/components/ui/select.tsx`
Select acessível customizado (listbox)

```tsx
"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismiss } from "@/hooks/use-dismiss";
import { fieldClass, fieldLabelClass } from "./field";

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type SelectProps<T extends string | number> = {
  label: string;
  /** Esconde o rótulo visualmente (continua lido por leitores de tela). */
  hideLabel?: boolean;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
};

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 text-ink-300 transition-transform duration-200 ease-out ${
        open ? "rotate-180 text-ember-400" : ""
      }`}
    >
      <path
        d="M2 4.250 6 8.250 10 4.250"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.800"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Select próprio: a setinha gira ao abrir e volta ao fechar (selecionar,
// Esc, Tab ou clicar fora). Teclado: ↑ ↓ Home End Enter Espaço Esc.
export function Select<T extends string | number>({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
  className = "",
  buttonClassName = "",
  listClassName = "",
}: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  useDismiss(open, ref, () => setOpen(false));

  // mantém a opção ativa visível (listas longas, ex.: anos)
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList();
        else setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <span
        id={`${id}-label`}
        className={hideLabel ? "sr-only" : fieldLabelClass}
      >
        {label}
      </span>
      <button
        id={`${id}-button`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-labelledby={`${id}-label`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${fieldClass} w-full justify-between text-left ${
          open ? "border-ember-400 ring-4 ring-ember-400/20" : ""
        } ${buttonClassName}`}
      >
        <span className="truncate">{options[selectedIndex]?.label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
          className={`pop-in absolute inset-x-0 top-full z-40 mt-1.5 max-h-60 overflow-auto [color-scheme:dark] rounded-xl border border-space-600 bg-space-900 p-1 shadow-[0_18px_50px_rgba(0,0,0,0.6)] ${listClassName}`}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-opt-${i}`}
              role="option"
              data-index={i}
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-3 text-base leading-6 ${
                i === active ? "bg-space-800" : ""
              } ${o.value === value ? "font-bold text-ember-400" : "text-ink-100"}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && (
                <span aria-hidden="true" className="text-caption">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## `src/components/ui/toggle.tsx`
Toggle switch

```tsx
"use client";

import { useId } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-space-600 p-3">
      <span className="flex flex-col">
        <span id={`${id}-label`} className="text-small font-semibold">
          {label}
        </span>
        {description && (
          <span id={`${id}-desc`} className="text-caption text-ink-300">
            {description}
          </span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
          checked ? "border-ember-400 bg-ember-400" : "border-space-600 bg-space-700"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
```

## `src/components/feedback/empty-state.tsx`
Estado vazio

```tsx
import type { ReactNode } from "react";

export function EmptyState({
  title = "Nenhum dado encontrado",
  description = "Não há detecções para os filtros selecionados. Tente ampliar o período ou mudar o satélite.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-space-600 bg-space-900 p-10 text-center"
    >
      <span aria-hidden className="text-3xl">
        ∅
      </span>
      <h2 className="font-display text-h2 font-bold">{title}</h2>
      <p className="max-w-prose text-ink-300">{description}</p>
      {action}
    </div>
  );
}
```

## `src/components/feedback/error-state.test.tsx`


```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

describe("ErrorState (RN05 / CA04 da Home)", () => {
  it("anuncia o erro como alerta, com título e mensagem", () => {
    render(<ErrorState title="Falhou" message="Tente de novo." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Falhou");
    expect(alert).toHaveTextContent("Tente de novo.");
  });

  it("oferece nova tentativa quando há onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("não mostra o botão quando o erro não é recuperável", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("usa textos padrão em português", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os dados",
    );
  });
});
```

## `src/components/feedback/error-state.tsx`
Estado de erro com botão Tentar novamente

```tsx
"use client";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Não foi possível carregar os dados",
  message = "Verifique sua conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-fire-500/60 bg-space-900 p-5 text-center"
    >
      <p className="font-display text-lg font-bold text-ink-100">{title}</p>
      <p className="mt-1 text-small text-ink-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-fire-500 px-4 py-2 text-small font-semibold text-white hover:bg-fire-400"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
```

## `src/components/feedback/loading-state.tsx`
Estado de carregamento

```tsx
export function LoadingState({
  label = "Carregando dados…",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-space-600 bg-space-900 p-10 text-center"
    >
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-4 border-space-600 border-t-ember-400"
      />
      <p className="text-ink-100">{label}</p>
    </div>
  );
}
```

## `src/lib/utils/cn.ts`
cn() — clsx + tailwind-merge

```ts
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
```

