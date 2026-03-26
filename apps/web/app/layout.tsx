import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestor Legal",
  description: "Plataforma SaaS para gestão de processos jurídicos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
