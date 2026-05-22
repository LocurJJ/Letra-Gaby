const STORAGE_KEY = "letras-gaby-v1";

const slotLabels = {
  morning: "mañana",
  afternoon: "tarde",
  night: "noche",
};

const slotOrder = {
  morning: 0,
  afternoon: 1,
  night: 2,
};

const demoState = {
  inventory: {
    A: 5,
    B: 3,
    C: 2,
    G: 2,
    I: 4,
    L: 4,
    M: 3,
    O: 5,
    S: 3,
  },
  orders: [
    {
      id: crypto.randomUUID(),
      client: "Cumple Alma",
      eventDate: "2026-05-29",
      pickupDate: "2026-05-28",
      pickupSlot: "afternoon",
      returnDate: "2026-05-30",
      returnSlot: "morning",
      letters: { A: 2, L: 1, M: 1 },
      note: "Retira la mamá, pago señado.",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      client: "Evento Gaby",
      eventDate: "2026-05-30",
      pickupDate: "2026-05-30",
      pickupSlot: "night",
      returnDate: "2026-05-31",
      returnSlot: "afternoon",
      letters: { A: 3, G: 1, B: 1, Y: 1 },
      note: "Caso permitido porque el pedido anterior devuelve sábado a la mañana.",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
};

let state = loadState();
let draftLetters = {};

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  orderForm: document.querySelector("#orderForm"),
  clientName: document.querySelector("#clientName"),
  eventDate: document.querySelector("#eventDate"),
  pickupDate: document.querySelector("#pickupDate"),
  pickupSlot: document.querySelector("#pickupSlot"),
  returnDate: document.querySelector("#returnDate"),
  returnSlot: document.querySelector("#returnSlot"),
  letterSelect: document.querySelector("#letterSelect"),
  letterQuantity: document.querySelector("#letterQuantity"),
  addLetterButton: document.querySelector("#addLetterButton"),
  selectedLetters: document.querySelector("#selectedLetters"),
  availabilityAlert: document.querySelector("#availabilityAlert"),
  reportDate: document.querySelector("#reportDate"),
  dailyReport: document.querySelector("#dailyReport"),
  eventsCount: document.querySelector("#eventsCount"),
  pickupCount: document.querySelector("#pickupCount"),
  returnCount: document.querySelector("#returnCount"),
  messageDraft: document.querySelector("#messageDraft"),
  copyMessageButton: document.querySelector("#copyMessageButton"),
  inventoryForm: document.querySelector("#inventoryForm"),
  inventoryLetter: document.querySelector("#inventoryLetter"),
  inventoryQuantity: document.querySelector("#inventoryQuantity"),
  inventoryGrid: document.querySelector("#inventoryGrid"),
  ordersList: document.querySelector("#ordersList"),
  statusFilter: document.querySelector("#statusFilter"),
  clearFormButton: document.querySelector("#clearFormButton"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
};

initialize();

function initialize() {
  const today = toDateInputValue(new Date());
  els.todayLabel.textContent = formatLongDate(today);
  els.eventDate.value = today;
  els.pickupDate.value = shiftDate(today, -1);
  els.returnDate.value = shiftDate(today, 1);
  els.reportDate.value = today;

  bindEvents();
  render();
}

function bindEvents() {
  els.addLetterButton.addEventListener("click", addDraftLetter);
  els.orderForm.addEventListener("submit", saveOrder);
  els.inventoryForm.addEventListener("submit", saveInventoryItem);
  els.reportDate.addEventListener("change", renderReport);
  els.statusFilter.addEventListener("change", renderOrders);
  els.clearFormButton.addEventListener("click", clearForm);
  els.resetDemoButton.addEventListener("click", resetDemo);
  els.copyMessageButton.addEventListener("click", copyMessage);

  ["eventDate", "pickupDate", "pickupSlot", "returnDate", "returnSlot"].forEach((key) => {
    els[key].addEventListener("change", () => {
      if (key === "eventDate" && els.eventDate.value) {
        els.pickupDate.value = shiftDate(els.eventDate.value, -1);
        els.returnDate.value = shiftDate(els.eventDate.value, 1);
      }
      renderAvailability();
    });
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(demoState);

  try {
    const parsed = JSON.parse(stored);
    return {
      inventory: parsed.inventory || structuredClone(demoState.inventory),
      orders: parsed.orders || [],
    };
  } catch {
    return structuredClone(demoState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderLetterOptions();
  renderDraftLetters();
  renderAvailability();
  renderInventory();
  renderReport();
  renderOrders();
}

function renderLetterOptions() {
  const letters = Object.keys(state.inventory).sort((a, b) => a.localeCompare(b));
  els.letterSelect.innerHTML = letters
    .map((letter) => `<option value="${letter}">${letter} (${state.inventory[letter]})</option>`)
    .join("");
}

function addDraftLetter() {
  const letter = els.letterSelect.value;
  const quantity = Math.max(1, Number(els.letterQuantity.value) || 1);
  if (!letter) return;

  draftLetters[letter] = (draftLetters[letter] || 0) + quantity;
  els.letterQuantity.value = 1;
  renderDraftLetters();
  renderAvailability();
}

function renderDraftLetters() {
  const entries = Object.entries(draftLetters).sort(([a], [b]) => a.localeCompare(b));
  els.selectedLetters.innerHTML = entries
    .map(
      ([letter, quantity]) => `
        <span class="letter-pill">
          ${letter} x${quantity}
          <button type="button" data-remove-letter="${letter}" title="Quitar ${letter}">x</button>
        </span>
      `,
    )
    .join("");

  els.selectedLetters.querySelectorAll("[data-remove-letter]").forEach((button) => {
    button.addEventListener("click", () => {
      delete draftLetters[button.dataset.removeLetter];
      renderDraftLetters();
      renderAvailability();
    });
  });
}

function saveOrder(event) {
  event.preventDefault();

  const validation = validateDraft();
  if (!validation.ok) {
    showAvailability(validation.message, "bad");
    return;
  }

  state.orders.push({
    id: crypto.randomUUID(),
    client: els.clientName.value.trim(),
    eventDate: els.eventDate.value,
    pickupDate: els.pickupDate.value,
    pickupSlot: els.pickupSlot.value,
    returnDate: els.returnDate.value,
    returnSlot: els.returnSlot.value,
    letters: { ...draftLetters },
    note: els.orderNote.value.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  });

  persist();
  clearForm();
  render();
}

function validateDraft() {
  if (!Object.keys(draftLetters).length) {
    return { ok: false, message: "Agregá al menos una letra al pedido." };
  }

  if (toStamp(els.pickupDate.value, els.pickupSlot.value) > toStamp(els.returnDate.value, els.returnSlot.value)) {
    return { ok: false, message: "La devolución tiene que ser posterior al retiro." };
  }

  const conflicts = getConflicts({
    pickupDate: els.pickupDate.value,
    pickupSlot: els.pickupSlot.value,
    returnDate: els.returnDate.value,
    returnSlot: els.returnSlot.value,
    letters: draftLetters,
  });

  if (conflicts.length) {
    return {
      ok: false,
      message: conflicts
        .map(
          (item) =>
            `${item.letter}: pedís ${item.requested}, hay ${item.available} disponibles. Choca con ${item.orders.join(", ")}.`,
        )
        .join(" "),
    };
  }

  return { ok: true };
}

function renderAvailability() {
  if (!Object.keys(draftLetters).length) {
    showAvailability("Elegí fechas y letras para revisar la disponibilidad.", "neutral");
    return;
  }

  const validation = validateDraft();
  if (!validation.ok) {
    showAvailability(validation.message, "bad");
    return;
  }

  const range = `${formatShortDate(els.pickupDate.value)} ${slotLabels[els.pickupSlot.value]} a ${formatShortDate(
    els.returnDate.value,
  )} ${slotLabels[els.returnSlot.value]}`;
  showAvailability(`Disponible para reservar de ${range}.`, "good");
}

function showAvailability(message, type) {
  els.availabilityAlert.className = `availability-alert ${type}`;
  els.availabilityAlert.textContent = message;
}

function getConflicts(candidate) {
  const activeOrders = state.orders.filter((order) => order.status === "active" && rangesOverlap(order, candidate));

  return Object.entries(candidate.letters)
    .map(([letter, requested]) => {
      const used = activeOrders.reduce((total, order) => total + (order.letters[letter] || 0), 0);
      const stock = state.inventory[letter] || 0;
      const available = stock - used;
      return {
        letter,
        requested,
        available,
        orders: activeOrders.filter((order) => order.letters[letter]).map((order) => order.client),
      };
    })
    .filter((item) => item.requested > item.available);
}

function rangesOverlap(a, b) {
  return (
    toStamp(a.pickupDate, a.pickupSlot) <= toStamp(b.returnDate, b.returnSlot) &&
    toStamp(a.returnDate, a.returnSlot) >= toStamp(b.pickupDate, b.pickupSlot)
  );
}

function saveInventoryItem(event) {
  event.preventDefault();
  const letter = els.inventoryLetter.value.trim().toUpperCase();
  const quantity = Math.max(0, Number(els.inventoryQuantity.value) || 0);
  if (!letter) return;

  state.inventory[letter] = quantity;
  persist();
  els.inventoryForm.reset();
  els.inventoryQuantity.value = 1;
  render();
}

function renderInventory() {
  els.inventoryGrid.innerHTML = Object.entries(state.inventory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([letter, quantity]) => `
        <span class="stock-tile">
          ${letter}
          <small>${quantity}</small>
          <button type="button" data-delete-stock="${letter}" title="Eliminar ${letter}">x</button>
        </span>
      `,
    )
    .join("");

  els.inventoryGrid.querySelectorAll("[data-delete-stock]").forEach((button) => {
    button.addEventListener("click", () => {
      delete state.inventory[button.dataset.deleteStock];
      persist();
      render();
    });
  });
}

function renderReport() {
  const date = els.reportDate.value;
  const events = state.orders.filter((order) => order.status === "active" && order.eventDate === date);
  const pickups = state.orders.filter((order) => order.status === "active" && order.pickupDate === date);
  const returns = state.orders.filter((order) => order.status === "active" && order.returnDate === date);
  const items = [
    ...events.map((order) => ({ type: "event", label: "Evento", order })),
    ...pickups.map((order) => ({ type: "pickup", label: "Retiro", order })),
    ...returns.map((order) => ({ type: "return", label: "Devolución", order })),
  ].sort((a, b) => getRelevantSlot(a).localeCompare(getRelevantSlot(b)));

  els.eventsCount.textContent = events.length;
  els.pickupCount.textContent = pickups.length;
  els.returnCount.textContent = returns.length;

  els.dailyReport.innerHTML = items.length
    ? items.map(renderReportItem).join("")
    : `<p class="empty-state">No hay movimientos cargados para ${formatLongDate(date)}.</p>`;

  els.messageDraft.value = buildMessage(date, events, pickups, returns);
}

function renderReportItem(item) {
  const { order } = item;
  const slot = getRelevantSlot(item);
  return `
    <article class="report-item">
      <strong>${item.label}: ${order.client}</strong>
      <p class="meta-line">${slot ? `Turno ${slotLabels[slot]}. ` : ""}${lettersToText(order.letters)}</p>
      <div class="tag-row">
        <span class="tag ${item.type}">${item.label}</span>
        <span class="tag">Evento ${formatShortDate(order.eventDate)}</span>
      </div>
    </article>
  `;
}

function getRelevantSlot(item) {
  if (item.type === "pickup") return item.order.pickupSlot;
  if (item.type === "return") return item.order.returnSlot;
  return "afternoon";
}

function buildMessage(date, events, pickups, returns) {
  const lines = [`Agenda ${formatLongDate(date)}`];

  if (pickups.length) {
    lines.push("", "Retiros:");
    pickups.forEach((order) => lines.push(`- ${order.client}: ${lettersToText(order.letters)} (${slotLabels[order.pickupSlot]})`));
  }

  if (events.length) {
    lines.push("", "Eventos:");
    events.forEach((order) => lines.push(`- ${order.client}: ${lettersToText(order.letters)}`));
  }

  if (returns.length) {
    lines.push("", "Devoluciones:");
    returns.forEach((order) => lines.push(`- ${order.client}: ${lettersToText(order.letters)} (${slotLabels[order.returnSlot]})`));
  }

  if (lines.length === 1) lines.push("", "Sin movimientos cargados.");
  return lines.join("\n");
}

async function copyMessage() {
  await navigator.clipboard.writeText(els.messageDraft.value);
  els.copyMessageButton.textContent = "Copiado";
  window.setTimeout(() => {
    els.copyMessageButton.textContent = "Copiar";
  }, 1200);
}

function renderOrders() {
  const filter = els.statusFilter.value;
  const orders = state.orders
    .filter((order) => filter === "all" || order.status === filter)
    .sort((a, b) => toStamp(a.pickupDate, a.pickupSlot) - toStamp(b.pickupDate, b.pickupSlot));

  els.ordersList.innerHTML = orders.length
    ? orders.map(renderOrderCard).join("")
    : `<p class="empty-state">No hay pedidos para este filtro.</p>`;

  els.ordersList.querySelectorAll("[data-complete-order]").forEach((button) => {
    button.addEventListener("click", () => updateOrderStatus(button.dataset.completeOrder, "completed"));
  });

  els.ordersList.querySelectorAll("[data-reactivate-order]").forEach((button) => {
    button.addEventListener("click", () => updateOrderStatus(button.dataset.reactivateOrder, "active"));
  });

  els.ordersList.querySelectorAll("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder));
  });
}

function renderOrderCard(order) {
  const isActive = order.status === "active";
  return `
    <article class="order-card">
      <div class="order-top">
        <div>
          <strong>${order.client}</strong>
          <p>${lettersToText(order.letters)}</p>
        </div>
        <div class="order-actions">
          ${
            isActive
              ? `<button type="button" data-complete-order="${order.id}">Finalizar</button>`
              : `<button type="button" data-reactivate-order="${order.id}">Activar</button>`
          }
          <button type="button" data-delete-order="${order.id}">Borrar</button>
        </div>
      </div>
      <p>Evento ${formatShortDate(order.eventDate)}. Retira ${formatShortDate(order.pickupDate)} ${
        slotLabels[order.pickupSlot]
      }, devuelve ${formatShortDate(order.returnDate)} ${slotLabels[order.returnSlot]}.</p>
      ${order.note ? `<p>${order.note}</p>` : ""}
      <div class="tag-row">
        <span class="tag ${isActive ? "event" : ""}">${isActive ? "Activo" : "Finalizado"}</span>
      </div>
    </article>
  `;
}

function updateOrderStatus(id, status) {
  state.orders = state.orders.map((order) => (order.id === id ? { ...order, status } : order));
  persist();
  render();
}

function deleteOrder(id) {
  state.orders = state.orders.filter((order) => order.id !== id);
  persist();
  render();
}

function clearForm() {
  els.clientName.value = "";
  els.orderNote.value = "";
  draftLetters = {};
  renderDraftLetters();
  renderAvailability();
}

function resetDemo() {
  state = structuredClone(demoState);
  persist();
  draftLetters = {};
  render();
}

function lettersToText(letters) {
  return Object.entries(letters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, quantity]) => `${letter} x${quantity}`)
    .join(", ");
}

function toStamp(dateValue, slot) {
  const day = Math.floor(new Date(`${dateValue}T00:00:00`).getTime() / 86400000);
  return day * 3 + slotOrder[slot];
}

function shiftDate(dateValue, amount) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toDateInputValue(date);
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(`${dateValue}T00:00:00`));
}

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dateValue}T00:00:00`));
}
