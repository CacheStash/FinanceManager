import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// --- PENTING UNTUK USER ---
// 1. Buat project baru di https://console.firebase.google.com/
// 2. Tambahkan aplikasi "Web" </>.
// 3. Copy config yang muncul dan tempel di bawah ini (ganti nilai string kosong).
// 4. Di Firebase Console -> Build -> Authentication -> Sign-in method -> Aktifkan "Google".

const firebaseConfig = {
  apiKey: "ISI_DENGAN_API_KEY_ANDA", // Contoh: "AIzaSyD..."
  authDomain: "ISI_DENGAN_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_DENGAN_PROJECT_ID",
  storageBucket: "ISI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_DENGAN_SENDER_ID",
  appId: "ISI_DENGAN_APP_ID"
};

// Initialize only if config is present to prevent crashes on demo
let app;
let auth: any;
let googleProvider: any;

try {
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("ISI_DENGAN")) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
    } else {
        console.warn("Firebase config not set. Google Login will not work.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { auth, googleProvider };