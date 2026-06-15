import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { doc, getDoc, getFirestore, onSnapshot, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATMHotSSGYdEcjqOEgDuEtF7dgtMancio",
  authDomain: "gaby-letras.firebaseapp.com",
  projectId: "gaby-letras",
  storageBucket: "gaby-letras.firebasestorage.app",
  messagingSenderId: "235429671912",
  appId: "1:235429671912:web:8ff6608d63567987d3aa5d",
  measurementId: "G-NSN4TT02GQ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const stateRef = doc(db, "appState", "main");

export async function loadRemoteState() {
  const snapshot = await getDoc(stateRef);
  return snapshot.exists() ? cleanState(snapshot.data()) : null;
}

export async function saveRemoteState(state) {
  await setDoc(stateRef, { ...state, updatedAt: serverTimestamp() });
}

export function subscribeRemoteState(onChange, onError) {
  return onSnapshot(
    stateRef,
    (snapshot) => {
      if (snapshot.exists()) onChange(cleanState(snapshot.data()));
    },
    onError,
  );
}

function cleanState(state) {
  const { updatedAt, ...data } = state || {};
  return data;
}
