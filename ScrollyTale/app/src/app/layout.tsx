import type { Metadata } from "next";
import "./globals.css";

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
