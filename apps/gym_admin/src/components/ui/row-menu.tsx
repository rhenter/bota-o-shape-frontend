"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

export interface RowAction {
  label: string;
  href?: string;
  danger?: boolean;
  onSelect?: () => void;
}

export function RowMenu({
  label,
  actions,
}: {
  label: string;
  actions: RowAction[];
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div className="row-menu">
      <button
        type="button"
        className="row-menu-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const width = 210;
          setPosition({
            top: rect.bottom + 4,
            left: Math.max(
              8,
              Math.min(rect.right - width, window.innerWidth - width - 8),
            ),
          });
          setOpen(true);
        }}
      >
        ⋮
      </button>
      {open && position && (
        <>
          <button
            type="button"
            className="row-menu-scrim"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            className="row-menu-dropdown"
            role="menu"
            style={{ top: position.top, left: position.left }}
          >
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  className={action.danger ? "is-danger" : undefined}
                  onClick={() => {
                    setOpen(false);
                    action.onSelect?.();
                  }}
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
