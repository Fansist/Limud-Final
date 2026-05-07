import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Limud — Every Mind Learns Differently",
  description:
    "Adaptive learning for U.S. K-12. Same assessment for every student. Personalized teaching for each one. More time, less stress for everyone.",
  applicationName: "Limud"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
