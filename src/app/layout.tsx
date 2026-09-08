import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cairo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/components/i18n/provider";
import { SWRegister } from "@/components/pwa/sw-register";
import { getLocale } from "@/lib/i18n/server";
import { isRtl } from "@/lib/i18n/config";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#16a34a",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ar = locale !== "fr";
  // Resolve metadataBase from the request Host so OpenGraph/Twitter cards
  // on a tenant subdomain point at the tenant, not the platform apex.
  let origin = `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "neimaa.carbtrim.online"}`;
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) origin = `https://${host}`;
  } catch {
    // headers() not available (build step / static generation).
  }
  return {
    metadataBase: new URL(origin),
    title: ar ? "منصة نعمة — إدارة الجمعيات" : "Plateforme Nima — gestion d'associations",
    description: ar
      ? "نظام إدارة الجمعيات المغربية ودور حفظ القرآن: الأعضاء، الحضور، المالية، المشاريع والحالات الاجتماعية."
      : "Gestion des associations marocaines et écoles coraniques : adhérents, présence, finances, projets et dossiers sociaux.",
    manifest: "/manifest.json",
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"} className={`${cairo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-cairo antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <I18nProvider locale={locale}>
            {children}
            <Toaster position="top-center" />
            <SWRegister />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
