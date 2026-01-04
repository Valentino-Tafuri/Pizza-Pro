import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Ensure all values are correctly filled from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyARrF_NeAfAsOqyHIMTlpSkNupaDZFOsao",
  authDomain: "pizza-pro-tafuri.firebaseapp.com",
  projectId: "pizza-pro-tafuri",
  storageBucket: "pizza-pro-tafuri.firebasestorage.app",
  messagingSenderId: "744087680274",
  appId: "1:744087680274:web:2ea28748ba6ec4b12fefcb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
