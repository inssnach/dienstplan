const STORAGE_KEY = "dienstplan-data";
const DEFAULT_ASSISTANTS = [
  { id: "a1", name: "Anna Becker", color: "#5b8def", pin: "1234" },
  { id: "a2", name: "Cem Kaya", color: "#22c55e", pin: "5678" },
];
const SHIFTS = [
  { value: "frueh", label: "Frühdienst" },
  { value: "spaet", label: "Spätdienst" },
  { value: "nacht", label: "Nachtdienst" },
  { value: "visite", label: "Visitendienst (Wochenende)" },
  { value: "frei", label: "Frei / Urlaub" },
];
const ADMIN_PASSWORD = "admin123";

const statusPill = document.getElementById("status-pill");
const heroStats = document.getElementById("hero-stats");
const occupancyContainer = document.getElementById("occupancy");
const assistantOccupancy = document.getElementById("assistant-occupancy");
const assistantList = document.getElementById("assistant-list");
const assistantSelect = document.getElementById("assistant-select");
const planner = document.getElementById("planner");
const monthPicker = document.getElementById("month-picker");

let state = loadState();
let currentAssistant = null;

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Konnte gespeicherte Daten nicht laden", e);
    }
  }
  const initial = {
    assistants: DEFAULT_ASSISTANTS,
    requests: {},
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function getNextDays(days) {
  const list = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    list.push(d);
  }
  return list;
}

function defaultShiftForDate(date) {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return "frueh";
  return "frueh";
}

function buildHeroStats() {
  const days = getNextDays(60);
  const totals = days.reduce(
    (acc, date) => {
      const key = date.toISOString().slice(0, 10);
      const requests = state.requests[key] || [];
      acc.requests += requests.length;
      acc.daysWithEntries += requests.length ? 1 : 0;
      return acc;
    },
    { requests: 0, daysWithEntries: 0 }
  );

  heroStats.innerHTML = "";
  const stats = [
    { title: "Gespeicherte Wünsche", value: totals.requests },
    { title: "Tage mit Einträgen", value: totals.daysWithEntries },
    { title: "Assistenz-Logins", value: state.assistants.length },
  ];
  stats.forEach((s) => {
    const div = document.createElement("div");
    div.className = "stat";
    div.innerHTML = `<strong>${s.value}</strong><span>${s.title}</span>`;
    heroStats.appendChild(div);
  });
}

function renderAssistants() {
  assistantList.innerHTML = "";
  assistantSelect.innerHTML = "";
  state.assistants.forEach((a) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <strong>${a.name}</strong>
        <p class="hint">PIN: ${a.pin}</p>
      </div>
      <div class="badge color"><span style="background:${a.color}"></span>${a.color}</div>
    `;
    assistantList.appendChild(item);

    const option = document.createElement("option");
    option.value = a.id;
    option.textContent = a.name;
    assistantSelect.appendChild(option);
  });
}

function renderOccupancy(target, days = 60) {
  target.innerHTML = "";
  const dates = getNextDays(days);
  dates.forEach((date) => {
    const key = date.toISOString().slice(0, 10);
    const entries = state.requests[key] || [];
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `<h4>${formatDate(date)}</h4>`;
    const list = document.createElement("ul");
    if (!entries.length) {
      list.innerHTML = "<li>Keine Einträge</li>";
    } else {
      entries.forEach((e) => {
        const assistant = state.assistants.find((a) => a.id === e.assistantId);
        const li = document.createElement("li");
        li.innerHTML = `<span style="color:${assistant?.color || "#fff"}">●</span> ${assistant?.name || "?"} – ${labelForShift(e.shift)}`;
        list.appendChild(li);
      });
    }
    card.appendChild(list);
    target.appendChild(card);
  });
}

function labelForShift(value) {
  return SHIFTS.find((s) => s.value === value)?.label || value;
}

function createDayRow(date, existing) {
  const row = document.createElement("div");
  row.className = "day-row";
  const key = date.toISOString().slice(0, 10);
  const select = document.createElement("select");
  SHIFTS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.value;
    opt.textContent = s.label;
    select.appendChild(opt);
  });
  select.value = existing || defaultShiftForDate(date);
  select.dataset.dateKey = key;
  const label = document.createElement("strong");
  label.textContent = formatDate(date);
  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function renderPlanner(monthStr) {
  if (!currentAssistant) return;
  planner.innerHTML = "";
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month - 1, day);
    const key = d.toISOString().slice(0, 10);
    const existingEntry = (state.requests[key] || []).find((r) => r.assistantId === currentAssistant.id);
    const row = createDayRow(d, existingEntry?.shift);
    planner.appendChild(row);
  }
}

function persistPlan() {
  const selects = planner.querySelectorAll("select");
  selects.forEach((select) => {
    const dateKey = select.dataset.dateKey;
    const shift = select.value;
    const entries = state.requests[dateKey] || [];
    const existingIndex = entries.findIndex((e) => e.assistantId === currentAssistant.id);
    if (existingIndex >= 0) {
      entries[existingIndex].shift = shift;
    } else {
      entries.push({ assistantId: currentAssistant.id, shift });
    }
    state.requests[dateKey] = entries;
  });
  saveState();
  renderOccupancy(occupancyContainer);
  renderOccupancy(assistantOccupancy);
  buildHeroStats();
}

function loginAdmin(event) {
  event.preventDefault();
  const password = document.getElementById("admin-password").value;
  if (password === ADMIN_PASSWORD) {
    document.getElementById("admin-area").hidden = false;
    statusPill.textContent = "Admin angemeldet";
    statusPill.style.background = "rgba(34, 197, 94, 0.12)";
  } else {
    alert("Falsches Passwort");
  }
}

function loginAssistant(event) {
  event.preventDefault();
  const id = assistantSelect.value;
  const pin = document.getElementById("assistant-pin").value;
  const assistant = state.assistants.find((a) => a.id === id && a.pin === pin);
  if (!assistant) {
    alert("Login fehlgeschlagen");
    return;
  }
  currentAssistant = assistant;
  statusPill.textContent = `${assistant.name} angemeldet`;
  statusPill.style.background = "rgba(91, 141, 239, 0.15)";
  document.getElementById("assistant-area").hidden = false;
  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  monthPicker.value = monthStr;
  renderPlanner(monthStr);
  renderOccupancy(assistantOccupancy);
}

function openModal() {
  document.getElementById("modal").hidden = false;
  document.getElementById("assistant-name").focus();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  document.getElementById("create-assistant").reset();
}

function createAssistant(event) {
  event.preventDefault();
  const name = document.getElementById("assistant-name").value.trim();
  const color = document.getElementById("assistant-color").value;
  const pin = document.getElementById("assistant-pin-new").value.trim();
  if (pin.length < 4) {
    alert("Bitte PIN mit mindestens 4 Zeichen vergeben.");
    return;
  }
  const newAssistant = {
    id: crypto.randomUUID(),
    name,
    color,
    pin,
  };
  state.assistants.push(newAssistant);
  saveState();
  renderAssistants();
  closeModal();
}

function attachEvents() {
  document.getElementById("admin-login").addEventListener("submit", loginAdmin);
  document.getElementById("assistant-login").addEventListener("submit", loginAssistant);
  document.getElementById("save-plan").addEventListener("click", persistPlan);
  document.getElementById("add-assistant").addEventListener("click", openModal);
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("create-assistant").addEventListener("submit", createAssistant);
  document.getElementById("open-admin").addEventListener("click", () =>
    document.getElementById("admin-password").focus()
  );
  document.getElementById("open-assistant").addEventListener("click", () => assistantSelect.focus());
  monthPicker.addEventListener("change", (event) => renderPlanner(event.target.value));
}

renderAssistants();
buildHeroStats();
renderOccupancy(occupancyContainer);
attachEvents();

