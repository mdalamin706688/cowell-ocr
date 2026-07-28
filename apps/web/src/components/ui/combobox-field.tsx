"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id?: string;
  label: string;
  meta?: ReactNode;
}

interface ComboboxFieldProps {
  id?: string;
  value: string;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
  onCommit?: (value: string) => void;
  emptyMessage?: string;
  matchKey?: (option: ComboboxOption, value: string) => boolean;
}

interface MenuRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

function defaultMatch(option: ComboboxOption, value: string): boolean {
  return option.label.toLowerCase() === value.trim().toLowerCase();
}

/**
 * Input + suggestion list rendered via portal so it is never clipped by
 * collapsible cards / overflow parents (standard combobox pattern).
 */
export function ComboboxField({
  id,
  value,
  options,
  placeholder,
  disabled,
  className,
  onChange,
  onSelect,
  onCommit,
  emptyMessage = "候補がありません",
  matchKey = defaultMatch,
}: ComboboxFieldProps) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<MenuRect | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => setMounted(true), []);

  const updateRect = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    const spaceAbove = r.top - gap - 12;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setRect({
      top: openUp ? r.top - gap : r.bottom + gap,
      left: r.left,
      width: r.width,
      maxHeight,
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    const onReposition = () => updateRect();
    window.addEventListener("resize", onReposition);
    // capture scroll from any scrollable ancestor
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = value.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(value.trim().toLowerCase()))
    : options;

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(-1);
  };

  const choose = (option: ComboboxOption) => {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openMenu();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        choose(filtered[activeIndex]);
      } else {
        onCommit?.(value);
        setOpen(false);
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const menu =
    mounted &&
    open &&
    rect &&
    createPortal(
      <div
        ref={menuRef}
        id={listboxId}
        role="listbox"
        style={{
          position: "fixed",
          top: rect.openUp ? undefined : rect.top,
          bottom: rect.openUp ? window.innerHeight - rect.top : undefined,
          left: rect.left,
          width: rect.width,
          maxHeight: rect.maxHeight,
          zIndex: 80,
        }}
        className="overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      >
        <div className="overflow-y-auto p-1" style={{ maxHeight: rect.maxHeight }}>
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">{emptyMessage}</p>
          ) : (
            filtered.map((opt, index) => {
              const selected = matchKey(opt, value);
              const active = index === activeIndex;
              return (
                <button
                  key={`${opt.id || ""}-${opt.label}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    // prevent input blur before click
                    e.preventDefault();
                  }}
                  onClick={() => choose(opt)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    active || selected ? "bg-lumen/10" : "hover:bg-muted/50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {opt.meta}
                  {selected && <Check className="h-3.5 w-3.5 shrink-0 text-lumen" />}
                </button>
              );
            })
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={triggerRef} className={cn("relative", className)}>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="h-10 pr-9"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) openMenu();
        }}
        onFocus={openMenu}
        onBlur={() => onCommit?.(value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
        aria-label="候補を表示"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {menu}
    </div>
  );
}
