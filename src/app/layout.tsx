import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "Annas AI Studio", template: "%s · Annas AI Studio" },
  description: "AI Company Management Dashboard — Innovating Technology, Empowering the Future.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body style={{ fontFamily: "'Inter Variable', Inter, system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
