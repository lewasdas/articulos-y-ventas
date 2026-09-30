import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Pulse — Daily AI & Tech Insights",
  description:
    "Daily articles about AI tools, technology trends, and practical guides for 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800">
          <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-white hover:text-violet-400 transition-colors">
              ⚡ AI Pulse
            </a>
            <span className="text-xs text-gray-500 uppercase tracking-widest">
              Daily AI & Tech
            </span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
        <footer className="border-t border-gray-800 mt-20">
          <div className="max-w-3xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} AI Pulse. Powered by Claude AI.
          </div>
        </footer>
      </body>
    </html>
  );
}
