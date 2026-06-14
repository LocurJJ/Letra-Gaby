const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];
const slotLabels = { morning: "mañana", afternoon: "tarde", night: "noche" };

let state = loadState();

const els = {
  decoratorsToday: document.querySelector("#decoratorsToday"),
  activeDecoratorsCount: document.querySelector("#activeDecoratorsCount"),
  activeOrdersCount: document.querySelector("#activeOrdersCount"),
  activeLettersCount: document.querySelector("#activeLettersCount"),
  decoratorsBoard: document.querySelector("#decoratorsBoard"),
};

init();

function init() {
  els.decoratorsToday.textContent = longDate(dateInput(new Date()));
  window.addEventListener("storage", syncStoredState);
  window.addEventListener("focus", syncStoredState);
  render();
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return { decorators: ["Particular"], orders: [] };

  try {
    const raw = JSON.parse(stored);
    return {
      ...raw,
      decorators: raw.decorators?.length ? raw.decorators : ["Particular"],
      orders: (raw.orders || [])
        .filter((order) => !isSeedExample(order))
        .map((order) => ({
          ...order,
          decorator: order.decorator || order.client || "Particular",
          pickupPerson: order.pickupPerson || "",
          depositAmount: Number(order.depositAmount) || 0,
          totalAmount: Number(order.totalAmount) || 0,
        })),
    };
  } catch {
    return { decorators: ["Particular"], orders: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

function syncStoredState() {
  state = loadState();
  render();
}

function render() {
  const activeOrders = state.orders.filter((order) => order.status === "active");
  const groups = groupByDecorator(activeOrders);
  const activeGroups = groups.filter((group) => group.orders.length);

  els.activeDecoratorsCount.textContent = activeGroups.length;
  els.activeOrdersCount.textContent = activeOrders.length;
  els.activeLettersCount.textContent = activeOrders.reduce((total, order) => total + lettersCount(order.letters), 0);
  els.decoratorsBoard.innerHTML = activeGroups.length
    ? activeGroups.map(decoratorCard).join("")
    : `<p class="empty-state">No hay decoradoras con letras afuera.</p>`;

  els.decoratorsBoard.querySelectorAll("[data-return-order]").forEach((button) => {
    button.addEventListener("click", () => markReturned(button.dataset.returnOrder));
  });
}

function groupByDecorator(orders) {
  const names = [...new Set([...(state.decorators || []), ...orders.map((order) => order.decorator || "Particular")])];
  return names
    .map((name) => {
      const items = orders.filter((order) => (order.decorator || "Particular") === name);
      return {
        name,
        orders: items.sort((a, b) => a.returnDate.localeCompare(b.returnDate)),
        totalLetters: items.reduce((total, order) => total + lettersCount(order.letters), 0),
        totalDue: items.reduce((total, order) => total + amountDue(order), 0),
      };
    })
    .sort((a, b) => b.totalLetters - a.totalLetters || a.name.localeCompare(b.name));
}

function decoratorCard(group) {
  const words = group.orders.map((order) => order.word).filter(Boolean).join(" y ");
  return `
    <article class="decorator-card">
      <div class="decorator-card-head">
        <div>
          <strong>${escapeHtml(group.name)}</strong>
          <p>tiene ${escapeHtml(words || "---")}</p>
        </div>
        <div class="decorator-totals">
          <span>${group.totalLetters} letras</span>
          <span>Debe ${group.totalDue ? formatMoney(group.totalDue) : "---"}</span>
        </div>
      </div>
      <div class="decorator-orders">
        ${group.orders.map(orderRow).join("")}
      </div>
    </article>
  `;
}

function orderRow(order) {
  const due = amountDue(order);
  return `
    <article class="decorator-order">
      <div>
        <strong>${escapeHtml(order.word || "---")}</strong>
        <p>${lettersText(order.letters)} · Evento ${shortDate(order.eventDate)} · Devuelve ${shortDate(order.returnDate)} ${slotLabels[order.returnSlot]}</p>
        <p>Retira: ${escapeHtml(order.pickupPerson || "sin cargar")} · Debe ${due ? formatMoney(due) : "---"}</p>
      </div>
      <button type="button" data-return-order="${order.id}">Devolvió</button>
    </article>
  `;
}

function markReturned(id) {
  state.orders = state.orders.map((order) => (order.id === id ? { ...order, status: "completed" } : order));
  persist();
  render();
}

function lettersText(letters = {}) {
  return Object.entries(letters).sort(([a], [b]) => a.localeCompare(b)).map(([letter, quantity]) => `${letter}x${quantity}`).join(", ");
}

function lettersCount(letters = {}) {
  return Object.values(letters).reduce((total, quantity) => total + quantity, 0);
}

function amountDue(order) {
  return Math.max((Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0), 0);
}

function isSeedExample(order) {
  return [
    ["Josefina", "AMBAR", "2026-06-05"],
    ["Roberto", "RYA", "2026-06-05"],
    ["Cumple Alma", "ALMA", "2026-06-06"],
  ].some(([client, word, eventDate]) => order.client === client && order.word === word && order.eventDate === eventDate);
}

function dateInput(date) {
  return date.toISOString().slice(0, 10);
}

function shortDate(date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}

function longDate(date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${date}T00:00:00`));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
