import type { Metadata } from "next";
import { adminFontVariables } from "@/lib/fonts";
import "@/styles/fa-tokeny.css";
import "./admin.css";

export const metadata: Metadata = {
  title: {
    default: "Administrace - FLY America",
    template: "%s - Administrace FLY America",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${adminFontVariables} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
