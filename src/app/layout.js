import { Geist, Geist_Mono } from "next/font/google";
import 'leaflet/dist/leaflet.css';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip navigation — first focusable element; visible only on focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-blue-700 focus:font-medium focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-500 focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
