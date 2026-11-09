/** YES I CAN — Google Sheets registration receiver. */
const SHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const TAB_NAME = 'Registrations';
function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const data=JSON.parse((e.postData && e.postData.contents)||'{}');
    const clean=(v,max)=>String(v||'').trim().replace(/[\r\n\t]/g,' ').slice(0,max).replace(/^[=+@-]/,"'");
    if(data.website || data.consent!==true) throw Error('Invalid request');
    const student=clean(data.student,90),parent=clean(data.parent,90),phone=String(data.phone||'').trim();
    if(!student || !parent || !/^[0-9]{10}$/.test(phone))throw Error('Missing or invalid fields');
    const ss=SpreadsheetApp.openById(SHEET_ID);
    let sh=ss.getSheetByName(TAB_NAME);
    if(!sh)sh=ss.insertSheet(TAB_NAME);
    if(sh.getLastRow()===0){sh.appendRow(['Timestamp (IST)','Registration ID','Student Name','Parent Name','WhatsApp Number','Consent','Payment Status','Payment Reference','Confirmation Status']);sh.setFrozenRows(1);}
    const id='YIC-'+Utilities.formatDate(new Date(),'Asia/Kolkata','yyyyMMdd-HHmmss')+'-'+Math.floor(Math.random()*9000+1000);
    sh.appendRow([new Date(),id,student,parent,phone,'Yes','Pending','','Pending']);
    return ContentService.createTextOutput(JSON.stringify({ok:true,id})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:'Unable to process registration'})).setMimeType(ContentService.MimeType.JSON);
  } finally {try{lock.releaseLock()}catch(e){}}
}
