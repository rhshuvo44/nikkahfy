import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Nikkahfy — Create beautiful digital wedding invitations",
    template: "%s · Nikkahfy",
  },
  description:
    "Design, publish and share a beautiful digital wedding invitation. Collect RSVPs and wishes from your guests in minutes — no coding required.",
  applicationName: "Nikkahfy",
  openGraph: {
    type: "website",
    siteName: "Nikkahfy",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
