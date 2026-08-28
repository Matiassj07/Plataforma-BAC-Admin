"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "rat_banner_oculto";

export function RatBanner({ tieneRat }: { tieneRat: boolean }) {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "true") {
      setOculto(true);
    }
  }, []);

  if (tieneRat || oculto) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-bac-gray-alt px-4 py-2 text-sm text-bac-gray-text">
      <span className="flex items-center gap-2">
        <span>💡</span>
        <span>Para comenzar, completa tu RAT — es el punto de partida de tu cumplimiento LOPDP.</span>
      </span>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded bg-bac-red px-3 py-1 text-xs font-medium text-white hover:bg-bac-red-dark"
        >
          Ir al RAT →
        </Link>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(STORAGE_KEY, "true");
            setOculto(true);
          }}
          className="text-bac-gray-text hover:text-gray-500"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
