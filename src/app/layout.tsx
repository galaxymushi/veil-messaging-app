import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VEIL — Private Peer-to-Peer Messaging",
  description: "Private, ephemeral, peer-to-peer messaging with zero cloud chat storage.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f7f9] text-gray-900 antialiased">{children}</body>
    </html>
  );
}
