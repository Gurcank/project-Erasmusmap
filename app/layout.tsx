import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "./providers";
import { Analytics } from "@vercel/analytics/next"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className="bg-gray-50 dark:bg-gray-950 transition-colors duration-300 overflow-x-hidden">
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
