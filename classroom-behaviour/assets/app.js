/* ============================================================
   Classroom Behaviour Management Mastery — Shared App JS
   ============================================================ */
(function () {
  const CFG = window.COURSE_CONFIG || {};
  const PROGRESS_KEY = "cbmm_progress_v1";

  /* ---------------- Progress (localStorage, per-device) ---------------- */
  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function markModuleComplete(moduleNum) {
    const p = getProgress();
    p[moduleNum] = true;
    saveProgress(p);
    updateProgressBar();
  }
  function updateProgressBar() {
    const p = getProgress();
    const total = CFG.TOTAL_MODULES || 10;
    const done = Object.keys(p).filter(k => p[k]).length;
    const pct = Math.round((done / total) * 100);
    document.querySelectorAll("[data-progress-fill]").forEach(el => el.style.width = pct + "%");
    document.querySelectorAll("[data-progress-label]").forEach(el => el.textContent = done + " / " + total + " Modules");
  }

  /* ---------------- GAS pixel logging ---------------- */
  function logEvent(eventName, moduleNum) {
    return; // Offline: no tracking
    const img = new Image();
    const params = new URLSearchParams({
      course: CFG.COURSE_ID || "",
      module: moduleNum || "",
      event: eventName || "view",
      key: CFG.GAS_SHARED_KEY || "",
      ref: document.referrer || "",
      t: Date.now()
    });
    img.src = CFG.GAS_ENDPOINT_URL + "?" + params.toString();
  }

  /* ---------------- WhatsApp helpers ---------------- */
  function waLink(message) {
    const num = CFG.WHATSAPP_NUMBER || "";
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(message || "");
  }
  function initWhatsAppLinks() {
    document.querySelectorAll("[data-wa='enroll']").forEach(el => {
      el.href = waLink(CFG.WHATSAPP_MESSAGE_ENROLL);
    });
    document.querySelectorAll("[data-wa='success']").forEach(el => {
      el.href = waLink(CFG.WHATSAPP_MESSAGE_SUCCESS);
    });
    document.querySelectorAll("[data-wa='float']").forEach(el => {
      el.href = waLink(CFG.WHATSAPP_MESSAGE_ENROLL);
    });
  }

  /* ---------------- Razorpay button injection ---------------- */
  function initRazorpayButtons() {
    document.querySelectorAll("[data-razorpay-slot]").forEach(slot => {
      const btnId = CFG.RAZORPAY_BUTTON_ID;
      if (!btnId || btnId.indexOf("REPLACE_WITH") === 0) {
        slot.innerHTML = '<p style="font-family:Poppins,sans-serif;font-size:.8rem;color:#b3261e;background:#fdecea;padding:10px 14px;border-radius:8px;">Razorpay Button ID இன்னும் assets/config.js இல் சேர்க்கப்படவில்லை.</p>';
        return;
      }
      const form = document.createElement("form");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/payment-button.js";
      script.setAttribute("data-payment_button_id", btnId);
      script.async = true;
      form.appendChild(script);
      slot.appendChild(form);
    });
  }

  /* ---------------- Module nav active state ---------------- */
  function initModuleNav() {
    const current = document.body.getAttribute("data-module");
    document.querySelectorAll(".modnav a").forEach(a => {
      if (a.getAttribute("data-module") === current) a.classList.add("active");
    });
  }

  /* ---------------- Quiz engine ---------------- */
  // questions: [{ q: "text", options: ["opt1","opt2",...], correctIndex: 1 }]
  function renderQuiz(containerId, questions, opts) {
    opts = opts || {};
    const container = document.getElementById(containerId);
    if (!container) return;
    const answers = new Array(questions.length).fill(null);

    let html = '<div class="quiz-progress" data-progress-label>0 / ' + questions.length + ' கேள்விகளுக்கு பதிலளிக்கப்பட்டது</div>';
    questions.forEach((item, qi) => {
      html += '<div class="qcard" data-qindex="' + qi + '">';
      html += '<div class="qtext">' + (qi + 1) + '. ' + item.q + '</div>';
      item.options.forEach((opt, oi) => {
        html += '<label class="qopt" data-qi="' + qi + '" data-oi="' + oi + '">' +
          '<input type="radio" name="q' + qi + '" value="' + oi + '"> <span>' + opt + '</span></label>';
      });
      html += '</div>';
    });
    html += '<button class="btn btn-gold no-print" id="' + containerId + '_submit">பதில்களைச் சமர்ப்பிக்க ✔</button>';
    html += '<div class="quiz-result" id="' + containerId + '_result"></div>';
    container.innerHTML = html;

    const progressLabel = container.querySelector("[data-progress-label]");
    container.querySelectorAll(".qopt input").forEach(inp => {
      inp.addEventListener("change", function () {
        const qi = parseInt(this.closest(".qopt").getAttribute("data-qi"), 10);
        answers[qi] = parseInt(this.value, 10);
        const answeredCount = answers.filter(a => a !== null).length;
        progressLabel.textContent = answeredCount + " / " + questions.length + " கேள்விகளுக்கு பதிலளிக்கப்பட்டது";
      });
    });

    document.getElementById(containerId + "_submit").addEventListener("click", function () {
      if (answers.some(a => a === null)) {
        alert("தயவுசெய்து அனைத்து கேள்விகளுக்கும் பதிலளிக்கவும்.");
        return;
      }
      let score = 0;
      questions.forEach((item, qi) => {
        const card = container.querySelector('.qcard[data-qindex="' + qi + '"]');
        card.querySelectorAll(".qopt").forEach((label, oi) => {
          label.classList.add("locked");
          label.querySelector("input").disabled = true;
          if (oi === item.correctIndex) label.classList.add("correct");
          else if (oi === answers[qi]) label.classList.add("incorrect");
        });
        if (answers[qi] === item.correctIndex) score++;
      });
      this.style.display = "none";
      const resultBox = document.getElementById(containerId + "_result");
      resultBox.style.display = "block";
      const pct = Math.round((score / questions.length) * 100);
      let remark = pct === 100 ? "சிறப்பு! முழு மதிப்பெண்!" : pct >= 60 ? "நல்ல முயற்சி!" : "மீண்டும் பாடத்தைப் பார்த்து முயற்சிக்கவும்.";
      resultBox.innerHTML = '<div class="score">' + score + '/' + questions.length + '</div><p>' + remark + '</p>';
      if (opts.onComplete) opts.onComplete(score, questions.length);
      logEvent("quiz_submit_" + score + "of" + questions.length, opts.moduleNum);
    });
  }

  /* ---------------- Print ---------------- */
  function initPrintButtons() {
    document.querySelectorAll("[data-print]").forEach(btn => {
      btn.addEventListener("click", () => window.print());
    });
  }

  window.CBMM = {
    markModuleComplete, updateProgressBar, logEvent,
    initWhatsAppLinks, initRazorpayButtons, initModuleNav,
    renderQuiz, initPrintButtons, getProgress
  };

  document.addEventListener("DOMContentLoaded", function () {
    updateProgressBar();
    initWhatsAppLinks();
    // payments disabled in offline edition
    initModuleNav();
    initPrintButtons();
    // no login required
    const mod = document.body.getAttribute("data-module");
    logEvent("view", mod || "landing");
  });
})();

function injectAuthUI(){
  const actions = document.querySelector('.top-actions');
  if(actions && !document.getElementById('logoutLink')){
    const a = document.createElement('a');
    a.id = 'logoutLink';
    a.href = '#';
    a.className = 'icon-btn';
    a.textContent = '🚪 வெளியேறு';
    a.onclick = function(e){ e.preventDefault(); if(typeof logout === 'function') logout(); };
    actions.appendChild(a);
  }
  const brandText = document.querySelector('.brand-text');
  if(brandText && !document.getElementById('learnerNameDisplay')){
    const span = document.createElement('small');
    span.id = 'learnerNameDisplay';
    span.style.cssText = 'display:block;color:var(--gold,#c8a250);font-weight:600;';
    brandText.appendChild(span);
  }
}
