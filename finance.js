const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];

const defaultInventory = {
  A: { stock: 5 },
  B: { stock: 3 },
  C: { stock: 2 },
  G: { stock: 2 },
  I: { stock: 4 },
  L: { stock: 4 },
  M: { stock: 3 },
  O: { stock: 5 },
  R: { stock: 3 },
  S: { stock: 3 },
  Y: { stock: 1 },
  "★": { stock: 2 },
  "✝": { stock: 1 },
  "♥": { stock: 2 },
  "*": { stock: 2 },
  "&": { stock: 1 },
};

let state = loadState();

const els = {
  financeToday: document.querySelector("#financeToday"),
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  grossTotal: document.querySelector("#grossTotal"),
  collectedTotal: document.querySelector("#collectedTotal"),
  pendingTotal: document.querySelector("#pendingTotal"),
  filteredTotal: document.querySelector("#filteredTotal"),
  pendingLetters: document.querySelector("#pendingLetters"),
  grossBar: document.querySelector("#grossBar"),
  collectedBar: document.querySelector("#collectedBar"),
  pendingBar: document.querySelector("#pendingBar"),
  filteredBar: document.querySelector("#filteredBar"),
  pendingLettersBar: document.querySelector("#pendingLettersBar"),
  inventoryForm: document.querySelector("#inventoryForm"),
  priceForm: document.querySelector("#priceForm"),
  letterUnitPrice: document.querySelector("#letterUnitPrice"),
  inventoryLetter: document.querySelector("#inventoryLetter"),
  inventoryStock: document.querySelector("#inventoryStock"),
  inventoryTable: document.querySelector("#inventoryTable"),
  decoratorForm: document.querySelector("#decoratorForm"),
  decoratorName: document.querySelector("#decoratorName"),
  decoratorList: document.querySelector("#decoratorList"),
  decoratorStats: document.querySelector("#decoratorStats"),
};

init();

function init() {
  const today = dateInput(new Date());
  els.financeToday.textContent = longDate(today);
  els.dateFrom.value = monthStart(today);
  els.dateTo.value = today;
  els.letterUnitPrice.value = state.settings.letterUnitPrice;
  bindEvents();
  render();
}

function bindEvents() {
  els.dateFrom.addEventListener("change", render);
  els.dateTo.addEventListener("change", render);
  els.priceForm.addEventListener("submit", savePrice);
  els.inventoryForm.addEventListener("submit", saveInventory);
  els.decoratorForm.addEventListener("submit", saveDecorator);
  window.addEventListener("storage", syncStoredState);
  window.addEventListener("focus", syncStoredState);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return { inventory: structuredClone(defaultInventory), settings: { letterUnitPrice: 10000 }, decorators: ["Particular"], orders: [] };

  try {
    const raw = JSON.parse(stored);
    const inventory = { ...structuredClone(defaultInventory) };
    Object.entries(raw.inventory || {}).forEach(([letter, value]) => {
      inventory[letter] =
        typeof value === "number"
          ? { stock: value }
          : { stock: Number(value.stock) || 0 };
    });
    const settings = { letterUnitPrice: Number(raw.settings?.letterUnitPrice) || inferLegacyUnitPrice(raw.inventory) || 10000 };
    return {
      inventory,
      settings,
      decorators: raw.decorators?.length ? raw.decorators : ["Particular"],
      orders: (raw.orders || [])
        .filter((order) => !isSeedExample(order))
        .map((order) => ({
          ...order,
          decorator: order.decorator || "Particular",
          totalAmount: Number(order.totalAmount) || estimatePrice(order.letters || {}, settings),
          depositAmount: Number(order.depositAmount) || 0,
        })),
    };
  } catch {
    return { inventory: structuredClone(defaultInventory), settings: { letterUnitPrice: 10000 }, decorators: ["Particular"], orders: [] };
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
  renderTotals();
  els.letterUnitPrice.value = state.settings.letterUnitPrice;
  renderInventory();
  renderDecorators();
  renderDecoratorStats();
}

function renderTotals() {
  const orders = state.orders;
  const filtered = orders.filter((order) => order.eventDate >= els.dateFrom.value && order.eventDate <= els.dateTo.value);
  const gross = sum(orders, "totalAmount");
  const collected = sum(orders, "depositAmount");
  const pending = orders.reduce((total, order) => total + Math.max((order.totalAmount || 0) - (order.depositAmount || 0), 0), 0);
  const filteredTotal = sum(filtered, "totalAmount");
  const pendingLetters = countPendingReturnLetters(orders);
  const activeLetters = countActiveLetters(orders);

  els.grossTotal.textContent = formatMoney(gross);
  els.collectedTotal.textContent = formatMoney(collected);
  els.pendingTotal.textContent = formatMoney(pending);
  els.filteredTotal.textContent = formatMoney(filteredTotal);
  els.pendingLetters.textContent = pendingLetters;

  setBar(els.grossBar, gross ? 100 : 0);
  setBar(els.collectedBar, percent(collected, gross));
  setBar(els.pendingBar, percent(pending, gross));
  setBar(els.filteredBar, percent(filteredTotal, gross));
  setBar(els.pendingLettersBar, percent(pendingLetters, activeLetters || pendingLetters));
}

function renderInventory() {
  els.inventoryTable.innerHTML = Object.entries(state.inventory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([letter, item]) => `
        <article class="config-row">
          <strong>${escapeHtml(letter)}</strong>
          <span>Stock ${item.stock}</span>
          <button type="button" data-edit-letter="${escapeHtml(letter)}">Editar</button>
          <button type="button" data-delete-letter="${escapeHtml(letter)}">Borrar</button>
        </article>
      `,
    )
    .join("");

  els.inventoryTable.querySelectorAll("[data-edit-letter]").forEach((button) => {
    button.addEventListener("click", () => {
      const letter = button.dataset.editLetter;
      els.inventoryLetter.value = letter;
      els.inventoryStock.value = state.inventory[letter].stock;
    });
  });
  els.inventoryTable.querySelectorAll("[data-delete-letter]").forEach((button) => {
    button.addEventListener("click", () => {
      delete state.inventory[button.dataset.deleteLetter];
      persist();
      render();
    });
  });
}

function saveInventory(event) {
  event.preventDefault();
  const letter = normalizeInventoryKey(els.inventoryLetter.value);
  if (!letter) return;
  state.inventory[letter] = {
    stock: Math.max(Number(els.inventoryStock.value) || 0, 0),
  };
  persist();
  els.inventoryForm.reset();
  render();
}

function normalizeInventoryKey(value) {
  const key = value.trim();
  return key.length === 1 ? key.toUpperCase() : key;
}

function renderDecorators() {
  els.decoratorList.innerHTML = state.decorators
    .map(
      (decorator) => `
        <article class="config-row">
          <strong>${escapeHtml(decorator)}</strong>
          <button type="button" data-delete-decorator="${escapeHtml(decorator)}">Borrar</button>
        </article>
      `,
    )
    .join("");

  els.decoratorList.querySelectorAll("[data-delete-decorator]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.deleteDecorator;
      state.decorators = state.decorators.filter((decorator) => decorator !== name);
      state.orders = state.orders.map((order) => (order.decorator === name ? { ...order, decorator: "Particular" } : order));
      if (!state.decorators.length) state.decorators = ["Particular"];
      persist();
      render();
    });
  });
}

function saveDecorator(event) {
  event.preventDefault();
  const name = els.decoratorName.value.trim();
  if (!name || state.decorators.includes(name)) return;
  state.decorators.push(name);
  state.decorators.sort((a, b) => a.localeCompare(b));
  persist();
  els.decoratorForm.reset();
  render();
}

function renderDecoratorStats() {
  const stats = state.orders.reduce((acc, order) => {
    const name = order.decorator || "Particular";
    acc[name] ||= { count: 0, total: 0, collected: 0 };
    acc[name].count += 1;
    acc[name].total += order.totalAmount || 0;
    acc[name].collected += order.depositAmount || 0;
    return acc;
  }, {});

  const rows = Object.entries(stats).sort(([, a], [, b]) => b.total - a.total);
  els.decoratorStats.innerHTML = rows.length
    ? rows
        .map(
          ([name, item], index) => `
            <article class="order-card">
              <div class="order-top">
                <div>
                  <strong>${index + 1}. ${escapeHtml(name)}</strong>
                  <p>${item.count} evento(s) · ${formatMoney(item.total)} vendidos · ${formatMoney(item.collected)} cobrados</p>
                </div>
              </div>
            </article>
          `,
        )
        .join("")
    : `<p class="empty-state">Todavía no hay eventos cargados.</p>`;
}

function savePrice(event) {
  event.preventDefault();
  state.settings.letterUnitPrice = Math.max(Number(els.letterUnitPrice.value) || 0, 0);
  state.orders = state.orders.map((order) => ({
    ...order,
    totalAmount: order.totalAmount || estimatePrice(order.letters || {}, state.settings),
  }));
  persist();
  render();
}

function estimatePrice(letters, settings = state.settings) {
  const quantity = Object.values(letters).reduce((total, amount) => total + amount, 0);
  return quantity * (settings?.letterUnitPrice || 0);
}

function countPendingReturnLetters(orders) {
  const today = dateInput(new Date());
  return orders
    .filter((order) => order.status === "active" && order.pickupDate <= today && order.returnDate >= today)
    .reduce((total, order) => total + Object.values(order.letters || {}).reduce((sum, quantity) => sum + quantity, 0), 0);
}

function countActiveLetters(orders) {
  return orders
    .filter((order) => order.status === "active")
    .reduce((total, order) => total + Object.values(order.letters || {}).reduce((sum, quantity) => sum + quantity, 0), 0);
}

function isSeedExample(order) {
  return [
    ["Josefina", "AMBAR", "2026-06-05"],
    ["Roberto", "RYA", "2026-06-05"],
    ["Cumple Alma", "ALMA", "2026-06-06"],
  ].some(([client, word, eventDate]) => order.client === client && order.word === word && order.eventDate === eventDate);
}

function percent(value, total) {
  return total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
}

function setBar(element, value) {
  element.style.width = `${value}%`;
}

function inferLegacyUnitPrice(inventory) {
  const prices = Object.values(inventory || {})
    .map((item) => (typeof item === "object" ? Number(item.price) : 0))
    .filter(Boolean);
  return prices.length ? Math.max(...prices) : 0;
}

function sum(orders, key) {
  return orders.reduce((total, order) => total + (Number(order[key]) || 0), 0);
}

function monthStart(value) {
  return `${value.slice(0, 8)}01`;
}

function dateInput(date) {
  return date.toISOString().slice(0, 10);
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
