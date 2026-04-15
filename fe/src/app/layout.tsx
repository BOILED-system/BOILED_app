import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "BOILED | 活動管理",
  description: "BOILEDのサークル活動を効率的に管理",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-black">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
