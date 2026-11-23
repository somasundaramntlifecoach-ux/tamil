import {auth,db,onAuthStateChanged,signInWithEmailAndPassword,signOut,doc,getDocFromServer,setDoc,serverTimestamp} from './auth.js';
const $=id=>document.getElementById(id);let user=null;
$('login').onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';}catch{$('status').textContent='Sign-in failed.';}};
$('logout').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{user=null;$('tools').hidden=true;$('login').hidden=!!u;$('logout').hidden=!u;if(!u)return;try{const a=await getDocFromServer(doc(db,'admins',u.uid));if(!a.exists())throw Error('This page is for administrators only.');user=u;$('tools').hidden=false;$('status').textContent='Admin verified. Select the private course-content JSON file.';}catch(e){$('status').textContent=e.message;}});
$('upload').onclick=async()=>{
 if(!user)return;const f=$('file').files[0];if(!f){$('status').textContent='Select protected-course-content.json first.';return;}
 $('upload').disabled=true;
 try{
  const data=JSON.parse(await f.text());if(data.format!==1||data.projectId!=='loving-responsible-parenting'||!Array.isArray(data.assets))throw Error('Wrong course-content file.');
  const keys=['Loving_Responsible_Parenting','Stress_Management_Parents','Anger_Management_Mastery_360','Digital_Parenting_Mastery'];
  for(const [i,a] of data.assets.entries()){
   if(!/^[a-f0-9]{64}$/.test(a.id)||!keys.includes(a.courseKey)||typeof a.base64!=='string'||a.base64.length>330000)throw Error('Invalid content chunk.');
   if(auth.currentUser?.uid!==user.uid)throw Error('Session ended. Sign in again.');
   await setDoc(doc(db,'parentCourseAssets',a.id),{courseKey:a.courseKey,base64:a.base64,updatedAt:serverTimestamp()});
   $('status').textContent=`Imported ${i+1} of ${data.assets.length}`;
  }
  $('status').textContent='All course content imported. Verify with admin, approved and unapproved test accounts before sharing the portal.';
 }catch(e){$('status').textContent='Import stopped: '+e.message+' You can select the same file and retry.';}finally{$('upload').disabled=false;}
};
