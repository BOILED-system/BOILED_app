import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyAzngGng0ZJ4VZyM7l9dc9Jp0T1zP2P6LM",
  authDomain: "boiled-app-bb43e.firebaseapp.com",
  projectId: "boiled-app-bb43e",
  storageBucket: "boiled-app-bb43e.firebasestorage.app",
  messagingSenderId: "742645927524",
  appId: "1:742645927524:web:d2c9d30742b400e96c9971",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const csv = readFileSync('./members.csv', 'utf-8');
const lines = csv.trim().split('\n').slice(1); // ヘッダーをスキップ

const GENRES = ['', 'Break', 'Girls', 'Hiphop', 'House', 'Lock', 'Pop', 'Waack'];

for (const line of lines) {
  const [memberId, generation, genre, name, furigana] = line.split('\t').map(s => s.trim());
  if (!memberId) continue;

  const genreNum = parseInt(memberId.slice(-3, -2));
  const number = memberId.slice(-2);

  await setDoc(doc(db, 'users', memberId), {
    memberId,
    generation: parseInt(generation),
    genre,
    name,
    furigana,
    number,
    role: 'member',
    updatedAt: new Date(),
  }, { merge: true });

  console.log(`登録: ${memberId} ${name}`);
}

console.log('完了！');
