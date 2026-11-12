// Connects the page to the backend. If the backend is offline, the site still works in static mode.
(() => {
  const $ = (id) => document.getElementById(id);
  const api = window.CC_API;
  let currentKey = null;
  let currentUser = null;

  const say = (el, text, isError) => {
    el.textContent = text;
    el.style.color = isError ? "var(--danger)" : "var(--success)";
  };
  const fmt = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  /* ---------- 1. Load initiatives (problems & solutions) and live stats ---------- */
  api.getInitiatives()
    .then((remote) => Object.assign(initiatives, remote))   // `initiatives` comes from index.html
    .catch(() => {});

  function loadStats() {
    api.getStats().then((s) => {
      $("statTotal").textContent = s.total;
      $("statProgress").textContent = s.inProgress;
      $("statResolved").textContent = s.resolved;
      $("statHelpful").textContent = s.helpfulPercent === null ? "–" : s.helpfulPercent + "%";
      $("statsSection").classList.remove("hidden");
    }).catch(() => {});
  }
  loadStats();

  /* ---------- 2. Login / register ---------- */
  const dialog = $("authDialog");
  let mode = "login";

  function setMode(m) {
    mode = m;
    $("authTitle").textContent = m === "login" ? "Log in" : "Create your account";
    $("authName").closest(".form-group").classList.toggle("hidden", m === "login");
    $("authName").required = m === "register";
    $("authSubmit").textContent = m === "login" ? "Log in" : "Create account";
    $("authSwitch").textContent = m === "login" ? "New here? Create an account" : "Already registered? Log in";
    $("authMessage").textContent = "";
  }

  function renderUser() {
    $("authButton").textContent = currentUser ? "Log out (" + currentUser.name.split(" ")[0] + ")" : "Log in";
    $("myComplaints").classList.toggle("hidden", !currentUser);
    if (currentUser) loadMine();
  }

  $("authButton").addEventListener("click", () => {
    if (currentUser) { api.setToken(null); currentUser = null; renderUser(); return; }
    setMode("login"); dialog.showModal();
  });
  $("authSwitch").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
  $("authCancel").addEventListener("click", () => dialog.close());

  $("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = { email: $("authEmail").value, password: $("authPassword").value };
    if (mode === "register") body.name = $("authName").value;
    try {
      const data = await (mode === "login" ? api.login(body) : api.register(body));
      api.setToken(data.token);
      currentUser = data.user;
      dialog.close();
      $("authForm").reset();
      renderUser();
    } catch (err) { say($("authMessage"), err.message, true); }
  });

  if (api.isLoggedIn()) api.me().then((d) => { currentUser = d.user; renderUser(); }).catch(() => api.setToken(null));

  /* ---------- 3. Save complaint record ---------- */
  $("saveComplaint").addEventListener("click", async () => {
    const out = $("saveMessage");
    try {
      const c = await api.submitComplaint({
        category: $("complaintCategory").value,
        location: $("complaintLocation").value,
        subject: $("complaintSubject").value,
        details: $("complaintDetails").value
      });
      say(out, "Saved. Your reference number is " + c.reference + ". Keep it to track the status.", false);
      $("trackInput").value = c.reference;
      loadStats();
      if (currentUser) loadMine();
    } catch (err) { say(out, err.message, true); }
  });

  /* ---------- 4. Track complaint ---------- */
  function renderTimeline(c) {
    const badge = { "Submitted": "badge-open", "In progress": "badge-progress", "Resolved": "badge-resolved" }[c.status];
    $("trackResult").innerHTML = "";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<span class="badge ${badge}"></span><h3 class="mt-1"></h3><p></p><ol class="timeline"></ol>`;
    card.querySelector(".badge").textContent = c.status;
    card.querySelector("h3").textContent = c.subject;
    card.querySelector("p").textContent = c.reference + " · " + c.category + " · " + c.location;
    c.updates.forEach((u) => {
      const li = document.createElement("li");
      li.innerHTML = "<strong></strong><span></span>";
      li.querySelector("strong").textContent = u.status + " · " + fmt(u.at);
      li.querySelector("span").textContent = u.note || "";
      card.querySelector(".timeline").appendChild(li);
    });
    $("trackResult").appendChild(card);
  }

  $("trackForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("trackResult").innerHTML = "";
    try { renderTimeline(await api.trackComplaint($("trackInput").value)); }
    catch (err) { $("trackResult").innerHTML = '<p class="form-error"></p>'; $("trackResult").firstChild.textContent = err.message; }
  });

  async function loadMine() {
    try {
      const list = await api.myComplaints();
      const box = $("myComplaintList");
      box.innerHTML = list.length ? "" : '<p class="text-muted">You have not saved any complaints yet.</p>';
      list.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "filter-chip";
        b.textContent = c.reference + " · " + c.status;
        b.addEventListener("click", () => renderTimeline(c));
        box.appendChild(b);
      });
    } catch {}
  }

  /* ---------- 5. Feedback on an initiative ---------- */
  document.addEventListener("click", (e) => {
    const sel = e.target.closest("[data-select]");
    if (sel) { currentKey = sel.dataset.select; $("feedbackMessage").textContent = ""; }
  });
  document.querySelectorAll("[data-helpful]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      try {
        await api.sendFeedback({ initiativeKey: currentKey, helpful: btn.dataset.helpful === "yes" });
        say($("feedbackMessage"), "Thank you for your feedback.", false);
        loadStats();
      } catch (err) { say($("feedbackMessage"), err.message, true); }
    })
  );
})();
