import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Pro Comparison",
  description: "Compare SEO factors across multiple URLs side by side",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
