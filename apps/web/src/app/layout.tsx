import type { Metadata } from "next";
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LoadBearing — Care shared fairly",
  description: "Care shared fairly. Nothing falls between people. A simulated Alexa+ surface with Follow-the-Sun routing and 3D Twilight Globe.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" type="image/png" href="/logo.png?v=2" />
        <link rel="shortcut icon" type="image/png" href="/logo.png?v=2" />
        <link rel="apple-touch-icon" href="/logo.png?v=2" />
      </head>
      <body className="min-h-full flex flex-col bg-[#14182B] text-[#EDEAF6]">
        {children}
      </body>
    </html>
  );
}
