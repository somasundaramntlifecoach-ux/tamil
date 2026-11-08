// Replace every placeholder with values from Firebase Console > Project settings > Your apps > Web app.
// This file contains public client configuration, not a secret. Firestore Rules enforce security.
export const firebaseConfig = {
  apiKey: "AIzaSyCCAiI3tVEj-ZUfCCK_O6YhRrdMRzm_mZo",
  authDomain: "loving-responsible-parenting.firebaseapp.com",
  projectId: "loving-responsible-parenting",
  storageBucket: "loving-responsible-parenting.firebasestorage.app",
  messagingSenderId: "10810560620",
  appId: "1:10810560620:web:bb6eb79bdbdd315cdf8849"
};
export const configured = !Object.values(firebaseConfig).some(x => String(x).startsWith('PASTE_'));
