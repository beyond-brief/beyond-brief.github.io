// UX/UI Experience Studio: "Aster", a fictional travel-account app, shown as wireframe, UI design
// and a working prototype, plus a design-system explorer and the same app on tablet and desktop.
// One state model drives every view. Nothing is uploaded, captured or sent: "photos" are simulated,
// names are fictional, and progress stays in this browser until Reset.
(() => {
  const studio = document.querySelector("[data-ux-studio]");
  if (!studio) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- State ---------- */
  const KEY = "bb-ux-studio-v1";
  const fresh = () => ({ v: 1, docType: "passport", doc: "none", docTried: false, selfie: "none", selfieTried: false, consent: false, submitErr: false, submitted: false, review: 0, travel: false, help: null, slot: null, booked: null, errorPath: true });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch { S = null; }
  if (!S || S.v !== 1) S = fresh();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const ui = { screen: "home", mode: "proto", spec: null, q: "", open: null, device: "tablet", ds: "button", dsState: "default" };

  const idDone = () => S.doc === "ok" && S.selfie === "ok";
  const steps = () => [
    { k: "personal", t: "Personal details", m: "Name, date of birth, phone", st: "done" },
    { k: "address", t: "Home address", m: "Saved from your ID scan", st: "done" },
    { k: "identity", t: "Confirm it's you", m: "ID photo and a selfie · about 2 min", st: idDone() ? "done" : S.doc === "error" || S.selfie === "error" ? "action" : "todo", go: "verify" },
    { k: "review", t: "Review and submit", m: "Check your details and send", st: S.submitted ? "done" : idDone() ? "todo" : "locked", go: "details" },
  ];
  const doneCount = () => steps().filter((s) => s.st === "done").length;
  const complete = () => S.submitted && S.review >= 4;
  const REVIEW = [["Application submitted", "10:42"], ["Identity checked", "10:44"], ["Account approved", "10:47"], ["Card on its way", "10:48"]];

  /* ---------- Icons and art ---------- */
  const IC = {
    home: '<path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z"/>', file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>', help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 17h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', alert: '<path d="M12 4 21 19H3z"/><path d="M12 10v4M12 16.5h.01"/>',
    chev: '<path d="m10 6 6 6-6 6"/>', back: '<path d="m14 6-6 6 6 6"/>', cam: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>', id: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 15.5c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h4"/>',
    face: '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-3.5 3.7-5.5 7-5.5s6 2 7 5.5"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="m15.5 10.5 5-3v9l-5-3"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.6-4.6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z"/>', shield: '<path d="M12 3.5 19 6v5.5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z"/><path d="m9 12 2 2 4-4"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  };
  const ico = (k, s = 20) => `<svg class="ux-i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
  const LOGO = '<svg class="ux-logo-mark" viewBox="0 0 24 24" aria-hidden="true">' + Array.from({ length: 8 }, (_, i) => `<ellipse cx="12" cy="6.4" rx="2.3" ry="5" transform="rotate(${i * 45} 12 12)"/>`).join("") + '<circle cx="12" cy="12" r="2.4" class="c"/></svg>';
  const ring = (n, of = 4) => { const r = 26, c = 2 * Math.PI * r; return `<svg class="ux-ring" viewBox="0 0 64 64" role="img" aria-label="${n} of ${of} steps done"><circle cx="32" cy="32" r="${r}" class="tr"/><circle cx="32" cy="32" r="${r}" class="fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - n / of)}"/><text x="32" y="37" text-anchor="middle">${n}/${of}</text></svg>`; };
  const chip = (st) => ({ done: '<span class="ux-chip ok">Done</span>', todo: '<span class="ux-chip">To do</span>', action: '<span class="ux-chip warn">Needs a retake</span>', locked: '<span class="ux-chip mute">Locked</span>', review: '<span class="ux-chip info">In review</span>' })[st];
  const docArt = (state) => `<svg class="ux-doc" viewBox="0 0 200 128" aria-hidden="true"><rect x="2" y="2" width="196" height="124" rx="12" class="pl"/><rect x="16" y="24" width="48" height="60" rx="6" class="ph"/><circle cx="40" cy="46" r="11" class="ph2"/><path d="M24 80c3-10 9-14 16-14s13 4 16 14" class="ph2"/><rect x="78" y="28" width="96" height="9" rx="4" class="ln"/><rect x="78" y="46" width="70" height="7" rx="3.5" class="ln"/><rect x="78" y="61" width="84" height="7" rx="3.5" class="ln"/><rect x="16" y="98" width="168" height="8" rx="4" class="ln"/>${state === "error" ? '<path d="M110 0 70 128h46L156 0z" class="glare"/>' : ""}</svg>`;

  /* ---------- Screens ---------- */
  const top = (title, back) => `<header class="ux-head">${back ? `<button type="button" class="ux-icon-btn" data-ux-go="${back}" aria-label="Back">${ico("back")}</button>` : `<span class="ux-brand">${LOGO}<b>Aster</b></span>`}${title ? `<p class="ux-head-t">${title}</p>` : ""}<button type="button" class="ux-icon-btn" data-ux-go="help" aria-label="Help">${ico("help")}</button></header>`;
  const btn = (label, attrs, cls = "") => `<button type="button" class="ux-btn ${cls}" ${attrs}>${label}</button>`;
  const alert = (tone, title, body, spec = "alert") => `<div class="ux-alert ${tone}" role="${tone === "err" ? "alert" : "status"}" data-spec="${spec}">${ico(tone === "err" ? "alert" : "check", 18)}<div><b>${title}</b><p>${body}</p></div></div>`;

  const SCREENS = {
    home() {
      const n = doneCount();
      let card;
      if (complete()) card = `<section class="ux-card acct" data-spec="card" data-w="Account card"><div class="ux-acct-top"><span>${LOGO}Aster Travel</span><span>•• 4417</span></div><p class="ux-acct-bal"><small>Account open</small>€0.00</p><p class="ux-acct-meta">${S.travel ? "Card works abroad" : "Use abroad is off"} · Nigar A.</p>${btn("View account", 'data-ux-go="done"', "light")}</section>`;
      else if (S.submitted) card = `<section class="ux-card" data-spec="card" data-w="Status card"><div class="ux-card-row">${ring(Math.min(4, S.review), 4)}<div><small>Travel account application</small><b>We're checking it</b><span>Usually under 10 minutes</span></div></div>${btn("Track progress", 'data-ux-go="progress"', "light")}</section>`;
      else { const next = steps().find((s) => s.st !== "done"); card = `<section class="ux-card" data-spec="card" data-w="Application card"><div class="ux-card-row">${ring(n)}<div><small>Travel account application</small><b>${n} of 4 steps done</b><span>Next: ${next.t.toLowerCase()}</span></div></div>${btn(next.k === "review" ? "Review and submit" : "Continue", `data-ux-go="${next.go}" data-spec="btn"`, "light")}</section>`; }
      return `${top()}<div class="ux-scroll"><h1 class="ux-display" data-spec="display" data-w="H1">Good morning, Nigar</h1>${card}
        <h2 class="ux-h2" data-w="H2">${complete() ? "All set" : "Your steps"}</h2>
        <ol class="ux-tasks" data-spec="task">${steps().map((s) => { const tag = s.go && s.st !== "locked" && s.st !== "done" ? "button" : "div"; return `<li><${tag} ${tag === "button" ? `type="button" data-ux-go="${s.go}"` : ""} class="ux-task ${s.st}"><span class="ux-task-i">${ico(s.st === "done" ? "check" : s.st === "locked" ? "lock" : s.st === "action" ? "alert" : s.k === "identity" ? "id" : "file", 18)}</span><span class="ux-task-t"><b>${s.t}</b><small>${s.m}</small></span>${chip(S.submitted && s.k === "review" ? "review" : s.st)}</${tag}></li>`; }).join("")}</ol>
        <p class="ux-note" data-spec="tip">${ico("shield", 18)}<span>Saved as you go. Stop any time and carry on from any device.</span></p></div>`;
    },
    details() {
      const ready = idDone() && !S.submitted;
      return `${top("Your application", "home")}<div class="ux-scroll"><h1 class="ux-display sm" data-spec="display" data-w="H1">Travel account</h1>
        <section class="ux-fees" data-spec="fees" data-w="Fee summary"><h2 class="ux-h3">Every fee, in one place</h2><dl><div><dt>Monthly fee</dt><dd>€0</dd></div><div><dt>Paying abroad</dt><dd>0% up to €3,000 a month</dd></div><div><dt>Cash abroad</dt><dd>2 free withdrawals a month</dd></div></dl></section>
        <section class="ux-list" data-w="Detail list"><h2 class="ux-h3">Your details</h2><dl><div><dt>Name</dt><dd>Nigar A.</dd></div><div><dt>Phone</dt><dd>•••• 214</dd></div><div><dt>Address</dt><dd>Saved</dd></div><div><dt>Identity</dt><dd>${chip(idDone() ? "done" : S.doc === "error" || S.selfie === "error" ? "action" : "todo")}</dd></div></dl></section>
        ${S.submitted ? alert("ok", "Submitted at 10:42", "We'll let you know as soon as the checks are done.") : ready ? `<label class="ux-check${S.submitErr ? " err" : ""}" data-spec="check"><input type="checkbox" data-ux-act="consent" ${S.consent ? "checked" : ""} aria-describedby="ux-consent-err"><span>I confirm these details are correct</span></label>${S.submitErr ? '<p class="ux-field-err" id="ux-consent-err">Tick the box to confirm your details before you submit.</p>' : ""}` : ""}
        <div class="ux-actions">${S.submitted ? btn("Track progress", 'data-ux-go="progress"') : ready ? btn("Submit application", 'data-ux-act="submit" data-spec="btn"') : btn("Continue to identity check", 'data-ux-go="verify" data-spec="btn"')}</div></div>`;
    },
    verify() {
      const st = (v) => (v === "ok" ? "done" : v === "error" ? "action" : "todo");
      const next = S.doc !== "ok" ? btn(S.doc === "error" ? "Retake ID photo" : "Start with your ID", 'data-ux-go="doc" data-spec="btn"') : S.selfie !== "ok" ? btn(S.selfie === "error" ? "Retake selfie" : "Take a selfie", 'data-ux-go="selfie" data-spec="btn"') : btn("Review and submit", 'data-ux-go="details" data-spec="btn"');
      return `${top("", "home")}<div class="ux-scroll"><div class="ux-progress" data-spec="progress" data-w="Step progress"><span>Step 3 of 4</span><i><b style="width:${idDone() ? 100 : 75}%"></b></i></div>
        <h1 class="ux-display" data-spec="display" data-w="H1">Confirm it's you</h1><p class="ux-lead" data-w="Lead">Takes about two minutes. Your answers so far are saved.</p>
        <ol class="ux-tasks" data-spec="task"><li><button type="button" data-ux-go="doc" class="ux-task ${st(S.doc)}"><span class="ux-task-i">${ico(S.doc === "ok" ? "check" : "id", 18)}</span><span class="ux-task-t"><b>Photo of your ID</b><small>Passport or national ID card</small></span>${chip(st(S.doc))}</button></li>
        <li><button type="button" data-ux-go="selfie" class="ux-task ${st(S.selfie)}" ${S.doc === "ok" ? "" : "disabled"}><span class="ux-task-i">${ico(S.selfie === "ok" ? "check" : "face", 18)}</span><span class="ux-task-t"><b>A quick selfie</b><small>We match it to your ID photo</small></span>${chip(S.doc === "ok" ? st(S.selfie) : "locked")}</button></li></ol>
        ${idDone() ? alert("ok", "Identity confirmed", "Thanks, Nigar. One step left.") : ""}
        <div class="ux-actions">${next}<button type="button" class="ux-link" data-ux-act="video">Can't use your camera? Book a video call</button></div></div>`;
    },
    doc() {
      const bad = S.docType === "licence";
      const frame = S.doc === "ok" ? "ok" : S.doc === "error" ? "error" : "idle";
      return `${top("ID photo", "verify")}<div class="ux-scroll"><h1 class="ux-display sm" data-spec="display" data-w="H1">Photo of your ID</h1>
        <div class="ux-seg${bad ? " err" : ""}" role="radiogroup" aria-label="Document type" data-spec="seg">${[["passport", "Passport"], ["idcard", "ID card"], ["licence", "Driving licence"]].map(([k, l]) => `<button type="button" role="radio" aria-checked="${S.docType === k}" data-ux-act="doctype" data-v="${k}" ${S.doc === "ok" ? "disabled" : ""}>${l}</button>`).join("")}</div>
        ${bad ? '<p class="ux-field-err" role="alert">A driving licence can\'t open a travel account. Choose a passport or an ID card.</p>' : ""}
        <figure class="ux-frame ${frame}" data-spec="frame" data-w="Camera frame"><span class="ux-corners" aria-hidden="true"></span>${docArt(S.doc)}${S.doc === "ok" ? `<span class="ux-frame-ok">${ico("check", 26)}</span>` : ""}<figcaption>${S.doc === "ok" ? "Document captured" : S.doc === "error" ? "Light is reflecting off the document" : "Fit all four corners inside the frame"}</figcaption></figure>
        ${S.doc === "error" ? alert("err", "We couldn't read your ID", "Light is reflecting off the document. Tilt it away from the lamp or window and try again.") : S.doc === "ok" ? alert("ok", "That's clear", "We can read everything we need.") : `<ul class="ux-tips" data-w="Tips"><li>${ico("sun", 16)}No glare or shadows</li><li>${ico("id", 16)}All four corners visible</li></ul>`}
        <div class="ux-actions">${S.doc === "ok" ? btn("Continue to selfie", 'data-ux-go="selfie" data-spec="btn"') : btn(`${ico("cam", 18)}${S.doc === "error" ? "Retake photo" : "Take photo"}`, `data-ux-act="capdoc" data-spec="btn" ${bad ? "disabled" : ""}`)}</div>
        <p class="ux-fine">Demo: no camera is used and no photo is taken.</p></div>`;
    },
    selfie() {
      const f = S.selfie;
      return `${top("Selfie", "verify")}<div class="ux-scroll"><h1 class="ux-display sm" data-spec="display" data-w="H1">A quick selfie</h1><p class="ux-lead" data-w="Lead">Look straight at the camera in good light.</p>
        <figure class="ux-oval ${f}" data-spec="frame" data-w="Camera frame"><span class="ux-oval-in">${ico(f === "ok" ? "check" : "face", 44)}</span><figcaption>${f === "ok" ? "That's you" : f === "error" ? "Too dark to match" : "Centre your face in the oval"}</figcaption></figure>
        ${f === "error" ? alert("err", "We couldn't match your selfie", "The photo was too dark. Face a window or a lamp and try again.") : f === "ok" ? alert("ok", "Thanks, that's you", "Your identity is confirmed.") : ""}
        <div class="ux-actions">${f === "ok" ? btn("Continue", 'data-ux-go="verify" data-spec="btn"') : `${btn(`${ico("cam", 18)}${f === "error" ? "Retake selfie" : "Take selfie"}`, `data-ux-act="capselfie" data-spec="btn" ${S.doc === "ok" ? "" : "disabled"}`)}${f === "error" ? btn(`${ico("video", 18)}Video call with our team`, 'data-ux-act="video"', "ghost") : ""}`}</div>
        ${S.doc !== "ok" ? '<p class="ux-fine">Take a photo of your ID first.</p>' : '<p class="ux-fine">Demo: no camera is used and no photo is taken.</p>'}</div>`;
    },
    progress() {
      if (!S.submitted) return `${top("Progress", "home")}<div class="ux-scroll ux-empty" data-spec="empty" data-w="Empty state"><span class="ux-empty-art">${ico("clock", 40)}</span><h1 class="ux-display sm">Nothing to track yet</h1><p class="ux-lead">Submit your application and you'll see each check here as it happens.</p><div class="ux-actions">${btn("Go to your application", 'data-ux-go="details"')}</div></div>`;
      return `${top("Progress", "home")}<div class="ux-scroll"><h1 class="ux-display sm" data-spec="display" data-w="H1">${complete() ? "You're approved" : "We're checking your application"}</h1><p class="ux-lead">${complete() ? "Your account and card are ready." : "Usually under 10 minutes. We'll also send a notification."}</p>
        <ol class="ux-time" data-spec="timeline" data-w="Timeline">${REVIEW.map(([t, tm], i) => { const st = S.review > i ? "done" : S.review === i ? "now" : "next"; return `<li class="${st}"><span class="dot">${st === "done" ? ico("check", 14) : ""}</span><b>${t}</b><small>${st === "done" ? tm : st === "now" ? "In progress" : "Up next"}</small></li>`; }).join("")}</ol>
        <div class="ux-actions">${complete() ? btn("Open your account", 'data-ux-go="done" data-spec="btn"') : btn("Checking…", 'disabled data-spec="btn"', "loading")}</div></div>`;
    },
    done() {
      if (!complete()) return `${top("Account", "home")}<div class="ux-scroll ux-empty" data-spec="empty" data-w="Empty state"><span class="ux-empty-art">${ico("lock", 40)}</span><h1 class="ux-display sm">Your account isn't open yet</h1><p class="ux-lead">${S.submitted ? "We're still checking. It usually takes under 10 minutes." : `${4 - doneCount()} step${4 - doneCount() === 1 ? "" : "s"} left before you can submit.`}</p><div class="ux-actions">${btn(S.submitted ? "Track progress" : "Carry on", `data-ux-go="${S.submitted ? "progress" : "home"}"`)}</div></div>`;
      return `${top("Account", "home")}<div class="ux-scroll"><div class="ux-success" data-w="Success">${ico("check", 30)}</div><h1 class="ux-display" data-spec="display" data-w="H1">Your account is open</h1>
        <section class="ux-card acct" data-spec="card" data-w="Account card"><div class="ux-acct-top"><span>${LOGO}Aster Travel</span><span>•• 4417</span></div><p class="ux-acct-bal"><small>Balance</small>€0.00</p><p class="ux-acct-meta">Nigar A. · fictional card</p></section>
        <label class="ux-switch" data-spec="toggle" data-w="Switch"><span><b>Use my card abroad</b><small>${S.travel ? "On. Payments abroad will go through." : "You're travelling soon. Turn this on so your first payment works."}</small></span><input type="checkbox" role="switch" data-ux-act="travel" ${S.travel ? "checked" : ""}><i aria-hidden="true"></i></label>
        <div class="ux-actions">${btn("Go to home", 'data-ux-go="home" data-spec="btn"')}</div></div>`;
    },
    help() {
      const q = ui.q.trim().toLowerCase(), list = ARTICLES.filter((a) => !q || (a[0] + " " + a[1]).toLowerCase().includes(q));
      const ctx = [`Travel account application`, `Step: ${idDone() ? (S.submitted ? "in review" : "review and submit") : "identity check"}`, S.selfie === "error" ? "Last issue: selfie too dark" : S.doc === "error" ? "Last issue: glare on ID photo" : ""].filter(Boolean);
      const person = S.help === "chat"
        ? `<div class="ux-handoff" data-spec="handoff" data-w="Handover">${ico("chat", 18)}<div><b>A person joins in about 2 minutes</b><p>They'll already see:</p><ul>${ctx.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><button type="button" class="ux-link" data-ux-act="endhelp">End chat</button></div></div>`
        : S.help === "video"
          ? S.booked ? alert("ok", `Video call booked for today at ${S.booked}`, "We'll send a link 10 minutes before. Have your ID with you.") + '<button type="button" class="ux-link" data-ux-act="unbook">Cancel the call</button>'
            : `<div class="ux-slots" data-spec="slots" data-w="Time slots"><p class="ux-h3">Pick a time today</p><div role="radiogroup" aria-label="Video call time">${["14:00", "14:30", "16:00"].map((t) => `<button type="button" role="radio" aria-checked="${S.slot === t}" data-ux-act="slot" data-v="${t}">${t}</button>`).join("")}</div>${btn("Book video call", `data-ux-act="book" ${S.slot ? "" : "disabled"}`)}<button type="button" class="ux-link" data-ux-act="endhelp">Not now</button></div>`
          : `<div class="ux-people"><button type="button" class="ux-person" data-ux-act="chat">${ico("chat")}<span><b>Chat with a person</b><small>Your application comes with you</small></span></button><button type="button" class="ux-person" data-ux-act="video">${ico("video")}<span><b>Video call</b><small>Verify with our team instead</small></span></button></div>`;
      return `${top("Help", "home")}<div class="ux-scroll"><h1 class="ux-display sm" data-spec="display" data-w="H1">How can we help?</h1>
        <label class="ux-search" data-spec="input" data-w="Search field">${ico("search", 18)}<span class="sr-only">Search help</span><input type="search" data-ux-act="search" placeholder="Search, e.g. selfie" value="${esc(ui.q)}" autocomplete="off"></label>
        <div class="ux-faq" data-spec="accordion" data-w="Answers">${list.length ? list.map((a, i) => { const id = ARTICLES.indexOf(a), on = ui.open === id; return `<div class="ux-qa${on ? " on" : ""}"><button type="button" aria-expanded="${on}" data-ux-act="qa" data-v="${id}"><span>${a[0]}</span>${ico("chev", 18)}</button>${on ? `<p>${a[1]}</p>` : ""}</div>`; }).join("") : `<div class="ux-empty-s" role="status"><b>No answers for “${esc(ui.q)}”</b><p>Try “selfie” or “abroad”, or talk to a person below.</p></div>`}</div>
        <h2 class="ux-h2" data-w="H2">Talk to a person</h2>${person}</div>`;
    },
  };
  const ARTICLES = [
    ["How long does the identity check take?", "About two minutes for the photos, then usually under ten minutes for us to check."],
    ["My selfie keeps failing", "Most failures are lighting. Face a window or a lamp, take off sunglasses, and hold the phone at eye level. Or book a video call."],
    ["Which documents can I use?", "A passport or a national ID card. A driving licence can't open a travel account."],
    ["Is my progress saved if I stop?", "Yes. Every step saves automatically, and you can carry on from any device."],
    ["Using your card abroad", "Turn on 'Use my card abroad' when your account opens, so your first payment goes through."],
  ];
  const NAV = [["home", "Home", "home"], ["details", "Application", "file"], ["help", "Help", "help"]];
  const navOf = (s) => ({ verify: "details", doc: "details", selfie: "details", progress: "details", done: "home" })[s] || s;
  const aside = () => `<aside class="ux-aside" aria-label="Application summary"><p class="ux-h3">Your application</p><ol class="ux-mini">${steps().map((s) => `<li class="${s.st}">${ico(s.st === "done" ? "check" : s.st === "locked" ? "lock" : "file", 14)}<span>${s.t}</span></li>`).join("")}</ol><div class="ux-aside-help">${ico("chat", 18)}<span><b>Stuck?</b><small>A person can pick up where you are.</small></span><button type="button" class="ux-link" data-ux-go="help">Get help</button></div></aside>`;
  const app = (screen) => `<div class="ux-shell"><div class="ux-app" data-screen="${screen}">
      <nav class="ux-nav" aria-label="Aster"><span class="ux-brand ux-nav-brand">${LOGO}<b>Aster</b></span>${NAV.map(([k, l, i]) => `<button type="button" data-ux-go="${k}" ${navOf(screen) === k ? 'aria-current="page"' : ""} data-spec="nav">${ico(i)}<span>${l}</span></button>`).join("")}</nav>
      <main class="ux-main" data-ux-screen="${screen}">${SCREENS[screen]()}</main>${aside()}</div></div>`;

  /* ---------- Studio panels ---------- */
  const SCREEN_LIST = [["home", "Home"], ["details", "Application"], ["verify", "Verification"], ["doc", "ID upload"], ["selfie", "Selfie"], ["progress", "Progress"], ["done", "Completion"], ["help", "Help"]];
  const FLOW = { home: ["details", "verify", "help"], details: ["verify", "progress"], verify: ["doc", "selfie", "details"], doc: ["selfie"], selfie: ["verify", "help"], progress: ["done"], done: ["home"], help: ["home"] };
  const HIER = {
    home: ["Where I am: greeting and application status", "What to do next: one primary action on the card", "The whole path: four steps with their state", "Reassurance: progress is saved"],
    details: ["Product and every fee in one place", "My details, masked where sensitive", "Confirmation, then the one action that sends it"],
    verify: ["Step 3 of 4 and a progress bar", "Time it takes, and that answers are saved", "Two tasks, each with a clear state", "One primary action, plus a way out"],
    doc: ["Which document: a single choice", "The camera frame and what good looks like", "Feedback in plain words", "Take or retake"],
    selfie: ["The oval and one instruction", "What went wrong and how to fix it", "Retry first, then a person"],
    progress: ["Status in one sentence", "Each check as it happens", "Next action when ready"],
    done: ["Success, said plainly", "The new account", "The one setting that matters before travelling"],
    help: ["Search first", "Short answers that open in place", "A person, with context attached"],
  };
  const NOTES = {
    home: "One primary action per screen. The card always says what's next, so a five-minute gap between meetings is enough to move forward.",
    details: "Every fee sits in one place. That answers the Journey Lab's first finding: costs were spread across three pages.",
    verify: "'Step 3 of 4', a time estimate and 'answers saved' make the check feel finite, not a dead end.",
    doc: "A driving licence is refused at the choice, before the photo, not after it.",
    selfie: "Failure explains itself and offers a retry, then a video call instead of a branch visit.",
    progress: "Each check appears as it happens, which removes the 'where is my application?' call.",
    done: "Travel use is asked for here, so the first payment abroad goes through. In the old journey it was declined.",
    help: "The person who picks up already sees the application and the last error, so nobody starts again.",
  };
  const SPEC = {
    display: ["Display heading", "30/34 · Bold · ink-900 · one per screen"], card: ["Application card", "Radius 24 · ultramarine-600 · on-primary text · holds the one next action"], ring: ["Progress ring", "56px · 6px stroke · apricot-400 on ultramarine-800"],
    btn: ["Primary button", "52px high · radius 16 · states: default, pressed, disabled, loading"], task: ["Task row", "Whole row is the target · 64px min · status icon, title, meta, chip"], tip: ["Inline note", "Info tint · icon + 14/20 text · never a blocker"],
    nav: ["Navigation", "Tab bar on mobile, rail on tablet, sidebar on desktop · 3 destinations"], fees: ["Fee summary", "Definition list · label left, value right · tabular figures"], check: ["Checkbox", "24px box · 44px target · inline error below"],
    progress: ["Step progress", "Label + 6px bar · ultramarine-600 on mist-200"], alert: ["Alert", "Error or success · title says what happened, body says how to fix it"], seg: ["Segmented control", "Single choice · error state outlines in error-600"],
    frame: ["Capture frame", "Corner guides · the frame colour carries the state"], timeline: ["Timeline", "Done, current, upcoming · times on the right"], empty: ["Empty state", "Icon + what's missing + one way forward"],
    toggle: ["Switch", "44px target · on = ultramarine-600 · consequence written beside it"], input: ["Search field", "48px · leading icon · filters as you type"], accordion: ["Disclosure", "Question as the button · answer opens in place"],
    handoff: ["Handover card", "Shows what the person will already see"], slots: ["Time picker", "Radio group · disabled button until a time is chosen"],
  };
  const tasks = () => [["Start the identity check", S.doc !== "none"], ["Photograph your ID", S.doc === "ok"], ["Take a selfie", S.selfie === "ok"], ["Submit the application", S.submitted], ["Turn on card use abroad", S.travel]];

  function panel() {
    const s = ui.screen;
    if (ui.mode === "wire") return `<p class="uxs-k">Information architecture</p><div class="uxs-flow" role="group" aria-label="Screens and flow">${SCREEN_LIST.map(([k, l]) => `<button type="button" class="uxs-node${k === s ? " on" : FLOW[s].includes(k) ? " next" : ""}" data-uxs-go="${k}">${l}</button>`).join("")}</div>
      <p class="uxs-cap">Highlighted: screens you can reach from <b>${SCREEN_LIST.find((x) => x[0] === s)[1]}</b>.</p>
      <p class="uxs-k">Hierarchy on this screen</p><ol class="uxs-hier">${HIER[s].map((h) => `<li>${h}</li>`).join("")}</ol>`;
    if (ui.mode === "ui") {
      const keys = [...new Set([...studio.querySelectorAll(".uxs-device [data-spec]")].map((e) => e.dataset.spec))];
      return `<p class="uxs-k">Specs on this screen</p><ol class="uxs-specs">${keys.map((k, i) => `<li><button type="button" data-uxs-spec="${k}" aria-pressed="${ui.spec === k}"><span class="n">${i + 1}</span><span><b>${SPEC[k][0]}</b><small>${SPEC[k][1]}</small></span></button></li>`).join("")}</ol>
        <p class="uxs-k">Tokens</p><ul class="uxs-tokens"><li style="--c:#3A2CF0">ultramarine-600</li><li style="--c:#FF9D6E">apricot-400</li><li style="--c:#14141C">ink-900</li><li style="--c:#F5F4F1">porcelain-50</li><li style="--c:#138A5E">success-600</li><li style="--c:#C8372D">error-600</li></ul>`;
    }
    const t = tasks(), d = t.filter((x) => x[1]).length;
    return `<p class="uxs-k">Your task · ${d} of ${t.length}</p><ol class="uxs-tasks">${t.map(([l, ok]) => `<li class="${ok ? "ok" : ""}"><span>${l}</span>${ok ? '<span class="sr-only"> (done)</span>' : ""}</li>`).join("")}</ol>
      <label class="uxs-toggle"><input type="checkbox" data-uxs-errpath ${S.errorPath ? "checked" : ""}><span><b>Show the error path</b><small>The first ID photo and selfie fail, so you can see recovery.</small></span></label>
      <p class="uxs-k">Why it's designed this way</p><p class="uxs-note">${NOTES[s]}</p>`;
  }

  /* ---------- Studio shell ---------- */
  studio.innerHTML = `<div class="uxs-bar">
      <div class="uxs-modes" role="group" aria-label="Design mode">${[["wire", "Wireframe"], ["ui", "UI design"], ["proto", "Prototype"]].map(([k, l]) => `<button type="button" data-uxs-mode="${k}">${l}</button>`).join("")}</div>
      <p class="uxs-hint" data-uxs-hint></p>
      <button type="button" class="uxs-reset" data-uxs-reset>Reset demo</button></div>
    <div class="uxs-body">
      <nav class="uxs-screens" aria-label="Prototype screens">${SCREEN_LIST.map(([k, l], i) => `<button type="button" data-uxs-go="${k}"><span>0${i + 1}</span>${l}</button>`).join("")}</nav>
      <div class="uxs-stage"><div class="uxs-device" data-mode="proto"><div class="uxs-notch" aria-hidden="true"><span>9:41</span><i></i></div><div class="uxs-screen" data-uxs-app></div><div class="uxs-pins" aria-hidden="true"></div></div></div>
      <aside class="uxs-panel" data-uxs-panel aria-live="polite"></aside>
    </div>
    <p class="sr-only" aria-live="polite" data-uxs-live></p>`;
  const $ = (s, r = studio) => r.querySelector(s);
  const say = (t) => { $("[data-uxs-live]").textContent = t; };
  const HINTS = { wire: "Structure only: layout, hierarchy and flow. Use the map to move between screens.", ui: "The designed screens. Pick a spec to see where it's used.", proto: "Everything works. Try to open the account." };

  function pins() {
    const box = $(".uxs-pins"); box.innerHTML = "";
    if (ui.mode !== "ui") return;
    const dev = $(".uxs-device").getBoundingClientRect(), seen = [];
    studio.querySelectorAll(".uxs-device [data-spec]").forEach((el) => {
      const k = el.dataset.spec; if (seen.includes(k)) return; seen.push(k);
      const r = el.getBoundingClientRect(), sc = dev.width / $(".uxs-device").offsetWidth || 1;
      box.insertAdjacentHTML("beforeend", `<span class="uxs-pin${ui.spec === k ? " on" : ""}" style="left:${(r.left - dev.left) / sc - 6}px;top:${(r.top - dev.top) / sc - 6}px">${seen.length}</span>`);
      el.classList.toggle("uxs-hl", ui.spec === k);
    });
  }

  /* ---------- Responsive preview and design system ---------- */
  const resp = document.querySelector("[data-ux-responsive]");
  const DEV = { mobile: [390, 780], tablet: [820, 1000], desktop: [1280, 800] };
  if (resp) resp.innerHTML = `<div class="uxr-bar"><div class="uxr-devs" role="group" aria-label="Device">${Object.keys(DEV).map((k) => `<button type="button" data-uxr-dev="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div><p class="uxr-cap" data-uxr-cap></p></div><div class="uxr-fit"><div class="uxr-frame" data-uxr-frame><div class="uxr-chrome" aria-hidden="true"><i></i><i></i><i></i><span>app.aster.example</span></div><div class="uxr-screen" data-uxr-app></div></div></div>`;
  const CAPS = { mobile: "Bottom tab bar, one column, one action per screen.", tablet: "Navigation moves to a rail. Cards and tasks sit side by side.", desktop: "A sidebar, a wider canvas, and the application summary always in view." };
  function fit() {
    if (!resp) return;
    const [w, h] = DEV[ui.device], wrap = resp.querySelector(".uxr-fit"), fr = resp.querySelector("[data-uxr-frame]");
    const s = Math.min(1, (wrap.clientWidth - 2) / w, 680 / (h + (ui.device === "desktop" ? 36 : 0)));
    fr.style.width = w + "px"; fr.style.height = h + (ui.device === "desktop" ? 36 : 0) + "px"; fr.style.transform = `scale(${s})`;
    wrap.style.height = (h + (ui.device === "desktop" ? 36 : 0)) * s + "px";
  }

  const ds = document.querySelector("[data-ux-ds]");
  const DS = {
    button: { name: "Button", states: ["default", "pressed", "disabled", "loading"], used: ["home", "verify", "doc", "details"], tokens: { default: "ultramarine-600 · on-primary · 52px · radius 16", pressed: "ultramarine-800 · scale 0.98", disabled: "mist-200 · ink-400 text · not focusable as an action", loading: "ultramarine-600 · spinner · label stays" } },
    input: { name: "Input", states: ["default", "focus", "error", "disabled"], used: ["help"], tokens: { default: "porcelain-50 · mist-300 border · 48px", focus: "ultramarine-600 ring 3px · label stays visible", error: "error-600 border · message below, linked by aria-describedby", disabled: "mist-100 · ink-400" } },
    status: { name: "Status chip", states: ["to do", "in review", "done", "needs action"], used: ["home", "verify", "details"], tokens: { "to do": "mist-100 · ink-700", "in review": "ultramarine-50 · ultramarine-700", done: "success-50 · success-700", "needs action": "warning-50 · warning-700 · never colour alone: words too" } },
    nav: { name: "Navigation", states: ["mobile", "tablet", "desktop"], used: ["home", "details", "help"], tokens: { mobile: "Bottom tab bar · 3 items · 64px", tablet: "Icon rail with labels · 96px", desktop: "Sidebar with brand · 240px" } },
    type: { name: "Type", states: ["display", "heading", "body", "caption"], used: ["home", "verify", "done"], tokens: { display: "30/34 Bold · −0.02em", heading: "18/24 Bold", body: "15/22 Regular", caption: "12.5/16 Medium · ink-600" } },
    color: { name: "Colour", states: ["primary", "accent", "success", "error"], used: ["home", "doc", "selfie", "done"], tokens: { primary: "ultramarine-600 #3A2CF0 · 8.7:1 on white", accent: "apricot-400 #FF9D6E · highlights only, never text", success: "success-600 #138A5E · 4.9:1 on white", error: "error-600 #C8372D · 5.2:1 on white" } },
  };
  function dsPreview() {
    const c = ui.ds, st = ui.dsState;
    if (c === "button") return `<button type="button" class="ux-btn ${st === "pressed" ? "is-pressed" : st === "loading" ? "loading" : ""}" ${st === "disabled" ? "disabled" : ""} tabindex="-1">${st === "loading" ? "Checking…" : "Continue"}</button>`;
    if (c === "input") return `<div class="uxd-field ${st}"><span class="uxd-label">Phone number</span><span class="ux-search as-input${st === "focus" ? " focus" : ""}">${ico("search", 18)}<span class="uxd-val">${st === "default" ? '<i>e.g. 050 123 45 67</i>' : st === "disabled" ? "Locked after submit" : "050 123"}</span></span>${st === "error" ? '<span class="ux-field-err">Enter all ten digits.</span>' : ""}</div>`;
    if (c === "status") return chip({ "to do": "todo", "in review": "review", done: "done", "needs action": "action" }[st]);
    if (c === "nav") return `<div class="uxd-nav ${st}">${NAV.map(([k, l, i], n) => `<span class="${n === 0 ? "on" : ""}">${ico(i, 18)}<b>${l}</b></span>`).join("")}</div>`;
    if (c === "type") return `<p class="uxd-type ${st}">${{ display: "Confirm it's you", heading: "Your steps", body: "Takes about two minutes. Your answers so far are saved.", caption: "Step 3 of 4" }[st]}</p>`;
    return `<div class="uxd-sw ${st}"><i></i><b>${DS.color.tokens[st].split(" · ")[0]}</b></div>`;
  }
  function renderDS() {
    if (!ds) return;
    const d = DS[ui.ds];
    if (!d.states.includes(ui.dsState)) ui.dsState = d.states[0];
    ds.innerHTML = `<div class="uxd-tabs" role="tablist" aria-label="Components">${Object.entries(DS).map(([k, v]) => `<button type="button" role="tab" id="uxd-t-${k}" aria-selected="${k === ui.ds}" tabindex="${k === ui.ds ? 0 : -1}" data-uxd="${k}">${v.name}</button>`).join("")}</div>
      <div class="uxd-body" role="tabpanel" aria-labelledby="uxd-t-${ui.ds}">
        <div class="uxd-stage"><div class="uxd-live ux-shell">${dsPreview()}</div></div>
        <div class="uxd-side"><p class="uxs-k">State</p><div class="uxd-states" role="radiogroup" aria-label="${d.name} state">${d.states.map((s) => `<button type="button" role="radio" aria-checked="${s === ui.dsState}" data-uxd-state="${s}">${s}</button>`).join("")}</div>
          <p class="uxs-k">Tokens</p><p class="uxd-tok">${d.tokens[ui.dsState]}</p>
          <p class="uxs-k">Used on</p><div class="uxd-used">${d.used.map((k) => `<button type="button" data-uxd-open="${k}">${SCREEN_LIST.find((x) => x[0] === k)[1]} ${ico("chev", 14)}</button>`).join("")}</div></div></div>`;
  }

  /* ---------- Render ---------- */
  function render(focus) {
    const dev = $(".uxs-device");
    dev.dataset.mode = ui.mode;
    studio.querySelectorAll("[data-uxs-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.uxsMode === ui.mode)));
    studio.querySelectorAll("[data-uxs-go]").forEach((b) => b.toggleAttribute("aria-current", b.dataset.uxsGo === ui.screen && !b.closest(".uxs-panel")));
    $("[data-uxs-hint]").textContent = HINTS[ui.mode];
    const host = $("[data-uxs-app]");
    host.innerHTML = app(ui.screen);
    host.toggleAttribute("inert", ui.mode !== "proto");
    $("[data-uxs-panel]").innerHTML = panel();
    requestAnimationFrame(pins);
    if (resp) {
      resp.querySelectorAll("[data-uxr-dev]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.uxrDev === ui.device)));
      resp.querySelector("[data-uxr-frame]").dataset.dev = ui.device;
      resp.querySelector("[data-uxr-cap]").textContent = CAPS[ui.device];
      resp.querySelector("[data-uxr-app]").innerHTML = app(ui.screen);
      fit();
    }
    renderDS();
    if (focus) (typeof focus === "string" ? document.querySelector(focus) : focus)?.focus({ preventScroll: true });
  }
  function go(screen, from) {
    ui.screen = screen; ui.spec = null;
    $(".uxs-device").classList.remove("swap"); void $(".uxs-device").offsetWidth; if (!reduce()) $(".uxs-device").classList.add("swap");
    render();
    say(`${SCREEN_LIST.find((x) => x[0] === screen)[1]} screen.`);
    if (from) from.querySelector(".ux-display")?.setAttribute("tabindex", "-1"), from.querySelector(".ux-display")?.focus({ preventScroll: true });
  }

  // Review checks advance on their own once submitted.
  let timer = 0;
  function tick() {
    clearTimeout(timer);
    if (S.submitted && S.review < 4) timer = setTimeout(() => { S.review++; save(); render(); if (S.review === 4) say("Approved. Your account is ready."); tick(); }, 1500);
  }

  function act(a, el, root) {
    if (a === "doctype") { S.docType = el.dataset.v; S.doc = S.doc === "error" ? "none" : S.doc; }
    else if (a === "capdoc") { if (S.docType === "licence") return; S.doc = S.errorPath && !S.docTried ? "error" : "ok"; S.docTried = true; say(S.doc === "ok" ? "ID photo accepted." : "We couldn't read your ID. Light is reflecting off it."); }
    else if (a === "capselfie") { if (S.doc !== "ok") return; S.selfie = S.errorPath && !S.selfieTried ? "error" : "ok"; S.selfieTried = true; say(S.selfie === "ok" ? "Selfie matched. Identity confirmed." : "We couldn't match your selfie. It was too dark."); }
    else if (a === "consent") { S.consent = el.checked; if (S.consent) S.submitErr = false; }
    else if (a === "submit") { if (!S.consent) { S.submitErr = true; save(); render(); root.querySelector("[data-ux-act=consent]")?.focus(); say("Tick the box to confirm your details."); return; } S.submitted = true; S.review = 1; S.submitErr = false; save(); tick(); return go("progress", root); }
    else if (a === "travel") { S.travel = el.checked; say(S.travel ? "Card use abroad is on." : "Card use abroad is off."); }
    else if (a === "video") { S.help = "video"; save(); return go("help", root); }
    else if (a === "chat") { S.help = "chat"; say("Chat started. Your application details are shared."); }
    else if (a === "endhelp") { S.help = null; S.slot = null; }
    else if (a === "slot") { S.slot = el.dataset.v; }
    else if (a === "book") { if (!S.slot) return; S.booked = S.slot; say(`Video call booked for ${S.slot}.`); }
    else if (a === "unbook") { S.booked = null; S.slot = null; S.help = null; }
    else if (a === "qa") { const v = +el.dataset.v; ui.open = ui.open === v ? null : v; }
    save(); render(); root.querySelector(`[data-ux-act="${a}"]${el.dataset.v ? `[data-v="${el.dataset.v}"]` : ""}`)?.focus({ preventScroll: true });
  }

  // Both live apps (studio phone and responsive preview) share one handler and one state.
  const onApp = (root) => {
    root.addEventListener("click", (e) => {
      const g = e.target.closest("[data-ux-go]"), a = e.target.closest("[data-ux-act]");
      if (g && !g.disabled) return go(g.dataset.uxGo, root);
      if (a && !a.disabled && a.type !== "checkbox" && a.type !== "search") act(a.dataset.uxAct, a, root);
    });
    root.addEventListener("change", (e) => { const a = e.target.closest("[data-ux-act]"); if (a && a.type === "checkbox") act(a.dataset.uxAct, a, root); });
    root.addEventListener("input", (e) => {
      if (!e.target.matches("[data-ux-act=search]")) return;
      ui.q = e.target.value.slice(0, 40); ui.open = null;
      const pos = e.target.selectionStart; render();
      const f = root.querySelector("[data-ux-act=search]"); f?.focus(); f?.setSelectionRange(pos, pos);
    });
  };
  onApp($("[data-uxs-app]"));
  if (resp) onApp(resp.querySelector("[data-uxr-app]"));

  studio.addEventListener("click", (e) => {
    const m = e.target.closest("[data-uxs-mode]"), g = e.target.closest("[data-uxs-go]"), sp = e.target.closest("[data-uxs-spec]");
    if (m) { ui.mode = m.dataset.uxsMode; ui.spec = null; render(`[data-uxs-mode="${ui.mode}"]`); say(`${m.textContent} mode.`); }
    else if (g) { ui.screen = g.dataset.uxsGo; ui.spec = null; render(`[data-uxs-go="${ui.screen}"]`); say(`${g.textContent.replace(/^\d+/, "")} screen.`); }
    else if (sp) { ui.spec = ui.spec === sp.dataset.uxsSpec ? null : sp.dataset.uxsSpec; render(`[data-uxs-spec="${sp.dataset.uxsSpec}"]`); }
    else if (e.target.closest("[data-uxs-reset]")) { clearTimeout(timer); S = fresh(); save(); Object.assign(ui, { screen: "home", mode: "proto", spec: null, q: "", open: null }); render("[data-uxs-reset]"); say("Demo reset. Application at step 3 of 4."); }
  });
  studio.addEventListener("change", (e) => { if (e.target.matches("[data-uxs-errpath]")) { S.errorPath = e.target.checked; save(); say(S.errorPath ? "Error path on." : "Error path off."); } });
  if (resp) resp.addEventListener("click", (e) => { const d = e.target.closest("[data-uxr-dev]"); if (d) { ui.device = d.dataset.uxrDev; render(`[data-uxr-dev="${ui.device}"]`); say(`${d.textContent} layout.`); } });
  if (ds) {
    ds.addEventListener("click", (e) => {
      const t = e.target.closest("[data-uxd]"), st = e.target.closest("[data-uxd-state]"), o = e.target.closest("[data-uxd-open]");
      if (t) { ui.ds = t.dataset.uxd; ui.dsState = DS[ui.ds].states[0]; renderDS(); ds.querySelector(`[data-uxd="${ui.ds}"]`).focus(); }
      else if (st) { ui.dsState = st.dataset.uxdState; renderDS(); ds.querySelector(`[data-uxd-state="${ui.dsState}"]`).focus(); }
      else if (o) { ui.screen = o.dataset.uxdOpen; ui.mode = "ui"; const k = ui.ds === "status" ? "task" : ui.ds === "button" ? "btn" : ui.ds === "input" ? "input" : ui.ds === "nav" ? "nav" : ui.ds === "type" ? "display" : null; render(); ui.spec = studio.querySelector(`.uxs-device [data-spec="${k}"]`) ? k : null; render(); studio.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" }); say(`Showing ${o.textContent.trim()} in UI design mode.`); }
    });
    ds.addEventListener("keydown", (e) => {
      const tab = e.target.closest("[data-uxd]"); if (!tab) return;
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const ks = Object.keys(DS); ui.ds = ks[(ks.indexOf(ui.ds) + d + ks.length) % ks.length]; ui.dsState = DS[ui.ds].states[0]; renderDS(); ds.querySelector(`[data-uxd="${ui.ds}"]`).focus();
    });
  }
  addEventListener("resize", () => { fit(); pins(); });

  // Hero: two static copies of the home screen, one as wireframe, one as the designed UI.
  document.querySelectorAll("[data-ux-hero]").forEach((h) => { h.innerHTML = app("home"); h.setAttribute("inert", ""); });

  // "See it working": the insight section can open the selfie error in the prototype.
  document.querySelectorAll("[data-ux-open-selfie]").forEach((b) => b.addEventListener("click", () => {
    Object.assign(S, { doc: "ok", docTried: true, selfie: "error", selfieTried: true }); save();
    ui.mode = "proto"; ui.screen = "selfie"; render();
    studio.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
    say("Prototype open at the selfie error. Retake it to recover.");
  }));

  render(); tick();
})();
