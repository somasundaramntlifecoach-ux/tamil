import {auth,db,onAuthStateChanged,doc,onSnapshot,signOut} from './auth.js';
const root=new URL('./',import.meta.url);let unsubscribe;
function lock(){window.stop();document.documentElement.replaceChildren();location.replace(new URL('../Loving_Responsible_Parenting/bundle-login.html',root));}
onAuthStateChanged(auth,async user=>{
 if(unsubscribe)unsubscribe();if(!user){lock();return;}
 // Keep a live approval check on every displayed course page.
 const {getDocFromServer}=await import('./auth.js');
 try{const a=await getDocFromServer(doc(db,'admins',user.uid));if(a.exists())return;
 unsubscribe=onSnapshot(doc(db,'entitlements',user.uid),snap=>{if(!snap.exists()||snap.data().active!==true||snap.data().courseKey!=='loving-responsible-parenting')lock();},lock);
 }catch{lock();}
});
const bar=document.createElement('div');bar.style.cssText='position:relative;background:#102b40;color:#fff;padding:12px 18px;display:flex;gap:16px;flex-wrap:wrap;font:14px/1.5 system-ui;z-index:9999';
for(const [title,path] of [['All Parent Courses','index.html'],['Admin Import','import.html']]){const a=document.createElement('a');a.textContent=title;a.href=new URL(path,root);a.style.color='#ffe19b';bar.append(a);}
const b=document.createElement('button');b.textContent='Sign out';b.onclick=()=>signOut(auth);bar.append(b);document.body.prepend(bar);
