import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
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

// Runs before first paint so a visitor who chose the light theme never sees a
// dark flash. Mirrors ThemeToggle's rule: dark unless "light" was stored.
const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("theme")!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="overflow-x-hidden antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
