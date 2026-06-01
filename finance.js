const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];

const defaultInventory = {
  A: { stock: 5, price: 1200 },
  B: { stock: 3, price: 1200 },
  C: { stock: 2, price: 1200 },
  G: { stock: 2, price: 1200 },
  I: { stock: 4, price: 1200 },
  L: { stock: 4, price: 1200 },
  M: { stock: 3, price: 1200 },
  O: { stock: 5, price: 1200 },
  R: { stock: 3, price: 1200 },
  S: { stock: 3, price: 1200 },
  Y: { stock: 1, price: 1200 },
  "★": { stock: 2, price: 1500 },
  "✝": { stock: 1, price: 1500 },
  "♥": { stock: 2, price: 1500 },
  "*": { stock: 2, price: 1500 },
  "&": { stock: 1, price: 1500 },
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
  inventoryForm: document.querySelector("#inventoryForm"),
  inventoryLetter: document.querySelector("#inventoryLetter"),
  inventoryStock: document.querySelector("#inventoryStock"),
  inventoryPrice: document.querySelector("#inventoryPrice"),
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
  bindEvents();
  render();
}

function bindEvents() {
  els.dateFrom.addEventListener("change", render);
  els.dateTo.addEventListener("change", render);
  els.inventoryForm.addEventListener("submit", saveInventory);
  els.decoratorForm.addEventListener("submit", saveDecorator);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return { inventory: structuredClone(defaultInventory), decorators: ["Particular"], orders: [] };

  try {
    const raw = JSON.parse(stored);
    const inventory = { ...structuredClone(defaultInventory) };
    Object.entries(raw.inventory || {}).forEach(([letter, value]) => {
      inventory[letter] =
        typeof value === "number"
          ? { stock: value, price: defaultInventory[letter]?.price || 1200 }
          : { stock: Number(value.stock) || 0, price: Number(value.price) || defaultInventory[letter]?.price || 1200 };
    });
    return {
      inventory,
      decorators: raw.decorators?.length ? raw.decorators : ["Particular"],
      orders: (raw.orders || []).map((order) => ({
        ...order,
        decorator: order.decorator || "Particular",
        totalAmount: Number(order.totalAmount) || estimatePrice(order.letters || {}, inventory),
        depositAmount: Number(order.depositAmount) || 0,
      })),
    };
  } catch {
    return { inventory: structuredClone(defaultInventory), decorators: ["Particular"], orders: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderTotals();
  renderInventory();
  renderDecorators();
  renderDecoratorStats();
}

function renderTotals() {
  const orders = state.orders;
  const filtered = orders.filter((order) => order.eventDate >= els.dateFrom.value && order.eventDate <= els.dateTo.value);
  els.grossTotal.textContent = formatMoney(sum(orders, "totalAmount"));
  els.collectedTotal.textContent = formatMoney(sum(orders, "depositAmount"));
  els.pendingTotal.textContent = formatMoney(orders.reduce((total, order) => total + Math.max((order.totalAmount || 0) - (order.depositAmount || 0), 0), 0));
  els.filteredTotal.textContent = formatMoney(sum(filtered, "totalAmount"));
}

function renderInventory() {
  els.inventoryTable.innerHTML = Object.entries(state.inventory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([letter, item]) => `
        <article class="config-row">
          <strong>${escapeHtml(letter)}</strong>
          <span>Stock ${item.stock}</span>
          <span>${formatMoney(item.price)}</span>
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
      els.inventoryPrice.value = state.inventory[letter].price;
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
  const letter = els.inventoryLetter.value.trim().toUpperCase();
  if (!letter) return;
  state.inventory[letter] = {
    stock: Math.max(Number(els.inventoryStock.value) || 0, 0),
    price: Math.max(Number(els.inventoryPrice.value) || 0, 0),
  };
  persist();
  els.inventoryForm.reset();
  render();
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

function estimatePrice(letters, inventory) {
  return Object.entries(letters).reduce((total, [letter, quantity]) => total + quantity * (inventory[letter]?.price || 0), 0);
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