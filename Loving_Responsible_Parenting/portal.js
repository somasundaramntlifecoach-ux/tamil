
import {
  auth, db, configured, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, doc, getDoc, setDoc, collection,
  getDocs, onSnapshot, serverTimestamp
} from './firebase-app.js';

// Loving & Responsible Parenting — Admin-managed accounts, private paid lessons.
const $ = id => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = String(value ?? ''); };
const toggle = (id, hidden) => { const el = $(id); if (el) el.classList.toggle('hide', hidden); };
const bind = (id, handler) => { const el = $(id); if (el) el.addEventListener('click', handler); else console.warn(`Missing optional element: #${id}`); };
const message = e => ({
  'auth/invalid-credential': 'Email அல்லது Password சரியாக இல்லை.',
  'auth/too-many-requests': 'சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
  'auth/user-disabled': 'இந்த Account முடக்கப்பட்டுள்ளது. Admin-ஐ தொடர்புகொள்ளவும்.',
  'permission-denied': 'Firestore அனுமதி இல்லை. Admin-ஐ தொடர்புகொள்ளவும்.'
}[e?.code] || e?.message || 'Something went wrong');

const levels = [
  ['Foundation','அடிப்படை நிலை','🌱'],
  ['Intermediate','இடைநிலை','🌼'],
  ['Advanced','மேம்பட்ட நிலை','🚀'],
  ['Mastery','நடைமுறை ஒருங்கிணைப்பு','💜']
];

let current = null, progress = {}, unsubscribe = null, catalog = [], questions = [];
let paid = false, isAdmin = false;

async function loadData() {
  const [c, q] = await Promise.all([
    fetch('./catalog.json').then(r => { if (!r.ok) throw Error(`catalog.json: ${r.status}`); return r.json(); }),
    fetch('./assessment.json').then(r => { if (!r.ok) throw Error(`assessment.json: ${r.status}`); return r.json(); })
  ]);
  catalog = c; questions = q;
}

function loginFields() {
  return [($('email')?.value || '').trim(), $('password')?.value || ''];
}

function canAccess() {
  return Boolean(current && (paid || isAdmin));
}

function requestApproval() {
  const panel = $('paymentPanel');
  if (panel && !panel.classList.contains('hide')) panel.scrollIntoView({behavior:'smooth'});
  else alert('₹499 கட்டணத்தை Admin சரிபார்த்து அனுமதி வழங்கிய பிறகே பாடங்களை அணுகலாம்.');
}

function lessonId(x) {
  return `${x.module}-${x.lesson}`;
}

function privateLessonUrl(x) {
  // The lesson page must independently enforce Firebase authentication and entitlement.
  return x.path;
}

function goToLesson(x) {
  if (!canAccess()) { requestApproval(); return; }
  if (!x?.path) { alert('Lesson link not available'); return; }
  location.href = privateLessonUrl(x);
}

function showProgress() {
  const done = catalog.filter(x => progress[lessonId(x)]?.completed).length;
  setText('completed', done);
  setText('percent', Math.round(done / (catalog.length || 48) * 100) + '%');
  const bar = $('bar');
  if (bar) bar.style.width = Math.round(done / (catalog.length || 48) * 100) + '%';
  setText('syncStatus', '☁ Progress synced with Firestore');
  renderLevels();
}

function renderLevels() {
  const wrap = $('levels');
  if (!wrap) return;
  wrap.replaceChildren();

  levels.forEach(([title, tamil, emoji], i) => {
    const card = document.createElement('article');
    card.className = 'level';

    const h = document.createElement('h3');
    h.textContent = `${emoji} Level ${i + 1} — ${title}`;
    card.append(h);

    const subtitle = document.createElement('p');
    subtitle.className = 'muted';

    const done = catalog.filter(x =>
      Math.floor((Number(x.module)-1)/3) === i &&
      progress[lessonId(x)]?.completed
    ).length;

    subtitle.textContent = `${tamil} · Modules ${i*3+1}–${i*3+3} · ${done}/12 பாடங்கள் முடிந்தன`;
    card.append(subtitle);

    for (let m = i*3+1; m <= i*3+3; m++) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');

      summary.textContent = `Module ${m} · ${
        catalog.filter(x =>
          Number(x.module) === m &&
          progress[lessonId(x)]?.completed
        ).length
      }/4`;

      details.append(summary);

      for (const x of catalog.filter(x => Number(x.module) === m)) {
        const line = document.createElement('div');
        line.className = 'lesson';

        const a = document.createElement('a');
        a.href = canAccess() ? (x.path || '#') : '#paymentPanel';
        a.textContent = `Lesson ${x.lesson}: ${x.title}`;
        a.addEventListener('click', e => {
          e.preventDefault();
          goToLesson(x);
        });

        const mark = document.createElement('span');
        mark.className = 'mini';
        const data = progress[lessonId(x)];

        mark.textContent = !canAccess()
          ? '🔒 Locked'
          : data?.completed
            ? '✓ முடிந்தது'
            : data?.sectionsDone
              ? `${data.sectionsDone}/10 பகுதிகள்`
              : 'தொடங்கலாம்';

        line.append(a, mark);
        details.append(line);
      }

      card.append(details);
    }

    wrap.append(card);
  });
}

function renderAssessment() {
  const form = $('assessmentForm');
  if (!form) return;
  form.replaceChildren();

  questions.forEach((item, i) => {
    const field = document.createElement('fieldset');
    field.className = 'q';

    const legend = document.createElement('legend');
    legend.textContent = `${i+1}. ${item.q}`;
    field.append(legend);

    (item.options || []).forEach((option,j) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');

      radio.type = 'radio';
      radio.name = 'q'+i;
      radio.value = j;

      label.append(radio, document.createTextNode(option));
      field.append(label);
    });

    form.append(field);
  });
}

async function submitAssessment() {
  if (!canAccess()) { requestApproval(); return; }

  const answers = questions.map((_,i) => {
    const checked = document.querySelector(`input[name="q${i}"]:checked`);
    return checked ? Number(checked.value) : null;
  });

  if (answers.some(x => x === null)) {
    alert(`அனைத்து ${questions.length} கேள்விகளுக்கும் பதில் அளிக்கவும்.`);
    return;
  }

  const score = answers.filter((a,i) => a === questions[i].answer).length;
  const details = questions.map((q,i) =>
    `${i+1}. ${answers[i]===q.answer?'✓':'✗'} ${q.why || ''}`
  ).join('\n');

  const resultWrap = $('assessmentResult');

  if (resultWrap) {
    const result = document.createElement('div');
    result.className = 'result';
    result.style.whiteSpace = 'pre-line';
    result.textContent = `மதிப்பெண்: ${score}/${questions.length} (${Math.round(score/questions.length*100)}%).\n\n${details}`;
    resultWrap.replaceChildren(result);
  }

  try {
    await setDoc(doc(db,'users',current.uid,'assessments','final'), {
      score,
      total:questions.length,
      answers,
      submittedAt:serverTimestamp()
    });

    setText('assessmentStatus', `${score}/${questions.length}`);
  } catch(e) {
    alert('Result not synced: '+message(e));
  }
}

// Admin-only Firestore profile registration.
// Authentication account must first be created in Firebase Console.
async function createParentProfile() {
  const button = $('createParent');
  const show = text => setText('createParentStatus', text);

  if (!current || !isAdmin) {
    show('Admin login required.');
    return;
  }

  const name = ($('newParentName')?.value || '').trim();
  const email = ($('newParentEmail')?.value || '').trim();
  const uid = ($('newParentUID')?.value || '').trim();

  if (!name || !email || !uid) {
    show('Parent Name, Email மற்றும் Firebase UID மூன்றையும் உள்ளிடவும்.');
    return;
  }

  if (
    name.length > 80 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(uid)
  ) {
    show('Name, Email அல்லது UID சரியாக இல்லை.');
    return;
  }

  if (uid === current.uid) {
    show('Admin UID-ஐ Parent UID-ஆக பயன்படுத்த வேண்டாம்.');
    return;
  }

  if (!confirm(
    'Firebase Authentication-இல் இந்த UID மற்றும் Email ஒரே Parent Account-க்கு உரியவை என்பதைச் சரிபார்த்தீர்களா?'
  )) return;

  if (button) button.disabled = true;
  show('Parent Profile பதிவு செய்யப்படுகிறது…');

  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      show('இந்த UID-க்கு ஏற்கெனவே Profile உள்ளது. எந்த மாற்றமும் செய்யப்படவில்லை.');
      return;
    }

    await setDoc(ref, {
      displayName: name,
      email,
      createdAt: serverTimestamp()
    });

    show('✓ Parent Profile உருவாக்கப்பட்டது. ₹499 Access இன்னும் வழங்கப்படவில்லை.');

    for (const id of [
      'newParentName',
      'newParentEmail',
      'newParentUID'
    ]) {
      if ($(id)) $(id).value = '';
    }

    await refreshAdmin();

  } catch (e) {
    show('Profile பதிவு செய்ய முடியவில்லை: ' + message(e));
  } finally {
    if (button) button.disabled = !current || !isAdmin;
  }
}

async function refreshAdmin() {
  if (!current || !isAdmin) return;

  const list = $('adminList');
  if (!list) return;
  list.textContent = 'Loading…';

  try {
    const snap = await getDocs(collection(db,'users'));
    list.replaceChildren();
    setText('totalParents',snap.size);

    for (const userDoc of snap.docs) {
      const u = userDoc.data();
      const row = document.createElement('div');
      row.className = 'adminrow';

      const name = document.createElement('span');
      name.textContent = `${u.displayName || 'Parent'} · ${u.email || userDoc.id}`;

      const view = document.createElement('button');
      view.className = 'btn secondary';
      view.textContent = 'View progress';
      view.onclick = () =>
        showAdminParent(userDoc.id,u.displayName || 'Parent');

      const approve = document.createElement('button');
      approve.className = 'btn secondary';
      approve.textContent = 'Approve ₹499';

      approve.onclick = async () => {
        if (!confirm(
          `Payment independently verified? Grant access to ${u.email || userDoc.id}?`
        )) return;

        try {
          await setDoc(doc(db,'entitlements',userDoc.id), {
            active:true,
            courseKey:'loving-responsible-parenting',
            priceINR:499,
            approvedBy:current.uid,
            approvedAt:serverTimestamp()
          });
          alert('Paid access activated');
        } catch(e) {
          alert('Approval failed: '+message(e));
        }
      };

      const revoke = document.createElement('button');
      revoke.className = 'btn warn';
      revoke.textContent = 'Revoke';

      revoke.onclick = async () => {
        if (!confirm('Revoke course access?')) return;

        try {
          await setDoc(doc(db,'entitlements',userDoc.id), {
            active:false,
            courseKey:'loving-responsible-parenting',
            priceINR:499,
            approvedBy:current.uid,
            approvedAt:serverTimestamp()
          });
          alert('Paid access revoked');
        } catch(e) {
          alert('Revocation failed: '+message(e));
        }
      };

      row.append(name,view,approve,revoke);
      list.append(row);
    }
  } catch(e) {
    list.textContent = 'Cannot load parent accounts: '+message(e);
  }
}

async function showAdminParent(uid,name) {
  if (!isAdmin) return;

  const details = $('adminDetails');
  if (!details) return;

  details.classList.remove('hide');
  details.textContent = 'Loading…';

  try {
    const [lessons,assessment] = await Promise.all([
      getDocs(collection(db,'users',uid,'lessons')),
      getDoc(doc(db,'users',uid,'assessments','final'))
    ]);

    const completed = lessons.docs.filter(x =>
      x.data().completed
    ).length;

    details.textContent =
      `${name}: ${completed}/48 completed · Final assessment: ${
        assessment.exists()
          ? assessment.data().score+'/'+(assessment.data().total||12)
          : 'Not attempted'
      }`;

    setText('totalCompleted',completed);
    setText('totalAssessments',assessment.exists()?'1':'0');

  } catch(e) {
    details.textContent = 'Could not load: '+message(e);
  }
}

async function onUserChanged(user) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  current = user;
  progress = {};
  paid = false;
  isAdmin = false;

  setText('who',user?.email || 'Not signed in');
  toggle('logout',!user);
  toggle('authPanel',!!user);
  toggle('parentPanel',!user);
  toggle('adminPanel',true);
  toggle('paymentPanel',true);

  if ($('createParent')) $('createParent').disabled = true;

  if (!user) {
    renderLevels();
    return;
  }

  try {
    const adminDoc = await getDoc(doc(db,'admins',user.uid));
    isAdmin = adminDoc.exists();
  } catch(e) {
    console.warn('Admin lookup failed:',message(e));
  }

  try {
    const ent = await getDoc(doc(db,'entitlements',user.uid));
    paid = ent.exists() &&
      ent.data().active === true &&
      ent.data().courseKey === 'loving-responsible-parenting';
  } catch(e) {
    console.warn('Entitlement lookup failed:',message(e));
  }

  toggle('paymentPanel',paid || isAdmin);
  setText(
    'paidStatus',
    canAccess()
      ? '✓ Course access active'
      : '🔒 Payment ₹499 + Admin Approval required'
  );

  toggle('adminPanel',!isAdmin);

  if ($('createParent')) $('createParent').disabled = !isAdmin;

  renderLevels();

  try {
    const profile = await getDoc(doc(db,'users',user.uid));

    if (!profile.exists()) {
      await setDoc(doc(db,'users',user.uid), {
        displayName:user.email?.split('@')[0] || 'Parent',
        email:user.email,
        createdAt:serverTimestamp()
      });
    }

    setText(
      'parentName',
      profile.data()?.displayName ||
      user.email?.split('@')[0] ||
      'Parent'
    );

    const assessment = await getDoc(
      doc(db,'users',user.uid,'assessments','final')
    );

    setText(
      'assessmentStatus',
      assessment.exists()
        ? `${assessment.data().score}/${assessment.data().total || 12}`
        : 'Not started'
    );

    if (isAdmin) refreshAdmin();

    unsubscribe = onSnapshot(
      collection(db,'users',user.uid,'lessons'),
      snap => {
        progress = {};
        snap.forEach(d => {
          progress[d.id] = d.data();
        });
        showProgress();
      },
      e => setText('syncStatus','Cloud sync error: '+message(e))
    );

  } catch(e) {
    setText('syncStatus','Firestore error: '+message(e));
  }
}

async function start() {
  bind('signin',async () => {
    try {
      setText('authError','');
      const [email,password] = loginFields();

      if (!email || !password) {
        throw Error('Email மற்றும் Password உள்ளிடவும்.');
      }

      if (!configured || !auth) {
        throw Error('Firebase configuration is missing.');
      }

      await signInWithEmailAndPassword(auth,email,password);
    } catch(e) {
      setText('authError',message(e));
    }
  });

  bind('reset',async () => {
    try {
      const [email] = loginFields();

      if (!email) {
        throw Error('முதலில் Email Address உள்ளிடவும்.');
      }

      await sendPasswordResetEmail(auth,email);

      setText(
        'authError',
        'Account இருந்தால் Password Reset Link Email-க்கு அனுப்பப்படும். Spam Folder-ஐயும் பார்க்கவும்.'
      );
    } catch(e) {
      setText('authError',message(e));
    }
  });

  bind('logout',() => auth && signOut(auth));

  bind('continue',() => {
    if (!canAccess()) {
      requestApproval();
      return;
    }

    const next = catalog.find(x =>
      !progress[lessonId(x)]?.completed
    ) || catalog[0];

    if (next) goToLesson(next);
  });

  bind('goAssessment',() => {
    if (!canAccess()) {
      requestApproval();
      return;
    }

    toggle('assessmentPanel',false);
    $('assessmentPanel')?.scrollIntoView({behavior:'smooth'});
  });

  bind('submitAssessment',submitAssessment);
  bind('refreshAdmin',refreshAdmin);
  bind('createParent',createParentProfile);

  // No public signup listener.
  // Parents are provisioned by the administrator.

  try {
    await loadData();
    renderAssessment();
  } catch(e) {
    setText(
      'setup',
      'Course catalog could not be loaded: '+message(e)
    );
    toggle('setup',false);
    return;
  }

  if (!configured || !auth || !db) {
    setText('setup','Firebase configuration is missing.');
    toggle('setup',false);
    return;
  }

  toggle('setup',true);

  onAuthStateChanged(
    auth,
    onUserChanged,
    e => setText('authError',message(e))
  );
}

start();
