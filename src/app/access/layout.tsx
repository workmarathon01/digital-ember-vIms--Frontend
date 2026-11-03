import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Visitor Pass | VisiTrack",
  description: "View your visitor pass, QR code and validity window.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VisitorPassLayout({ children }: { children: ReactNode }) {
  return children;
}
