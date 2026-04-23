"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUser,
  getUpcomingUnregisteredSessions,
  getMyUnpaidSettlements,
} from "@/lib/api";
import type { PracticeSession, Settlement } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<{
    name: string;
    genre: string;
    generation: number;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [unregistered, setUnregistered] = useState<PracticeSession[]>([]);
  const [unpaidSettlements, setUnpaidSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    const memberId = localStorage.getItem("memberId");
    if (!memberId) { window.location.href = "/"; return; }

    getUser(memberId).then((u) => {
      if (!u) { window.location.href = "/"; return; }
      setUser(u as any);
      setLoading(false);

      // 非同期で通知データを並行取得
      Promise.all([
        getUpcomingUnregisteredSessions(memberId),
        getMyUnpaidSettlements(memberId),
      ]).then(([sessions, settlements]) => {
        setUnregistered(sessions);
        setUnpaidSettlements(settlements);
      }).catch(console.error);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const totalAlerts = unregistered.length + unpaidSettlements.length;

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-6">
      {/* プロフィールカード */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-xl font-bold text-blue-300">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{user?.name}</h1>
            <p className="text-white/50 text-sm mt-0.5">
              {user?.generation}代 {user?.genre}
            </p>
            {user?.role === "admin" && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mt-1 inline-block">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 通知エリア */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {totalAlerts > 0 ? `要対応 (${totalAlerts})` : '通知'}
        </h2>

        {totalAlerts === 0 ? (
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-8 text-center">
            <p className="text-white/30 text-sm">現在対応が必要なものはありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 出欠未登録 */}
            {unregistered.map(session => (
              <Link
                key={session.id}
                href={`/practices/project/${encodeURIComponent(session.name)}`}
                className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 hover:bg-yellow-500/15 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-yellow-400 uppercase tracking-wide">出欠未登録</p>
                  <p className="text-sm text-white/80 mt-0.5 truncate">{session.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {session.date} {session.startTime}
                    {session.location && ` · ${session.location}`}
                  </p>
                </div>
                <span className="text-yellow-400/60 text-xs ml-3 group-hover:text-yellow-400 transition-colors shrink-0">登録 →</span>
              </Link>
            ))}

            {/* 未払い精算 */}
            {unpaidSettlements.map(s => {
              const isOverdue = new Date(s.dueDate) < new Date();
              return (
                <Link
                  key={s.id}
                  href="/payments"
                  className={`flex items-center justify-between rounded-xl p-4 transition-colors group border ${isOverdue ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-medium uppercase tracking-wide ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                      {isOverdue ? '期限超過・未払い' : '未払い'}
                    </p>
                    <p className="text-sm text-white/80 mt-0.5 truncate">{s.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {s.createdByName} より · 期限 {s.dueDate}
                    </p>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                      ¥{s.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-0.5 group-hover:opacity-100 opacity-60 transition-opacity ${isOverdue ? 'text-red-400' : 'text-orange-400'}`}>支払い →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
