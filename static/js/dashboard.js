
let appState = null;
let tickHandle = null;
let notificationHandle = null;
let refreshHandle = null;
let refreshing = false;

// Controle do accordion
let expandedRoutineId = null;

const $ = id => document.getElementById(id);

const sentNotifications = new Set();

function parseDate(value) {
  return value ? new Date(value) : null;
}

function durationText(seconds) {
  if (seconds == null) return "—";

  const value = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const s = value % 60;

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
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return escapeHtml(url.href);
    }
  } catch (_) {}

  return "#";
}

function flattenRoutines(config) {
  return (config.categorias || []).flatMap(category =>
    (category.rotinas || [])
      .filter(routine => routine.ativo !== false)
      .map(routine => ({
        ...routine,
        categoria_nome: category.nome,
        categoria_id: category.id
      }))
  );
}

function occurrenceKey(routineId, time) {
  return `${routineId}|${time}`;
}

function getOccurrencesForRoutine(routineId) {
  return (appState?.ocorrencias || []).filter(
    item => item.rotina_id === routineId
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
      toast("Permissão negada. Verifique as configurações do navegador.");
    } else {
      toast("A permissão para notificações não foi concedida.");
    }
  } catch (error) {
    toast("Não foi possível ativar as notificações.");
  }
}

function notificationKey(occurrence) {
  return `${occurrence.data_prevista}|${occurrence.rotina_id}|${occurrence.horario_previsto}`;
}

function sendRoutineNotification(occurrence, type) {
  if (Notification.permission !== "granted") return;

  if (
    occurrence.status === "concluida" ||
    occurrence.status === "em_andamento"
  ) {
    return;
  }

  const key = `${notificationKey(occurrence)}|${type}`;

  if (sentNotifications.has(key)) return;

  const messages = {
    before: {
      title: "Rotina próxima",
      body: `${occurrence.rotina_nome}: faltam 5 minutos para ${occurrence.horario_previsto}.`
    },
    ontime: {
      title: "Horário da rotina",
      body: `${occurrence.rotina_nome}: chegou o horário previsto (${occurrence.horario_previsto}).`
    },
    late: {
      title: "Rotina atrasada",
      body: `${occurrence.rotina_nome}: a execução prevista para ${occurrence.horario_previsto} ainda não foi iniciada.`
    }
  };

  try {
    const message = messages[type];

    const notification = new Notification(message.title, {
      body: message.body,
      icon: "/static/favicon.svg",
      tag: key,
      renotify: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    sentNotifications.add(key);
  } catch (error) {
    console.error("Erro ao exibir notificação:", error);
  }
}

function checkScheduledNotifications() {
  if (!appState?.ocorrencias) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = Date.now();

  appState.ocorrencias.forEach(occurrence => {
    if (
      occurrence.status === "concluida" ||
      occurrence.status === "em_andamento"
    ) {
      return;
    }

    const scheduled = parseDate(occurrence.horario_data);

    if (!scheduled) return;

    const difference = scheduled.getTime() - now;

    if (difference <= 5 * 60 * 1000 && difference > 0) {
      sendRoutineNotification(occurrence, "before");
    }

    if (difference <= 0 && difference > -60 * 1000) {
      sendRoutineNotification(occurrence, "ontime");
    }

    if (difference <= -60 * 1000) {
      sendRoutineNotification(occurrence, "late");
    }
  });
}


// --------------------------------------------------
// ESTATÍSTICAS
// --------------------------------------------------

function renderStats() {
  const routines = flattenRoutines(appState.config);
  const occurrences = appState.ocorrencias || [];

  const completed = occurrences.filter(
    item => item.status === "concluida"
  );

  const late = occurrences.filter(
    item => item.status === "atrasada"
  );

  const planned = occurrences.length;

  const percentage = planned
    ? Math.round((completed.length / planned) * 100)
    : 0;

  const today = appState.data_referencia || todayKey();

  const todaysExecutions = appState.execucoes.filter(
    item => (item.data_prevista || item.inicio || "").slice(0, 10) === today
  );

  const seconds = todaysExecutions
    .filter(item => item.status === "concluida")
    .reduce(
      (sum, item) => sum + (Number(item.duracao_segundos) || 0),
      0
    );

  $("totalRoutines").textContent = routines.length;
  $("plannedToday").textContent = planned;
  $("completedToday").textContent = completed.length;
  $("lateToday").textContent = late.length;
  $("completionRate").textContent = `${percentage}% das previstas`;

  $("timeToday").textContent = seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
    : `${Math.floor(seconds / 60)}min`;

  $("routineCount").textContent =
    `${routines.length} rotinas · ${planned} execuções previstas`;

  $("progressLabel").textContent = `${percentage}% concluído`;

  $("progressFill").style.width = `${percentage}%`;

  $("progressDescription").textContent =
    `${completed.length} de ${planned} execuções concluídas · ${late.length} atrasadas.`;
}


// --------------------------------------------------
// ROTINAS E HORÁRIOS
// --------------------------------------------------

function statusLabel(status) {
  const labels = {
    concluida: "Concluída",
    em_andamento: "Em andamento",
    atrasada: "Atrasada",
    futura: "Futura"
  };

  return labels[status] || "Não identificada";
}

function statusClass(status) {
  const classes = {
    concluida: "completed",
    em_andamento: "active",
    atrasada: "late",
    futura: "future"
  };

  return classes[status] || "";
}

function renderCategories() {
  const active = appState.ativa;
  const categories = appState.config.categorias || [];

  $("categories").innerHTML = categories.map(category => {
    const routines = (category.rotinas || [])
      .filter(routine => routine.ativo !== false);

    const icon = category.icone === "chart" ? "▥" : "◈";

    return `
      <article class="category-card">
        <div class="category-title">
          <div class="category-icon">${icon}</div>
          <div>
            <h3>${escapeHtml(category.nome)}</h3>
            <p>${escapeHtml(category.descricao || "")}</p>
          </div>
        </div>

        <div class="routine-list">
          ${routines.map(routine => {
            const occurrences = getOccurrencesForRoutine(routine.id);

            const isActiveRoutine =
              active && active.rotina_id === routine.id;

            // Controle de expansão individual.
            const isExpanded = expandedRoutineId === routine.id;

            const completed = occurrences.filter(
              item => item.status === "concluida"
            ).length;

            const late = occurrences.filter(
              item => item.status === "atrasada"
            ).length;

            const nextOccurrence = occurrences.find(item =>
              ["futura", "atrasada", "em_andamento"].includes(item.status)
            );

            const nextTime = nextOccurrence
              ? nextOccurrence.horario_previsto
              : "Concluída";

            const occurrenceRows = occurrences.map(occurrence => {
              const isActiveOccurrence =
                isActiveRoutine &&
                active.horario_previsto === occurrence.horario_previsto;

              const blocked =
                !!active && !isActiveOccurrence;

              let buttonLabel = "Iniciar";

              if (occurrence.status === "concluida") {
                buttonLabel = "Concluída";
              } else if (occurrence.status === "em_andamento") {
                buttonLabel = "Em andamento";
              } else if (occurrence.status === "atrasada") {
                buttonLabel = "Iniciar atrasada";
              }

              const disabled =
                blocked ||
                occurrence.status === "concluida" ||
                occurrence.status === "em_andamento";

              return `
                <div class="schedule-row">
                  <div class="schedule-time">${escapeHtml(occurrence.horario_previsto)}</div>

                  <span class="pill ${statusClass(occurrence.status)}">
                    ${statusLabel(occurrence.status)}
                  </span>

                  <button
                    class="button button-start schedule-button"
                    data-start="${escapeHtml(routine.id)}"
                    data-time="${escapeHtml(occurrence.horario_previsto)}"
                    ${disabled ? "disabled" : ""}>
                    ${buttonLabel}
                  </button>
                </div>
              `;
            }).join("");

            return `
              <div class="routine ${isExpanded ? "routine-expanded" : "routine-collapsed"}">

                <div class="routine-main">

                  <div
                    class="routine-heading"
                    data-toggle-routine="${escapeHtml(routine.id)}"
                    role="button"
                    tabindex="0"
                    aria-expanded="${isExpanded}">

                    <h4>
                      ${escapeHtml(routine.nome)}
                      <span class="routine-chevron">${isExpanded ? "▾" : "▸"}</span>
                    </h4>

                    <p>${escapeHtml(routine.descricao || "")}</p>

                    <div class="routine-meta">
                      ${escapeHtml(routine.frequencia || "Sem frequência definida")}
                      · ${(routine.horarios || []).length} horários programados
                      · ${completed}/${occurrences.length} concluídos
                      ${late ? ` · ${late} atrasados` : ""}
                      · Próximo: ${escapeHtml(nextTime)}
                    </div>
                  </div>

                  <div class="schedule-list"
                       style="display: ${isExpanded ? "block" : "none"};">
                    ${occurrenceRows || '<p class="empty-schedule">Nenhum horário programado.</p>'}
                  </div>

                </div>

                <div class="routine-actions">
                  <a href="${safeUrl(routine.url)}"
                     target="_blank"
                     rel="noopener noreferrer">
                    Abrir ↗
                  </a>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");

  // Expandir/recolher uma rotina por vez.
  document.querySelectorAll("[data-toggle-routine]").forEach(element => {
    const toggle = () => {
      const routineId = element.dataset.toggleRoutine;

      expandedRoutineId =
        expandedRoutineId === routineId ? null : routineId;

      renderCategories();
    };

    element.addEventListener("click", toggle);

    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });

  // Botões de execução permanecem com o comportamento original.
  document.querySelectorAll("[data-start]").forEach(button => {
    button.addEventListener("click", () => {
      startRoutine(
        button.dataset.start,
        button.dataset.time
      );
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
      `${active.categoria_nome || "Rotina"} · Prevista para ${active.horario_previsto || "execução extra"} · Iniciada às ${formatTime(active.inicio)}.`;

    finish.disabled = false;
    updateTimer();
  } else {
    panel.classList.remove("running");

    title.textContent = "Nenhuma tarefa em andamento";

    description.textContent =
      "Escolha um horário abaixo e clique em iniciar para começar a registrar seu tempo.";

    $("activeTimer").textContent = "00:00:00";
    finish.disabled = true;
  }
}

function updateTimer() {
  if (!appState?.ativa) return;

  const start = parseDate(appState.ativa.inicio);

  if (!start) return;

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
    .slice(0, 15);

  $("historyRows").innerHTML = records.length
    ? records.map(item => {
        const status = {
          concluida: "Concluída",
          em_andamento: "Em andamento",
          interrompida: "Interrompida"
        }[item.status] || item.status || "—";

        const cls = {
          em_andamento: "active",
          interrompida: "interrupted",
          concluida: "completed"
        }[item.status] || "";

        return `
          <tr>
            <td>${escapeHtml(item.rotina_nome || item.rotina_id)}</td>
            <td>${escapeHtml(item.categoria_nome || "—")}</td>
            <td>${escapeHtml(item.horario_previsto || "—")}</td>
            <td>${formatTime(item.inicio)}</td>
            <td>${formatTime(item.fim)}</td>
            <td>${durationText(item.duracao_segundos)}</td>
            <td><span class="pill ${cls}">${escapeHtml(status)}</span></td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="7" class="empty">Nenhuma execução registrada ainda.</td></tr>`;
}


// --------------------------------------------------
// ATUALIZAÇÃO DA APLICAÇÃO
// --------------------------------------------------

async function refresh() {
  if (refreshing) return;

  refreshing = true;

  try {
    appState = await api("/api/state");

    renderStats();
    renderCategories();
    renderActive();
    renderHistory();

    checkScheduledNotifications();
  } finally {
    refreshing = false;
  }
}


// --------------------------------------------------
// INICIAR E FINALIZAR
// --------------------------------------------------

async function startRoutine(routineId, scheduledTime) {
  try {
    await api("/api/start", {
      method: "POST",
      body: JSON.stringify({
        rotina_id: routineId,
        horario_previsto: scheduledTime
      })
    });

    await refresh();

    toast(`Execução ${scheduledTime} iniciada.`);
  } catch (error) {
    toast(error.message);
    await refresh().catch(() => {});
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

tickHandle = setInterval(() => {
  if (appState?.ativa) {
    updateTimer();
  }
}, 1000);

notificationHandle = setInterval(() => {
  checkScheduledNotifications();
}, 15000);

refreshHandle = setInterval(() => {
  refresh().catch(() => {});
}, 30000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refresh().catch(() => {});
  }
});

window.addEventListener("focus", () => {
  refresh().catch(() => {});
});
