import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://neimaa.carbtrim.online"),
  title: "جمعية النعمة - مكناس",
  description: "مؤسسة خلصة في التنمية الاجتماعية ورعاية الأيتام وكذا التنمية الثقافية والفنية",
  openGraph: {
    title: "جمعية النعمة - مكناس",
    description: "مؤسسة خلصة في التنمية الاجتماعية ورعاية الأيتام وكذا التنمية الثقافية والفنية",
    url: "https://neimaa.carbtrim.online",
    siteName: "جمعية النعمة",
    images: [
      {
        url: "/logo.jpg",
        width: 1000,
        height: 1000,
        alt: "جمعية النعمة - مكناس",
      },
    ],
    locale: "ar_MA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-cairo antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
