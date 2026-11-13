
let appState = null;
let tickHandle = null;
let notificationHandle = null;

const $ = (id) => document.getElementById(id);

// Controle das notificações já enviadas nesta sessão.
const sentNotifications = new Set();

// Ocorrências canceladas porque a rotina foi iniciada.
const dismissedOccurrences = new Set();

function parseDate(value) {
  return value ? new Date(value) : null;
}

function durationText(seconds) {
  if (seconds == null) return "—";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s]
    .map(v => String(v).padStart(2, "0"))
    .join(":");
}

function formatTime(value) {
  const date = parseDate(value);

  return date
    ? date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "—";
}

function todayKey() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toast(message) {
  const el = $("toast");

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => el.classList.remove("show"), 2800);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Não foi possível concluir a operação.");
  }

  return data;
}

function flattenRoutines(config) {
  return (config.categorias || []).flatMap(category =>
    (category.rotinas || [])
      .filter(r => r.ativo !== false)
      .map(r => ({
        ...r,
        categoria_nome: category.nome,
        categoria_id: category.id
      }))
  );
}

// --------------------------------------------------
// NOTIFICAÇÕES
// --------------------------------------------------

function updateNotificationButton() {
  const button = $("notificationButton");

  if (!("Notification" in window)) {
    button.textContent = "Notificações indisponíveis";
    button.disabled = true;
    return;
  }

  if (Notification.permission === "granted") {
    button.textContent = "Notificações ativadas";
    button.disabled = true;
  } else if (Notification.permission === "denied") {
    button.textContent = "Notificações bloqueadas";
    button.disabled = true;
  } else {
    button.textContent = "Ativar notificações";
    button.disabled = false;
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    toast("Este navegador não oferece suporte a notificações.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    updateNotificationButton();

    if (permission === "granted") {
      toast("Notificações ativadas com sucesso!");
      checkScheduledNotifications();
    } else if (permission === "denied") {
      toast("Permissão negada. Verifique as configurações do Chrome.");
    } else {
      toast("A permissão para notificações não foi concedida.");
    }
  } catch (error) {
    toast("Não foi possível ativar as notificações.");
  }
}

function notificationKey(routineId, dateKey, time) {
  return `${dateKey}|${routineId}|${time}`;
}

function getTodayOccurrences() {
  if (!appState?.config) return [];

  const now = new Date();
  const dateKey = todayKey();

  return flattenRoutines(appState.config).flatMap(routine => {
    return (routine.horarios || [])
      .filter(time => /^\d{2}:\d{2}$/.test(time))
      .map(time => {
        const [hours, minutes] = time.split(":").map(Number);

        const scheduled = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hours,
          minutes,
          0,
          0
        );

        return {
          routine,
          time,
          scheduled,
          dateKey,
          key: notificationKey(routine.id, dateKey, time)
        };
      });
  });
}

function sendRoutineNotification(occurrence, type) {
  if (Notification.permission !== "granted") return;

  const { routine, time, key } = occurrence;
  const eventKey = `${key}|${type}`;

  if (sentNotifications.has(eventKey)) return;
  if (dismissedOccurrences.has(key)) return;

  // Não notifica uma rotina que já está em execução.
  if (appState?.ativa?.rotina_id === routine.id) return;

  const messages = {
    before: {
      title: "Rotina próxima",
      body: `${routine.nome}: faltam 5 minutos para o horário previsto (${time}).`
    },
    ontime: {
      title: "Horário da rotina",
      body: `${routine.nome}: chegou o horário previsto (${time}).`
    },
    late: {
      title: "Rotina atrasada",
      body: `${routine.nome}: o horário previsto era ${time}. A rotina ainda não foi iniciada.`
    }
  };

  const message = messages[type];

  try {
    const notification = new Notification(message.title, {
      body: message.body,
      icon: "/static/favicon.ico",
      tag: eventKey,
      renotify: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    sentNotifications.add(eventKey);
  } catch (error) {
    console.error("Erro ao exibir notificação:", error);
  }
}

function checkScheduledNotifications() {
  if (!appState?.config) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();

  getTodayOccurrences().forEach(occurrence => {
    const difference = occurrence.scheduled.getTime() - now.getTime();

    // 5 minutos antes: janela de 5 minutos até o horário.
    if (difference <= 5 * 60 * 1000 && difference > 0) {
      sendRoutineNotification(occurrence, "before");
    }

    // No horário: janela de até 1 minuto após o horário.
    if (difference <= 0 && difference > -60 * 1000) {
      sendRoutineNotification(occurrence, "ontime");
    }

    // 5 minutos depois: janela entre 5 e 6 minutos de atraso.
    if (difference <= -5 * 60 * 1000 && difference > -6 * 60 * 1000) {
      sendRoutineNotification(occurrence, "late");
    }
  });
}

// Quando uma rotina começa, cancela os alertas da ocorrência
// mais próxima, desde que esteja dentro da janela de execução.
function dismissOccurrenceForStartedRoutine(routineId) {
  const now = new Date();

  const candidates = getTodayOccurrences()
    .filter(item => item.routine.id === routineId)
    .map(item => ({
      ...item,
      difference: item.scheduled.getTime() - now.getTime()
    }))
    .filter(item =>
      item.difference >= -10 * 60 * 1000 &&
      item.difference <= 5 * 60 * 1000
    )
    .sort((a, b) =>
      Math.abs(a.difference) - Math.abs(b.difference)
    );

  if (!candidates.length) return;

  const occurrence = candidates[0];

  dismissedOccurrences.add(occurrence.key);
}

// --------------------------------------------------
// ESTATÍSTICAS
// --------------------------------------------------

function renderStats() {
  const routines = flattenRoutines(appState.config);
  const today = todayKey();

  const todays = appState.execucoes.filter(
    x => (x.inicio || "").slice(0, 10) === today
  );

  const completed = todays.filter(
    x => x.status === "concluida"
  );

  const seconds = completed.reduce(
    (sum, x) => sum + (Number(x.duracao_segundos) || 0),
    0
  );

  $("totalRoutines").textContent = routines.length;
  $("completedToday").textContent = completed.length;

  $("timeToday").textContent = seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
    : `${Math.floor(seconds / 60)}min`;

  $("routineCount").textContent = `${routines.length} rotinas cadastradas`;
}

// --------------------------------------------------
// ROTINAS
// --------------------------------------------------

function renderCategories() {
  const active = appState.ativa;

  const completedToday = new Set(
    appState.execucoes
      .filter(x =>
        x.status === "concluida" &&
        (x.inicio || "").slice(0, 10) === todayKey()
      )
      .map(x => x.rotina_id)
  );

  $("categories").innerHTML = (appState.config.categorias || [])
    .map(category => {
      const routines = (category.rotinas || [])
        .filter(r => r.ativo !== false);

      const icon = category.icone === "chart" ? "▥" : "◈";

      return `<article class="category-card">
        <div class="category-title">
          <div class="category-icon">${icon}</div>
          <div>
            <h3>${escapeHtml(category.nome)}</h3>
            <p>${escapeHtml(category.descricao || "")}</p>
          </div>
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
                <div class="routine-meta">
                  ${escapeHtml((r.horarios || []).join(" · ") || "Sem horário definido")}
                  ${done ? " · Já executada hoje" : ""}
                </div>
              </div>

              <div class="routine-actions">
                <a href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">
                  Abrir ↗
                </a>

                <button class="button button-start"
                  data-start="${escapeHtml(r.id)}"
                  ${blocked || isActive ? "disabled" : ""}>
                  ${isActive ? "Em andamento" : "Iniciar"}
                </button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </article>`;
    })
    .join("");

  document.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => {
      startRoutine(button.dataset.start);
    });
  });
}

// --------------------------------------------------
// EXECUÇÃO ATUAL
// --------------------------------------------------

function renderActive() {
  const panel = $("activePanel");
  const active = appState.ativa;

  const title = panel.querySelector("h2");
  const description = panel.querySelector("p");
  const finish = $("finishButton");

  if (active) {
    panel.classList.add("running");

    title.textContent = active.rotina_nome;

    description.textContent =
      `${active.categoria_nome || "Rotina"} · Iniciada às ${formatTime(active.inicio)}. Finalize quando concluir a verificação.`;

    finish.disabled = false;
    updateTimer();
  } else {
    panel.classList.remove("running");

    title.textContent = "Nenhuma tarefa em andamento";

    description.textContent =
      "Escolha uma rotina abaixo e clique em iniciar para começar a registrar seu tempo.";

    $("activeTimer").textContent = "00:00:00";
    finish.disabled = true;
  }
}

function updateTimer() {
  if (!appState?.ativa) return;

  const start = parseDate(appState.ativa.inicio);

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - start.getTime()) / 1000)
  );

  $("activeTimer").textContent = durationText(seconds);
}

// --------------------------------------------------
// HISTÓRICO
// --------------------------------------------------

function renderHistory() {
  const records = [...appState.execucoes]
    .sort((a, b) =>
      (b.inicio || "").localeCompare(a.inicio || "")
    )
    .slice(0, 12);

  $("historyRows").innerHTML = records.length
    ? records.map(x => {
        const status =
          x.status === "concluida"
            ? "Concluída"
            : x.status === "em_andamento"
              ? "Em andamento"
              : "Interrompida";

        const cls =
          x.status === "em_andamento"
            ? "active"
            : x.status === "interrompida"
              ? "interrupted"
              : "";

        return `<tr>
          <td>${escapeHtml(x.rotina_nome || x.rotina_id)}</td>
          <td>${escapeHtml(x.categoria_nome || "—")}</td>
          <td>${formatTime(x.inicio)}</td>
          <td>${formatTime(x.fim)}</td>
          <td>${durationText(x.duracao_segundos)}</td>
          <td><span class="pill ${cls}">${status}</span></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="6" class="empty">Nenhuma execução registrada ainda.</td></tr>`;
}

// --------------------------------------------------
// UTILITÁRIOS
// --------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function safeUrl(value) {
  try {
    const u = new URL(value);

    if (u.protocol === "http:" || u.protocol === "https:") {
      return escapeHtml(u.href);
    }
  } catch (_) {}

  return "#";
}

// --------------------------------------------------
// ATUALIZAÇÃO DA APLICAÇÃO
// --------------------------------------------------

async function refresh() {
  appState = await api("/api/state");

  // Se já existe uma execução ativa, cancela a ocorrência correspondente.
  if (appState.ativa) {
    dismissOccurrenceForStartedRoutine(appState.ativa.rotina_id);
  }

  renderStats();
  renderCategories();
  renderActive();
  renderHistory();

  checkScheduledNotifications();
}

// --------------------------------------------------
// INICIAR E FINALIZAR ROTINAS
// --------------------------------------------------

async function startRoutine(id) {
  try {
    await api("/api/start", {
      method: "POST",
      body: JSON.stringify({ rotina_id: id })
    });

    dismissOccurrenceForStartedRoutine(id);

    await refresh();

    toast("Tarefa iniciada. O tempo está sendo registrado.");
  } catch (error) {
    toast(error.message);
    await refresh();
  }
}

async function finishRoutine() {
  try {
    const result = await api("/api/finish", {
      method: "POST"
    });

    await refresh();

    toast(
      `Tarefa finalizada: ${durationText(result.execucao.duracao_segundos)}.`
    );
  } catch (error) {
    toast(error.message);
  }
}

// --------------------------------------------------
// INICIALIZAÇÃO
// --------------------------------------------------

$("finishButton").addEventListener("click", finishRoutine);

$("notificationButton").addEventListener(
  "click",
  requestNotificationPermission
);

$("todayLabel").textContent = new Date().toLocaleDateString(
  "pt-BR",
  {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }
);

updateNotificationButton();

refresh().catch(error => toast(error.message));

// Atualiza o cronômetro a cada segundo.
tickHandle = setInterval(() => {
  if (appState?.ativa) {
    updateTimer();
  }
}, 1000);

// Verifica os horários a cada 15 segundos.
notificationHandle = setInterval(() => {
  checkScheduledNotifications();
}, 15000);

// Atualiza os dados da API a cada 30 segundos.
setInterval(() => {
  refresh().catch(() => {});
}, 30000);

// Verifica novamente quando o usuário retorna à aba.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refresh().catch(() => {});
  }
});

window.addEventListener("focus", () => {
  refresh().catch(() => {});
});
