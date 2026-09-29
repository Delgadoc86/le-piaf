/** Config pública de Firebase (NEXT_PUBLIC_*): la usan el panel (client.ts) y la web (publico.ts). */
export const configFirebase = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const REGION_FUNCTIONS = 'southamerica-east1';
export const usaEmuladores = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
