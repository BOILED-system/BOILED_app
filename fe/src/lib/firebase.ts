import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAzngGng0ZJ4VZyM7l9dc9Jp0T1zP2P6LM",
  authDomain: "boiled-app-bb43e.firebaseapp.com",
  projectId: "boiled-app-bb43e",
  storageBucket: "boiled-app-bb43e.firebasestorage.app",
  messagingSenderId: "742645927524",
  appId: "1:742645927524:web:d2c9d30742b400e96c9971",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
