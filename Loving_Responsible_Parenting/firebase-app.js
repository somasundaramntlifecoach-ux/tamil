import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,collection,query,orderBy,limit,getDocs,onSnapshot,serverTimestamp,runTransaction} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {firebaseConfig,configured} from './firebase-config.js';
export {configured,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,doc,getDoc,setDoc,updateDoc,collection,query,orderBy,limit,getDocs,onSnapshot,serverTimestamp,runTransaction};
export const app=configured?initializeApp(firebaseConfig):null;
export const auth=app?getAuth(app):null;
export const db=app?getFirestore(app):null;
