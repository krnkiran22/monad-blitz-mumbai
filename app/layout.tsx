import type { Metadata } from "next";
import { Geist_Mono, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "BGMI — Battle Ground Monad India",
  description: "3 autonomous AI agents battle to the death. Bet MON on the winner. Payouts settle on Monad in 400ms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} antialiased text-white h-screen overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
