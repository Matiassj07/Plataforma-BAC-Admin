import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAC — Plataforma de cumplimiento LOPDP",
  description: "Plataforma de administración y cumplimiento de BAC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white antialiased">{children}</body>
    </html>
  );
}
