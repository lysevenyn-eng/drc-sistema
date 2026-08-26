import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRC — Dorper Rebanho Carvalho",
  description: "Sistema de gestão do rebanho Dorper — DRC",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-drc-cream-100 text-foreground">
        {children}
      </body>
    </html>
  );
}
