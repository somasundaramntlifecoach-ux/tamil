import {auth,onAuthStateChanged} from './auth.js';
import {firebaseConfig} from './firebase-config.js';
const ready=new Promise(resolve=>{const off=onAuthStateChanged(auth,u=>{off();resolve(u);});});
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export function start(manifest){
 self.addEventListener('install',()=>self.skipWaiting());
 self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
 self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL(self.registration.scope);
  if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname)||event.request.method!=='GET')return;
  let path;try{path=decodeURIComponent(url.pathname.slice(base.pathname.length));}catch{return;}
  if(!path||path.endsWith('/'))path+='index.html';
  if(!Object.hasOwn(manifest,path))return;
  event.respondWith((async()=>{
   try{
    await ready;const user=auth.currentUser;if(!user)throw Error('Please sign in.');
    const token=await user.getIdToken();let parts=[];
    for(const id of manifest[path].ids){
     const res=await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/parentCourseAssets/${id}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
     if(!res.ok)throw Error(res.status===403?'Course locked. Admin approval is required.':'Course content unavailable. Please contact the academy.');
     const d=await res.json(),raw=atob(d.fields.base64.stringValue);parts.push(Uint8Array.from(raw,c=>c.charCodeAt(0)));
    }
    return new Response(new Blob(parts),{headers:{...headers,'Content-Type':manifest[path].mime}});
   }catch(e){
    if(event.request.mode==='navigate')return Response.redirect(new URL('bundle-login.html',base).href,302);
    return new Response('Locked or unavailable',{status:403,headers});
   }
  })());
 });
}
