import type { Metadata } from "next";
import { Manrope, Vazirmatn } from "next/font/google";

import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-en",
});

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-fa",
});

export const metadata: Metadata = {
  title: "AiHost",
  description: "AI chat platform with role-based control panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${manrope.variable} ${vazirmatn.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
