"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDismiss } from "@/hooks/use-dismiss";

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
        className={hideLabel ? "sr-only" : "mb-1 block text-small text-ink-300"}
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
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-space-900 px-3 py-2.5 text-left text-small text-ink-100 transition-colors ${
          open ? "border-ember-400" : "border-space-600 hover:border-ink-300"
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
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-small ${
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
