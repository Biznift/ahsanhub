"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children, theme = "system" }: { children: ReactNode; theme?: "light" | "dark" | "system" }) {
  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
