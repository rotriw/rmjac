import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rmjac",
  description: "Let us code here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
