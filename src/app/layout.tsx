import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "St George Bakery - Order Management",
  description: "B2B Bakery Order Management Portal for wholesale customers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
