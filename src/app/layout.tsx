import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Inter via next/font — preloaded so it paints before the system
// fallback. Variable weight 300-900 covers everything from body
// (400) through hero (800/900). font-display: swap is implied.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"]
});

export const metadata: Metadata = {
  title: "Limud — Every Mind Learns Differently",
  description:
    "Adaptive learning for U.S. K-12. Same assessment for every student. Personalized teaching for each one. More time, less stress for everyone.",
  applicationName: "Limud",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "#ffffff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              boxShadow:
                "0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.08)",
              fontSize: "14px"
            }
          }}
        />
      </body>
    </html>
  );
}
