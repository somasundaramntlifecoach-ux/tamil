// ============================================================
// Emotional Intelligence for Teachers - Tamil LMS
// Pure client-side (localStorage) progress + quiz engine.
// No backend / Firebase wired yet - safe to bolt on later.
// ============================================================

const LMS_KEY = "ei_tn_course_v1";
const TOTAL_MODULES = 10;

function loadState(){
  try{
    const raw = localStorage.getItem(LMS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){ return {}; }
}
function saveState(state){
  localStorage.setItem(LMS_KEY, JSON.stringify(state));
}
function getModuleState(m){
  const s = loadState();
  return s["m"+m] || {};
}
function setModuleField(m, key, value){
  const s = loadState();
  const mk = "m"+m;
  if(!s[mk]) s[mk] = {};
  s[mk][key] = value;
  saveState(s);
}

// ---------- generic text/textarea autosave ----------
function wireAutosave(moduleNum){
  document.querySelectorAll("[data-save-key]").forEach(el=>{
    const key = el.getAttribute("data-save-key");
    const st = getModuleState(moduleNum);
    if(st[key] !== undefined){
      if(el.type === "checkbox"){ el.checked = !!st[key]; }
      else if(el.type === "radio"){ el.checked = (st[key] === el.value); }
      else{ el.value = st[key]; }
    }
    const indicator = el.parentElement.querySelector(".save-indicator");
    const handler = ()=>{
      const val = el.type === "checkbox" ? el.checked : el.value;
      setModuleField(moduleNum, key, val);
      if(el.type === "checkbox"){
        const card = el.closest(".plan-item");
        if(card) card.classList.toggle("done", el.checked);
      }
      if(el.type === "radio"){
        const row = el.closest(".pill-row");
        if(row) row.querySelectorAll(".pill-opt").forEach(p=>p.classList.toggle("selected", p.contains(el) && el.checked));
      }
      if(indicator){
        indicator.classList.add("show");
        clearTimeout(indicator._t);
        indicator._t = setTimeout(()=>indicator.classList.remove("show"), 1200);
      }
      updateProgressPill();
    };
    const evt = (el.tagName === "TEXTAREA" || el.type==="text") ? "input" : "change";
    el.addEventListener(evt, handler);
    if(el.type === "radio" && el.checked){
      const row = el.closest(".pill-row");
      if(row) row.querySelectorAll(".pill-opt").forEach(p=>p.classList.toggle("selected", p.contains(el)));
    }
  });
}

// ---------- quiz engine ----------
function initQuiz(moduleNum, questions){
  const form = document.getElementById("quiz-form");
  if(!form) return;
  questions.forEach((q, qi)=>{
    const block = document.createElement("div");
    block.className = "quiz-q";
    const qtext = document.createElement("div");
    qtext.className = "qtext";
    qtext.textContent = (qi+1) + ". " + q.q;
    block.appendChild(qtext);
    q.options.forEach((opt, oi)=>{
      const label = document.createElement("label");
      label.className = "quiz-opt";
      label.innerHTML = `<input type="radio" name="q${qi}" value="${oi}"> <span>${opt}</span>`;
      block.appendChild(label);
    });
    const explain = document.createElement("div");
    explain.className = "quiz-explain";
    explain.id = "explain-"+qi;
    explain.textContent = q.explain;
    block.appendChild(explain);
    form.appendChild(block);
  });

  const submitBtn = document.getElementById("quiz-submit");
  const scoreBox = document.getElementById("quiz-score-box");
  const scoreBig = document.getElementById("quiz-score-big");
  const scoreMsg = document.getElementById("quiz-score-msg");

  // restore previous best score display
  const st = getModuleState(moduleNum);
  if(st.quizBest !== undefined){
    scoreBox.classList.add("show");
    scoreBig.textContent = st.quizBest + " / " + questions.length;
    scoreMsg.textContent = "இதுவரை உங்கள் சிறந்த மதிப்பெண் (Best score so far).";
  }

  submitBtn.addEventListener("click", ()=>{
    let score = 0;
    questions.forEach((q, qi)=>{
      const chosen = form.querySelector(`input[name="q${qi}"]:checked`);
      const opts = form.querySelectorAll(`.quiz-q:nth-child(${qi+1}) .quiz-opt`);
      opts.forEach((optEl, oi)=>{
        optEl.classList.remove("correct","incorrect");
        if(oi === q.correct) optEl.classList.add("correct");
        else if(chosen && parseInt(chosen.value) === oi) optEl.classList.add("incorrect");
      });
      document.getElementById("explain-"+qi).classList.add("show");
      if(chosen && parseInt(chosen.value) === q.correct) score++;
    });
    scoreBox.classList.add("show");
    scoreBig.textContent = score + " / " + questions.length;
    scoreMsg.textContent = score === questions.length
      ? "அருமை! எல்லா கேள்விகளும் சரி. (Perfect score!)"
      : "நல்ல முயற்சி! Explanations-ஐப் படித்து மீண்டும் revise செய்யுங்கள்.";
    scoreBox.scrollIntoView({behavior:"smooth", block:"center"});

    const prevBest = st.quizBest || 0;
    if(score > prevBest){
      setModuleField(moduleNum, "quizBest", score);
    }
    setModuleField(moduleNum, "quizAttempted", true);
    updateProgressPill();
    updateCompleteButton(moduleNum, questions.length);
  });

  updateCompleteButton(moduleNum, questions.length);
}

function updateCompleteButton(moduleNum, totalQ){
  const btn = document.getElementById("mark-complete-btn");
  if(!btn) return;
  const st = getModuleState(moduleNum);
  if(st.completed){
    btn.textContent = "✓ Module Completed";
    btn.classList.add("btn-navy");
    btn.classList.remove("btn-gold");
  }
}

function markComplete(moduleNum){
  setModuleField(moduleNum, "completed", true);
  const btn = document.getElementById("mark-complete-btn");
  if(btn){
    btn.textContent = "✓ Module Completed";
  }
  updateProgressPill();
  const nextBtn = document.getElementById("next-module-link");
  if(nextBtn) nextBtn.classList.add("btn-gold");
}

// ---------- progress pill (shown on every page) ----------
function countCompleted(){
  const s = loadState();
  let c = 0;
  for(let i=1;i<=TOTAL_MODULES;i++){
    if(s["m"+i] && s["m"+i].completed) c++;
  }
  return c;
}
function updateProgressPill(){
  const pill = document.getElementById("progress-pill");
  if(pill){
    const c = countCompleted();
    pill.textContent = c + " / " + TOTAL_MODULES + " Modules Complete";
  }
  const bar = document.getElementById("dash-progress-bar");
  if(bar){
    const c = countCompleted();
    bar.style.width = Math.round((c/TOTAL_MODULES)*100) + "%";
  }
  const dashText = document.getElementById("dash-progress-text");
  if(dashText){
    dashText.textContent = countCompleted() + " / " + TOTAL_MODULES + " Modules Completed";
  }
  document.querySelectorAll("[data-mod-card]").forEach(card=>{
    const n = card.getAttribute("data-mod-card");
    const st = getModuleState(n);
    if(st.completed){
      card.classList.add("done");
      const tag = card.querySelector(".status-tag");
      if(tag) tag.textContent = "Completed";
      const link = card.querySelector("a.btn");
      if(link) link.textContent = "Review Module";
    }
  });
}

document.addEventListener("DOMContentLoaded", updateProgressPill);
