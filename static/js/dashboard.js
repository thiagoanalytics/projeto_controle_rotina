let appState = null;
let tickHandle = null;

const $ = (id) => document.getElementById(id);

function parseDate(value) {
  return value ? new Date(value) : null;
}
function durationText(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}
function formatTime(value) {
  const date = parseDate(value);
  return date ? date.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit", second:"2-digit"}) : "—";
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}
async function api(url, options={}) {
  const response = await fetch(url, {
    headers: {"Content-Type":"application/json"},
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Não foi possível concluir a operação.");
  return data;
}
function flattenRoutines(config) {
  return (config.categorias || []).flatMap(category =>
    (category.rotinas || []).filter(r => r.ativo !== false).map(r => ({...r, categoria_nome: category.nome, categoria_id: category.id}))
  );
}
function renderStats() {
  const routines = flattenRoutines(appState.config);
  const today = todayKey();
  const todays = appState.execucoes.filter(x => (x.inicio || "").slice(0,10) === today);
  const completed = todays.filter(x => x.status === "concluida");
  const seconds = completed.reduce((sum, x) => sum + (x.duracao_segundos || 0), 0);
  $("totalRoutines").textContent = routines.length;
  $("completedToday").textContent = completed.length;
  $("timeToday").textContent = seconds >= 3600
    ? `${Math.floor(seconds/3600)}h ${Math.floor((seconds%3600)/60)}min`
    : `${Math.floor(seconds/60)}min`;
  $("routineCount").textContent = `${routines.length} rotinas cadastradas`;
}
function renderCategories() {
  const active = appState.ativa;
  const completedToday = new Set(appState.execucoes
    .filter(x => x.status === "concluida" && (x.inicio || "").slice(0,10) === todayKey())
    .map(x => x.rotina_id));
  $("categories").innerHTML = (appState.config.categorias || []).map(category => {
    const routines = (category.rotinas || []).filter(r => r.ativo !== false);
    const icon = category.icone === "chart" ? "▥" : "◈";
    return `<article class="category-card">
      <div class="category-title">
        <div class="category-icon">${icon}</div>
        <div><h3>${escapeHtml(category.nome)}</h3><p>${escapeHtml(category.descricao || "")}</p></div>
      </div>
      <div class="routine-list">
        ${routines.map(r => {
          const isActive = active && active.rotina_id === r.id;
          const blocked = !!active && !isActive;
          const done = completedToday.has(r.id);
          return `<div class="routine">
            <div>
              <h4>${escapeHtml(r.nome)}</h4>
              <p>${escapeHtml(r.descricao || "")}</p>
              <div class="routine-meta">${escapeHtml((r.horarios || []).join(" · ") || "Sem horário definido")}${done ? " · Já executada hoje" : ""}</div>
            </div>
            <div class="routine-actions">
              <a href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>
              <button class="button button-start" data-start="${escapeHtml(r.id)}" ${blocked || isActive ? "disabled" : ""}>
                ${isActive ? "Em andamento" : "Iniciar"}
              </button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </article>`;
  }).join("");

  document.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => startRoutine(button.dataset.start));
  });
}
function renderActive() {
  const panel = $("activePanel");
  const active = appState.ativa;
  const title = panel.querySelector("h2");
  const description = panel.querySelector("p");
  const finish = $("finishButton");
  if (active) {
    panel.classList.add("running");
    title.textContent = active.rotina_nome;
    description.textContent = `${active.categoria_nome || "Rotina"} · Iniciada às ${formatTime(active.inicio)}. Finalize quando concluir a verificação.`;
    finish.disabled = false;
    updateTimer();
  } else {
    panel.classList.remove("running");
    title.textContent = "Nenhuma tarefa em andamento";
    description.textContent = "Escolha uma rotina abaixo e clique em iniciar para começar a registrar seu tempo.";
    $("activeTimer").textContent = "00:00:00";
    finish.disabled = true;
  }
}
function updateTimer() {
  if (!appState?.ativa) return;
  const start = parseDate(appState.ativa.inicio);
  const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  $("activeTimer").textContent = durationText(seconds);
}
function renderHistory() {
  const records = [...appState.execucoes].sort((a,b) => (b.inicio || "").localeCompare(a.inicio || "")).slice(0,12);
  $("historyRows").innerHTML = records.length ? records.map(x => {
    const status = x.status === "concluida" ? "Concluída" : x.status === "em_andamento" ? "Em andamento" : "Interrompida";
    const cls = x.status === "em_andamento" ? "active" : x.status === "interrompida" ? "interrupted" : "";
    return `<tr>
      <td>${escapeHtml(x.rotina_nome || x.rotina_id)}</td>
      <td>${escapeHtml(x.categoria_nome || "—")}</td>
      <td>${formatTime(x.inicio)}</td>
      <td>${formatTime(x.fim)}</td>
      <td>${durationText(x.duracao_segundos)}</td>
      <td><span class="pill ${cls}">${status}</span></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">Nenhuma execução registrada ainda.</td></tr>`;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function safeUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol === "http:" || u.protocol === "https:") return escapeHtml(u.href);
  } catch (_) {}
  return "#";
}
async function refresh() {
  appState = await api("/api/state");
  renderStats();
  renderCategories();
  renderActive();
  renderHistory();
}
async function startRoutine(id) {
  try {
    await api("/api/start", {method:"POST", body:JSON.stringify({rotina_id:id})});
    await refresh();
    toast("Tarefa iniciada. O tempo está sendo registrado.");
  } catch (error) {
    toast(error.message);
    await refresh();
  }
}
async function finishRoutine() {
  try {
    const result = await api("/api/finish", {method:"POST"});
    await refresh();
    toast(`Tarefa finalizada: ${durationText(result.execucao.duracao_segundos)}.`);
  } catch (error) {
    toast(error.message);
  }
}
$("finishButton").addEventListener("click", finishRoutine);
$("todayLabel").textContent = new Date().toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"long", year:"numeric"});
refresh().catch(error => toast(error.message));
tickHandle = setInterval(() => {
  if (appState?.ativa) updateTimer();
}, 1000);
setInterval(() => refresh().catch(() => {}), 30000);