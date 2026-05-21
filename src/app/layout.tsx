import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://neoscribe.vercel.app";

const description =
  "AI clinical documentation playground from Plural Health — compare models, inspect extractions, and ship faster than your differential.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NeoScribe — Plural Health",
    template: "%s · NeoScribe",
  },
  description,
  applicationName: "NeoScribe",
  authors: [{ name: "Plural Health" }],
  creator: "Plural Health",
  publisher: "Plural Health",
  keywords: [
    "clinical NLP",
    "medical extraction",
    "AI scribe",
    "Plural Health",
    "NeoScribe",
    "MedGemma",
    "Qwen",
    "Gemma",
  ],
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "NeoScribe",
    title: "NeoScribe — Plural Health",
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeoScribe — Plural Health",
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
