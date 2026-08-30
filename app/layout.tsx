import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import GlobeBackground from "@/components/ui/GlobeBackground";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Body face: neutral, high legibility at small sizes via its optical-size axis.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Display face: tighter, more characterful letterforms so headings carry the
// site's identity instead of reading as another default grotesque. Both ship
// latin-ext, which is what covers ı İ ğ Ş ç ö ü.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
});

// Runs before first paint so nobody sees the wrong theme flash. Mirrors
// lib/theme.ts: an explicit "light" or "dark" wins, anything else — including a
// first visit — follows the operating system.
// Delivered through next/script's beforeInteractive strategy: Next injects it
// into the document head ahead of hydration, and React does not warn about a
// raw inline <script> the way it does for one rendered as an element.
const THEME_INIT_SCRIPT = `(function(){var c="system";try{var s=localStorage.getItem("theme");if(s==="light"||s==="dark")c=s}catch(e){}var d=c==="dark"||(c==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"})()`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Avrupa'yı Erasmus öğrencilerinden dinle`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  appleWebApp: {
    title: SITE_NAME,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set per request by proxy.ts. Reading it here is also what opts every route
  // into dynamic rendering, which a nonce requires: a statically generated page
  // is built without a request, so its scripts would carry a nonce from build
  // time that no later response header matches.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="tr"
      className={`${inter.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="overflow-x-hidden antialiased">
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {THEME_INIT_SCRIPT}
        </Script>
        <GlobeBackground />
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
