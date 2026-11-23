import {auth,db,onAuthStateChanged,signInWithEmailAndPassword,sendPasswordResetEmail,signOut,allowed,doc,onSnapshot} from './auth.js';
const $=id=>document.getElementById(id),base=new URL('../',import.meta.url);
const folders=['Loving_Responsible_Parenting','Stress_Management_Parents','Anger_Management_Mastery_360','Digital_Parenting_Mastery'];
$('login').onsubmit=async e=>{e.preventDefault();$('status').textContent='Signing in…';try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';}catch{$('status').textContent='Unable to sign in. Check your email and password.';}};
$('reset').onclick=async()=>{try{if(!$('email').value.trim())throw Error();await sendPasswordResetEmail(auth,$('email').value.trim());$('status').textContent='If the account exists, a password reset email will be sent.';}catch{$('status').textContent='Enter your email address and try again.';}};
$('logout').onclick=()=>signOut(auth);let unsub,loading=false;
async function check(user){
 if(loading)return;loading=true;try{
  const ok=await allowed(user);$('courses').hidden=!ok;
  $('status').textContent=ok?'Approved — all four courses are available. / நான்கு பாடநெறிகளுக்கும் அனுமதி உள்ளது.':'Locked — awaiting admin approval. / நிர்வாகியின் அனுமதிக்காகக் காத்திருக்கிறது.';
  if(ok){
   if(!('serviceWorker' in navigator))throw Error('This browser does not support protected courses. Please use an updated browser.');
   await Promise.all(folders.map(folder=>navigator.serviceWorker.register(new URL(folder+'/bundle-sw.js',base),{type:'module',scope:new URL(folder+'/',base).href})));
   const target=document.body.dataset.course;
   if(target&&folders.includes(target)){
    const reg=await navigator.serviceWorker.getRegistration(new URL(target+'/',base));
    if(!reg.active)await new Promise((resolve,reject)=>{let w=reg.installing||reg.waiting;if(!w)return reject(Error('Reload this page to finish setup.'));w.addEventListener('statechange',()=>{if(w.state==='activated')resolve();if(w.state==='redundant')reject(Error('Course setup failed.'));});});
    // Show a deliberate start link: no automatic redirect loop if content import/rules are incomplete.
    $('start').href=new URL(target+'/index.html',base);$('start').hidden=false;
   }
  }else $('start').hidden=true;
 }catch(e){$('status').textContent=e.message||'Connection unavailable. Please retry online.';$('courses').hidden=true;$('start').hidden=true;}finally{loading=false;}
}
onAuthStateChanged(auth,user=>{
 if(unsub)unsub();$('login').hidden=!!user;$('logout').hidden=!user;$('courses').hidden=true;$('start').hidden=true;
 if(!user){$('status').textContent='Sign in with your existing parent account. / உங்கள் பெற்றோர் கணக்கில் உள்நுழையுங்கள்.';return;}
 check(user);unsub=onSnapshot(doc(db,'entitlements',user.uid),()=>check(user),()=>check(user));
});
