import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import 'leaflet/dist/leaflet.css';
import "./globals.css";
import RouteAnnouncer from "@/components/layout/RouteAnnouncer";
import GoogleTranslateLoader from "@/components/layout/GoogleTranslateLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// preload: false (PERF 2026-09-29) — the mono face is only used for small
// <kbd> shortcut hints, so it shouldn't compete with the body font and page
// data as a high-priority preload on every page. It still loads (swap) the
// first time a <kbd> renders.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata = {
  title: "Community Health Profiles · NYC",
  description: "Health indicators for all 59 NYC community districts, from the NYC Department of Health and Mental Hygiene.",
};

// viewport-fit=cover lets env(safe-area-inset-*) values work correctly on
// iPhones with a home indicator so fixed elements don't clip into the notch/bar.
export const viewport = {
  width:       'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-brand="chp"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="icon"
          type="image/x-icon"
          href="https://www.nyc.gov/favicon.ico"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Skip navigation — first focusable element; visible only on focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-blue-700 focus:font-medium focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-500 focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Announces client-side route changes to screen readers — see
            RouteAnnouncer.jsx for why this is needed (Next.js App Router
            navigation doesn't trigger a fresh document read). */}
        <RouteAnnouncer />

        {children}

        {/* Google Translate — init callback defined inline so it runs before the script */}
        <Script id="google-translate-init" strategy="beforeInteractive">{`
          function googleTranslateElementInit() {
            new google.translate.TranslateElement({
              pageLanguage: 'en',
              includedLanguages: 'es,zh-CN,ru,it,ht,bn,yi,ko,ar,fr,pl,ur,pt',
              autoDisplay: false,
            }, 'google_translate_element');
          }
        `}</Script>
        {/* Loaded only when a non-English language is active (googtrans
            cookie) — see GoogleTranslateLoader.jsx. */}
        <GoogleTranslateLoader />
      </body>
    </html>
  );
}
