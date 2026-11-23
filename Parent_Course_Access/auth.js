import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {initializeAuth,indexedDBLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocFromServer,setDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
export const app=initializeApp(firebaseConfig);
export const auth=initializeAuth(app,{persistence:indexedDBLocalPersistence});
export const db=getFirestore(app);
export {onAuthStateChanged,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,doc,getDoc,getDocFromServer,setDoc,onSnapshot,serverTimestamp};
export async function allowed(user){
 if(!user)return false;
 const a=await getDocFromServer(doc(db,'admins',user.uid));if(a.exists())return true;
 const e=await getDocFromServer(doc(db,'entitlements',user.uid));return e.exists()&&e.data().active===true&&e.data().courseKey==='loving-responsible-parenting';
}
