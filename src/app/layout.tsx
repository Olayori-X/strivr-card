import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Strivr Card Folder",
  description: "Your business cards, always with you.",
  icons: { icon: "/icons/favicon-32.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F74BA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Chrome fires beforeinstallprompt once, early. Keep it so the Add button still works if React loads later. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__strivrInstall=null;" +
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__strivrInstall=e;});" +
              "window.addEventListener('appinstalled',function(){window.__strivrInstall=null;});",
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
