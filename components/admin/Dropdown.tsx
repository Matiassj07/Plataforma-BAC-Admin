"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function Dropdown({
  trigger,
  align = "right",
  children,
}: {
  trigger: (open: boolean) => React.ReactNode;
  align?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      left: align === "right" ? rect.right - 256 : rect.left,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  return (
    <div ref={triggerRef}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1">
        {trigger(open)}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: Math.max(8, pos.left), zIndex: 50 }}
          className="w-64 overflow-hidden rounded-lg border border-bac-gray-border bg-white py-1 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>,
        document.body
      )}
    </div>
  );
}
