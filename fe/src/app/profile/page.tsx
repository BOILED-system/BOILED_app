"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/firestore";

interface AlertItem {
  type: "rsvp" | "payment";
  eventTitle: string;
  subTitle?: string;
  amount?: number;
  link: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<{
    name: string;
    genre: string;
    generation: number;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const memberId = localStorage.getItem("memberId");
    if (!memberId) {
      window.location.href = "/";
      return;
    }
    getUser(memberId).then((u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }
      setUser(u as any);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* プロフィールカード */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-300">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{user?.name}</h1>
                <p className="text-white/50 text-sm mt-1">
                  {user?.generation} {user?.genre}
                </p>
                {user?.role === "admin" && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mt-1 inline-block">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* アクション */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider pl-1">
            アクション
          </h2>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-8 text-center">
            <p className="text-white/50 text-sm">
              現在対応が必要なものはありません
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
