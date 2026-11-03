"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

const inputBase =
  "w-full rounded-lg border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
        {required ? <span className="ml-0.5 text-warn">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} min-h-24 resize-y ${props.className ?? ""}`}
    />
  );
}

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  searchPlaceholder?: string;
};

function optionText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  if (isValidElement(node)) {
    return optionText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function readOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === Fragment) {
      options.push(
        ...readOptions((child.props as { children?: ReactNode }).children),
      );
      return;
    }

    if (child.type !== "option") return;

    const props = child.props as {
      children?: ReactNode;
      disabled?: boolean;
      value?: string | number | readonly string[];
    };
    const label = optionText(props.children);
    const rawValue = props.value;
    const value =
      rawValue === undefined
        ? label
        : Array.isArray(rawValue)
          ? rawValue.join(",")
          : String(rawValue);

    options.push({ value, label, disabled: Boolean(props.disabled) });
  });

  return options;
}

/**
 * A select control with a searchable list. The native select stays in the DOM
 * so required validation and form attributes keep working, while the visible
 * control is a button with a searchable popover.
 */
export function Select({
  children,
  className = "",
  value,
  defaultValue,
  onChange,
  disabled = false,
  required = false,
  name,
  id,
  searchPlaceholder = "Search…",
  ...rest
}: SelectProps) {
  const options = useMemo(() => readOptions(children), [children]);
  const currentValue =
    value !== undefined
      ? String(value)
      : defaultValue !== undefined
        ? String(defaultValue)
        : "";
  const selectedOption = options.find(
    (option) => option.value === currentValue,
  );
  const displayLabel = selectedOption?.label ?? currentValue;
  const isPlaceholder = currentValue.length === 0;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(term),
    );
  }, [options, query]);

  const activeIndex =
    filteredOptions.length === 0
      ? -1
      : Math.min(highlightedIndex, filteredOptions.length - 1);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const padding = 8;
    const width = Math.min(
      Math.max(rect.width, 220),
      window.innerWidth - padding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, padding),
      window.innerWidth - width - padding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      140,
      Math.min(320, openUp ? spaceAbove : spaceBelow),
    );

    setMenuStyle({
      position: "fixed",
      left,
      width,
      maxHeight,
      zIndex: 1000,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, []);

  function openMenu() {
    if (disabled) return;

    setQuery("");
    const selectedIndex = options.findIndex(
      (option) => option.value === currentValue,
    );
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    updatePosition();
    setOpen(true);
  }

  function choose(option: SelectOption) {
    if (option.disabled) return;

    if (option.value !== currentValue) {
      onChange?.({
        target: { value: option.value, name: name ?? "" },
        currentTarget: { value: option.value, name: name ?? "" },
      } as unknown as ChangeEvent<HTMLSelectElement>);
    }

    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex(Math.min(activeIndex + 1, filteredOptions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredOptions.length === 0) return;
      setHighlightedIndex(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    const handlePositionChange = () => updatePosition();
    window.addEventListener("resize", handlePositionChange);
    window.addEventListener("scroll", handlePositionChange, true);

    return () => {
      window.removeEventListener("resize", handlePositionChange);
      window.removeEventListener("scroll", handlePositionChange, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className={`${inputBase} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span
          className={`truncate ${isPlaceholder ? "text-muted" : "text-ink"}`}
        >
          {displayLabel || "Select…"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <select
        {...rest}
        name={name}
        value={currentValue}
        onChange={() => {}}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      >
        {options.map((option, index) => (
          <option
            key={`${option.value}-${index}`}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
            >
              <div className="border-b border-line p-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Search options"
                    aria-controls={listboxId}
                    aria-activedescendant={
                      activeIndex >= 0
                        ? `${listboxId}-option-${activeIndex}`
                        : undefined
                    }
                    className="w-full rounded-md border border-line bg-canvas py-2 pl-8 pr-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                className="min-h-0 flex-1 overflow-y-auto py-1"
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted">
                    No results found.
                  </li>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = option.value === currentValue;
                    const isActive = index === activeIndex;

                    return (
                      <li
                        key={`${option.value}-${index}`}
                        id={`${listboxId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled}
                        data-option-index={index}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => choose(option)}
                        className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${
                          option.disabled
                            ? "cursor-not-allowed text-muted opacity-60"
                            : isActive
                              ? "bg-canvas-2 text-ink"
                              : "text-ink hover:bg-canvas"
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected ? (
                          <Check
                            className="h-4 w-4 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

type ButtonVariant = "primary" | "navy" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-light focus:ring-primary/30",
  navy: "bg-navy text-white hover:bg-navy-deep focus:ring-navy/30",
  secondary:
    "bg-card border border-line text-ink hover:bg-canvas-2 focus:ring-primary/20",
  ghost: "text-muted hover:bg-canvas-2 hover:text-ink",
  danger: "bg-warn-bg text-warn border border-warn/20 hover:bg-warn-bg/70",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-sm",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]} ${sizes[size]} ${className}`}
    />
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-line bg-card ${className}`}>
      {children}
    </div>
  );
}