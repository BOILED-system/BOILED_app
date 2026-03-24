import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

// ユーザー取得
export async function getUser(memberId: string) {
  const ref = doc(db, "users", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// ユーザー作成・更新
export async function saveUser(
  memberId: string,
  data: {
    name: string;
    role: "admin" | "member";
  },
) {
  const ref = doc(db, "users", memberId);
  await setDoc(
    ref,
    {
      memberId,
      ...data,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

// 全ユーザー取得
export async function getAllUsers() {
  const ref = collection(db, "users");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => d.data());
}
