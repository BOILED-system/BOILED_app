import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { UserProvider } from "@/components/providers/UserContext";

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
        <UserProvider>
          <Header />
          <main className="pt-24 pb-24 md:pb-16 px-4 md:px-6 min-h-screen">
            {children}
          </main>
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  );
}
