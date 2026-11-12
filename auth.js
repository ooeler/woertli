/* Anmeldung für «Wörtli üben»: jedes Kind hat ein eigenes Konto (E-Mail + Passwort).
   Der Fortschritt wird in Supabase gespeichert (Tabelle «progress», eine Zeile pro Person). */
(function(){
  const cfg = window.WOERTLI_CONFIG || {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* ---------- Login-Fenster ---------- */
  const box = document.createElement("div");
  box.className = "auth"; box.id = "auth";
  box.innerHTML = `
    <div class="auth-card" role="dialog" aria-labelledby="auth-title">
      <div class="auth-logo">🐄</div>
      <h2 id="auth-title">Wörtli üben</h2>
      <div class="auth-tabs" role="tablist">
        <button type="button" id="tab-in" aria-selected="true">Anmelden</button>
        <button type="button" id="tab-up" aria-selected="false">Konto erstellen</button>
      </div>
      <form id="auth-form" novalidate>
        <label id="row-name" hidden>Vorname<input id="a-name" type="text" autocomplete="given-name" maxlength="40"></label>
        <label>E-Mail<input id="a-mail" type="email" autocomplete="email" required></label>
        <label id="row-pass">Passwort<input id="a-pass" type="password" autocomplete="current-password" minlength="6" required></label>
        <p class="auth-msg" id="a-msg" role="status"></p>
        <button class="btn auth-go" id="a-go" type="submit">Anmelden ›</button>
      </form>
      <button type="button" class="auth-link" id="a-forgot">Passwort vergessen?</button>
    </div>`;
  document.body.appendChild(box);
  document.body.classList.add("locked");

  let mode = "in";   // in | up | forgot | newpass
  function setMode(m){
    mode = m;
    $("tab-in").setAttribute("aria-selected", m==="in");
    $("tab-up").setAttribute("aria-selected", m==="up");
    $("row-name").hidden = m!=="up";
    $("row-pass").hidden = m==="forgot";
    $("a-mail").closest("label").hidden = m==="newpass";
    $("a-pass").autocomplete = m==="in" ? "current-password" : "new-password";
    $("a-pass").previousSibling.textContent = m==="newpass" ? "Neues Passwort" : "Passwort";
    $("a-go").textContent = {in:"Anmelden ›", up:"Konto erstellen ›", forgot:"Link zum Zurücksetzen schicken", newpass:"Passwort speichern"}[m];
    $("a-forgot").textContent = m==="forgot" ? "‹ Zurück zum Anmelden" : "Passwort vergessen?";
    $("a-forgot").hidden = m==="newpass" || m==="up";
    msg("");
  }
  function msg(t, bad){ const el=$("a-msg"); el.textContent=t; el.className="auth-msg"+(bad?" bad":t?" ok":""); }
  $("tab-in").onclick = () => setMode("in");
  $("tab-up").onclick = () => setMode("up");
  $("a-forgot").onclick = () => setMode(mode==="forgot" ? "in" : "forgot");

  if(!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase){
    msg(!window.supabase ? "Die Anmeldung kann gerade nicht geladen werden. Prüfe die Internetverbindung." :
        "Die Anmeldung ist noch nicht eingerichtet (config.js fehlt die Supabase-Angaben).", true);
    $("a-go").disabled = true;
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });

  /* ---------- Fehlermeldungen auf Deutsch ---------- */
  function german(err){
    const m = (err && (err.message||"")).toLowerCase();
    if(m.includes("invalid login")) return "E-Mail oder Passwort stimmt nicht.";
    if(m.includes("email not confirmed")) return "Bitte bestätige zuerst deine E-Mail (Link im Postfach).";
    if(m.includes("already registered") || m.includes("already been registered")) return "Mit dieser E-Mail gibt es schon ein Konto. Melde dich an.";
    if(m.includes("password") && m.includes("6")) return "Das Passwort braucht mindestens 6 Zeichen.";
    if(m.includes("rate limit")) return "Zu viele Versuche. Warte kurz und probiere es dann nochmals.";
    if(m.includes("failed to fetch") || m.includes("network")) return "Keine Verbindung zum Internet.";
    return "Das hat nicht geklappt: " + (err && err.message || "unbekannter Fehler");
  }

  $("auth-form").onsubmit = async e => {
    e.preventDefault();
    const mail=$("a-mail").value.trim(), pass=$("a-pass").value, name=$("a-name").value.trim();
    $("a-go").disabled = true; msg("Einen Moment …");
    try{
      if(mode==="in"){
        if(!mail || !pass) throw {own:"Bitte E-Mail und Passwort eingeben."};
        const { error } = await sb.auth.signInWithPassword({ email:mail, password:pass });
        if(error) throw error;
      } else if(mode==="up"){
        if(!name) throw {own:"Bitte gib deinen Vornamen ein."};
        if(pass.length<6) throw {own:"Das Passwort braucht mindestens 6 Zeichen."};
        const { data:d, error } = await sb.auth.signUp({ email:mail, password:pass, options:{ data:{ name }, emailRedirectTo: location.origin + location.pathname } });
        if(error) throw error;
        if(!d.session){ setMode("in"); $("a-mail").value=mail; msg("Fast fertig! Wir haben dir eine E-Mail geschickt. Klick auf den Link darin und melde dich dann hier an."); }
      } else if(mode==="forgot"){
        if(!mail) throw {own:"Bitte gib deine E-Mail ein."};
        const { error } = await sb.auth.resetPasswordForEmail(mail, { redirectTo: location.origin + location.pathname });
        if(error) throw error;
        msg("Wir haben dir eine E-Mail mit einem Link geschickt. Damit kannst du ein neues Passwort wählen.");
      } else if(mode==="newpass"){
        if(pass.length<6) throw {own:"Das Passwort braucht mindestens 6 Zeichen."};
        const { error } = await sb.auth.updateUser({ password:pass });
        if(error) throw error;
        msg("Neues Passwort gespeichert!"); setTimeout(()=>sb.auth.getSession().then(({data:d})=>d.session && enter(d.session)), 600);
      }
    }catch(err){ msg(err.own || german(err), true); }
    $("a-go").disabled = false;
  };

  /* ---------- Fortschritt laden und speichern ---------- */
  let user=null, saveTimer=null, pending=null;
  async function cloudSave(){
    if(!user || !pending) return;
    const d = pending; pending = null;
    const { error } = await sb.from("progress").upsert({ user_id:user.id, data:d, updated_at:new Date().toISOString() });
    if(error){ pending = pending || d; }   // später nochmals versuchen
  }
  function queueSave(d){ pending = JSON.parse(JSON.stringify(d)); clearTimeout(saveTimer); saveTimer = setTimeout(cloudSave, 1500); }
  document.addEventListener("visibilitychange", () => { if(document.visibilityState==="hidden"){ clearTimeout(saveTimer); cloudSave(); } });
  window.addEventListener("online", () => cloudSave());

  async function enter(session){
    if(user && user.id===session.user.id && !document.body.classList.contains("locked")) return;
    user = session.user;
    const key = "woertli-user-" + user.id;
    let cloud = null;
    try{
      const { data:row, error } = await sb.from("progress").select("data").eq("user_id", user.id).maybeSingle();
      if(!error && row) cloud = row.data;
    }catch(e){}
    let local = null; try{ local = JSON.parse(localStorage.getItem(key)||"null"); }catch(e){}
    window.WoertliApp.start({ key, data: cloud || local || null, onSave: queueSave });
    if(!cloud) queueSave(window.WoertliApp.current());   // erstes Mal: in der Cloud anlegen
    showUser();
    document.body.classList.remove("locked");
  }
  function showUser(){
    let b = $("hud-user");
    if(!b){
      b = document.createElement("button"); b.id="hud-user"; b.type="button"; b.className="chip user";
      b.onclick = async () => { clearTimeout(saveTimer); await cloudSave(); await sb.auth.signOut(); };
      document.querySelector(".hud").appendChild(b);
    }
    const name = (user.user_metadata && user.user_metadata.name) || (user.email||"").split("@")[0];
    b.innerHTML = `👤 ${esc(name)} <span class="out">· Abmelden</span>`;
    b.title = "Abmelden (" + (user.email||"") + ")";
  }
  function leave(){
    user = null; document.body.classList.add("locked");
    setMode("in"); $("a-pass").value=""; msg("Du bist abgemeldet. Bis bald! 🐄");
  }

  sb.auth.onAuthStateChange((event, session) => {
    if(event==="PASSWORD_RECOVERY"){ document.body.classList.add("locked"); setMode("newpass"); msg("Wähle ein neues Passwort."); return; }
    if(event==="SIGNED_OUT"){ leave(); return; }
    if(session && mode!=="newpass") enter(session);
  });
  sb.auth.getSession().then(({ data:d }) => { if(d.session && mode!=="newpass") enter(d.session); });
})();
