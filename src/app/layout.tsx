import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFooter, SiteNav } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "cshelper",
  description: "small cs2 helper for friends: maps + lineups",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scheme-dark">
      <body className="min-h-full flex flex-col bg-stone-950 text-stone-100 antialiased">
        <SiteNav />
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
