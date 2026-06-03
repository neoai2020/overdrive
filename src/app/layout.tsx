import type { Metadata } from "next";
import { Anton, Archivo, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display-load" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-load" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-load" });

export const metadata: Metadata = {
  title: "Overdrive — More Winners. More ROAS.",
  description: "The creative engine for Direct Response media buyers. 50+ hyper-realistic UGC, b-roll and testimonial ads — built in bulk and pushed straight into your Meta campaigns.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${geistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
