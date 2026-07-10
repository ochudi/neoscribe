import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
  "NeoScribe records a consultation, transcribes it on your device, and turns it into a structured clinical note you can edit and export to PDF, Word, or Markdown. Cloud or in-browser models, your call.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NeoScribe · AI clinical scribe",
    template: "%s · NeoScribe",
  },
  description,
  applicationName: "NeoScribe",
  authors: [{ name: "NeoScribe" }],
  creator: "NeoScribe",
  publisher: "NeoScribe",
  keywords: [
    "clinical NLP",
    "medical extraction",
    "AI scribe",
    "NeoScribe",
    "on-device AI",
    "WebGPU",
    "Llama",
    "Qwen",
    "Gemma",
  ],
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "NeoScribe",
    title: "NeoScribe · AI clinical scribe",
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeoScribe · AI clinical scribe",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Warm the connection to the API origin before the first query fires.
// React hoists these into <head>.
const apiOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_BASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://ixgdjomuyvlajdtaqlzd.supabase.co"
    ).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {apiOrigin ? <link rel="preconnect" href={apiOrigin} /> : null}
        <ThemeProvider>
          <AuthProvider>
            <QueryProvider>
              {children}
              <Toaster />
            </QueryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
