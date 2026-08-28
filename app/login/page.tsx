"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

function ErrorMessage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(err);
  }, [searchParams]);

  if (!error) return null;
  return <p className="text-sm text-bac-score-rojo">{error}</p>;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bac-gray-alt px-4">
      <div className="w-full max-w-sm rounded-xl border border-bac-gray-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image src="/logo-bac.jpg" alt="BAC Legal Advisor" width={200} height={55} className="h-12 w-auto object-contain mx-auto mb-3" priority />
          <p className="mt-1 text-sm text-bac-gray-text">Ingresa con tu cuenta</p>
        </div>

        <form action="/api/auth/login" method="POST" className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Correo</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="off"
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red"
              placeholder="admin@bac.ec"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              className="w-full rounded-lg border border-bac-gray-border px-3 py-2 text-sm outline-none focus:border-bac-red focus:ring-1 focus:ring-bac-red"
              placeholder="••••••••"
            />
          </div>

          <Suspense>
            <ErrorMessage />
          </Suspense>

          <button
            type="submit"
            className="w-full rounded-lg bg-bac-red py-2 text-sm font-medium text-white transition hover:bg-bac-red-dark disabled:opacity-60"
          >
            Ingresar
          </button>
        </form>
      </div>
      <span className="mt-6 text-[11px] text-gray-400/70 select-none tracking-wide">
        Developed by © Kappa-ai.com
      </span>
    </div>
  );
}
