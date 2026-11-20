import type { Metadata, Viewport } from "next";
import "@fontsource-variable/figtree";
import "@fontsource-variable/parkinsans";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./demo.css";
import { DemoHeader } from "@demo/components/demo-header";
import { DemoFooter } from "@demo/components/demo-footer";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: { default: "Just Once · Rent from people you already trust", template: "%s · Just Once" },
  description:
    "A peer-to-peer rental marketplace that starts with communities: borrow outfits, cameras and kit from verified classmates and colleagues. Portfolio demo of an AI Cup project.",
  applicationName: "Just Once",
  icons: { icon: `${base}/icon-192.png`, apple: `${base}/icon-192.png` },
  robots: { index: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <DemoHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <DemoFooter />
      </body>
    </html>
  );
}
