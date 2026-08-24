import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/components/i18n/provider";
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
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ar = locale !== "fr";
  return {
    metadataBase: new URL("https://neimaa.carbtrim.online"),
    title: ar ? "منصة نعمة — إدارة الجمعيات" : "Plateforme Nima — gestion d'associations",
    description: ar
      ? "نظام إدارة الجمعيات المغربية ودور حفظ القرآن: الأعضاء، الحضور، المالية، المشاريع والحالات الاجتماعية."
      : "Gestion des associations marocaines et écoles coraniques : adhérents, présence, finances, projets et dossiers sociaux.",
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
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
