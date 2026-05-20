import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

let app;
export let auth = null;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } else {
    console.warn("⚠️ Firebase ayarları (.env) eksik olduğu için Firebase başlatılamadı.");
  }
} catch (error) {
  console.error("Firebase başlatılırken bir hata oluştu:", error);
}

export const signInWithEmail = (email, password) => {
  if (!auth) return Promise.reject(new Error("Firebase ayarlanmamış. Lütfen .env dosyanızı kontrol edin."));
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email, password) => {
  if (!auth) return Promise.reject(new Error("Firebase ayarlanmamış. Lütfen .env dosyanızı kontrol edin."));
  return createUserWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};
