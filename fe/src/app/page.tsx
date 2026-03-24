"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/firestore";

export default function Home() {
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!memberId.trim()) return;
    setLoading(true);
    setError("");

    try {
      const user = await getUser(memberId);

      if (!user) {
        setError("会員番号が見つかりません。確認してもう一度試してください。");
        return;
      }

      localStorage.setItem("memberId", memberId);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      router.push("/profile");
    } catch (e) {
      setError("ログインに失敗しました。もう一度試してください。");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">BOILED</h1>
      <p className="text-gray-400">会員番号を入力してログイン</p>
      <input
        type="text"
        placeholder="会員番号（例：16199）"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        className="bg-gray-800 text-white px-4 py-3 rounded-lg w-72 text-center text-lg"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={handleLogin}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg text-lg font-bold"
      >
        {loading ? "ログイン中..." : "ログイン"}
      </button>
    </div>
  );
}
