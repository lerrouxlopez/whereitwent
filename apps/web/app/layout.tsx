import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WIW : Where It Went",
  description: "A simple, thoughtful personal budgeting app that shows where it went.",
  openGraph: {
    title: "WIW : Where It Went",
    description: "A simple, thoughtful personal budgeting app that shows where it went.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WIW : Where It Went",
    description: "A simple, thoughtful personal budgeting app that shows where it went.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
