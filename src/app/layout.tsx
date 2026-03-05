import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { MobileGate } from "@/components/mobile-gate/mobile-gate";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ultramail",
  description: "Microservicio privado de envío de emails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${ibmSans.variable} ${ibmMono.variable}`}>
        <MobileGate>{children}</MobileGate>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
