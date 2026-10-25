import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Variable width axis powers the expanded display type (.font-display)
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Pantry | Command Center",
  description: "A modern pantry workspace for tracking sessions and market items.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Pantry",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF2FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1430" },
  ],
};

import { ThemeProvider } from "@/components/theme-provider";
import ForcePasswordChangeHandler from "@/components/auth/ForcePasswordChangeHandler";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="pantry-theme"
        >
          <ForcePasswordChangeHandler />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
