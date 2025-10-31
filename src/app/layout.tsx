import type { Metadata } from "next";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type { Locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("common");
  const tagline = t("appTagline");
  return {
    title: `${t("appName")} - ${tagline}`,
    description: tagline,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <LocaleProvider locale={locale} messages={messages}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
