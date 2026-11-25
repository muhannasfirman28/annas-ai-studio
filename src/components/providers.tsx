"use client";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from "./ui";
import { ShopProvider } from "./shop-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ToastProvider><ShopProvider>{children}</ShopProvider></ToastProvider>
    </ThemeProvider>
  );
}
