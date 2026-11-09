import type { Metadata } from "next";
import "./globals.css";
// The reading position bars, the reference routes and the translate panel each
// keep their own stylesheet, so the shell is one import list, not one long file.
import "./globals-reading.css";
import "./globals-embed.css";
import "./globals-translate.css";
// Loaded last: the 2026-11-09 visual refresh, tokens only.
import "./globals-refresh.css";

export const metadata: Metadata = {
  title: "ScrollyTale · The Sealed Garden",
  description: "An inquiry layer for the HKIS Biology reader",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* The reader's own content styles, scoped to the pulled section by the
            route. One styleguide, not a copy of it. */}
        <link rel="stylesheet" href="/api/reader-css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
