import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Condensed } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Receipt lines are set in mono so prices line up like a printed tape
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
    { media: "(prefers-color-scheme: light)", color: "#3A3936" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
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
      className={`${plexCondensed.variable} ${plexMono.variable} h-full antialiased`}
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
