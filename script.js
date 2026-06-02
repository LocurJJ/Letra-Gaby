const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];
const slotLabels = { morning: "mañana", afternoon: "tarde", night: "noche" };
const slotOrder = { morning: 0, afternoon: 1, night: 2 };

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

const initialState = {
  inventory: structuredClone(defaultInventory),
  settings: { letterUnitPrice: 10000 },
  decorators: ["Particular"],
  orders: [],
};

let state = loadState();
let textParts = [];
let draftLetters = {};
let reportView = "events";
let selectedAgendaDate = "";

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  orderForm: document.querySelector("#orderForm"),
  decoratorSelect: document.querySelector("#decoratorSelect"),
  eventDate: document.querySelector("#eventDate"),
  orderLineInput: document.querySelector("#orderLineInput"),
  addTextLineButton: document.querySelector("#addTextLineButton"),
  orderPreview: document.querySelector("#orderPreview"),
  selectedLetters: document.querySelector("#selectedLetters"),
  pickupDate: document.querySelector("#pickupDate"),
  pickupSlot: document.querySelector("#pickupSlot"),
  returnDate: document.querySelector("#returnDate"),
  returnSlot: document.querySelector("#returnSlot"),
  pickupPerson: document.querySelector("#pickupPerson"),
  totalAmount: document.querySelector("#totalAmount"),
  depositAmount: document.querySelector("#depositAmount"),
  paymentPreview: document.querySelector("#paymentPreview"),
  orderNote: document.querySelector("#orderNote"),
  availabilityAlert: document.querySelector("#availabilityAlert"),
  reportDate: document.querySelector("#reportDate"),
  daySummary: document.querySelector("#daySummary"),
  dailyReport: document.querySelector("#dailyReport"),
  eventsCount: document.querySelector("#eventsCount"),
  pickupCount: document.querySelector("#pickupCount"),
  returnCount: document.querySelector("#returnCount"),
  messageDraft: document.querySelector("#messageDraft"),
  copyMessageButton: document.querySelector("#copyMessageButton"),
  statusFilter: document.querySelector("#statusFilter"),
  upcomingDays: document.querySelector("#upcomingDays"),
  ordersList: document.querySelector("#ordersList"),
  clearFormButton: document.querySelector("#clearFormButton"),
};

init();

function init() {
  const today = dateInput(new Date());
  els.todayLabel.textContent = longDate(today);
  els.eventDate.value = today;
  els.pickupDate.value = shiftDate(today, -1);
  els.returnDate.value = shiftDate(today, 1);
  els.reportDate.value = today;
  renderDecorators();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.addTextLineButton.addEventListener("click", addTextLine);
  els.orderLineInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTextLine();
    }
  });
  document.querySelectorAll("[data-special-char]").forEach((button) => {
    button.addEventListener("click", () => {
      textParts.push(button.dataset.specialChar);
      syncText();
    });
  });
  document.querySelectorAll("[data-report-view]").forEach((card) => {
    card.addEventListener("click", () => setReportView(card.dataset.reportView));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") setReportView(card.dataset.reportView);
    });
  });
  ["eventDate", "pickupDate", "pickupSlot", "returnDate", "returnSlot"].forEach((id) => {
    els[id].addEventListener("change", () => {
      if (id === "eventDate") {
        els.pickupDate.value = shiftDate(els.eventDate.value, -1);
        els.returnDate.value = shiftDate(els.eventDate.value, 1);
      }
      renderAvailability();
    });
  });
  els.depositAmount.addEventListener("input", renderPaymentPreview);
  els.orderForm.addEventListener("submit", saveOrder);
  els.reportDate.addEventListener("change", () => {
    selectedAgendaDate = els.reportDate.value;
    renderReport();
    renderAgenda();
  });
  els.statusFilter.addEventListener("change", renderAgenda);
  els.clearFormButton.addEventListener("click", clearForm);
  els.copyMessageButton.addEventListener("click", copyMessage);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return structuredClone(initialState);

  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeState(raw) {
  const inventory = { ...structuredClone(defaultInventory) };
  Object.entries(raw.inventory || {}).forEach(([letter, value]) => {
    inventory[letter] =
      typeof value === "number"
        ? { stock: value }
        : { stock: Number(value.stock) || 0 };
  });

  const settings = { letterUnitPrice: Number(raw.settings?.letterUnitPrice) || inferLegacyUnitPrice(raw.inventory) || 10000 };
  const decorators = raw.decorators?.length ? raw.decorators : ["Particular"];
  const orders = (raw.orders || [])
    .filter((order) => !isSeedExample(order))
    .map((order) => ({
      ...order,
      decorator: order.decorator || "Particular",
      pickupPerson: order.pickupPerson || "",
      totalAmount: Number(order.totalAmount) || estimatePrice(order.letters || countLetters(order.word || ""), settings),
      depositAmount: Number(order.depositAmount) || 0,
    }));

  return { inventory, settings, decorators, orders };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

function renderAll() {
  renderText();
  renderPaymentPreview();
  renderAvailability();
  renderReport();
  renderAgenda();
}

function renderDecorators() {
  els.decoratorSelect.innerHTML = state.decorators
    .map((decorator) => `<option value="${escapeHtml(decorator)}">${escapeHtml(decorator)}</option>`)
    .join("");
}

function addTextLine() {
  const value = normalizeText(els.orderLineInput.value);
  if (!value) return;
  textParts.push(value);
  els.orderLineInput.value = "";
  syncText();
}

function syncText() {
  draftLetters = countLetters(textParts.join(""));
  updateAutomaticTotal();
  renderText();
  renderPaymentPreview();
  renderAvailability();
}

function renderText() {
  const word = textParts.join("");
  els.orderPreview.innerHTML = word
    ? `<strong>${escapeHtml(word)}</strong><p>${lettersText(draftLetters)}</p><div class="text-parts">${textParts
        .map((part, index) => `<span>${escapeHtml(part)} <button type="button" data-remove-part="${index}">x</button></span>`)
        .join("")}</div>`
    : `<strong>Texto</strong><p>Escribí el texto para armar la reserva.</p>`;

  els.selectedLetters.innerHTML = Object.entries(draftLetters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, quantity]) => `<span class="letter-pill">${escapeHtml(letter)}x${quantity}<button type="button" data-remove-letter="${escapeHtml(letter)}">x</button></span>`)
    .join("");

  els.orderPreview.querySelectorAll("[data-remove-part]").forEach((button) => {
    button.addEventListener("click", () => {
      textParts.splice(Number(button.dataset.removePart), 1);
      syncText();
    });
  });
  els.selectedLetters.querySelectorAll("[data-remove-letter]").forEach((button) => {
    button.addEventListener("click", () => removeOneLetter(button.dataset.removeLetter));
  });
}

function removeOneLetter(letter) {
  const partIndex = textParts.findIndex((part) => [...part].includes(letter));
  if (partIndex < 0) return;
  const chars = [...textParts[partIndex]];
  chars.splice(chars.indexOf(letter), 1);
  chars.length ? (textParts[partIndex] = chars.join("")) : textParts.splice(partIndex, 1);
  syncText();
}

function saveOrder(event) {
  event.preventDefault();
  if (els.orderLineInput.value.trim()) addTextLine();
  const validation = validateDraft();
  if (!validation.ok) {
    showAvailability(validation.message, "bad");
    return;
  }
  const order = {
    id: crypto.randomUUID(),
    client: els.decoratorSelect.value || "Particular",
    decorator: els.decoratorSelect.value || "Particular",
    eventDate: els.eventDate.value,
    pickupDate: els.pickupDate.value,
    pickupSlot: els.pickupSlot.value,
    returnDate: els.returnDate.value,
    returnSlot: els.returnSlot.value,
    word: textParts.join(""),
    letters: { ...draftLetters },
    pickupPerson: els.pickupPerson.value.trim(),
    totalAmount: estimatePrice(draftLetters),
    depositAmount: moneyValue(els.depositAmount.value),
    note: els.orderNote.value.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
  };
  state.orders.push(order);
  selectedAgendaDate = order.eventDate;
  els.reportDate.value = order.eventDate;
  persist();
  clearForm();
  renderAll();
}

function validateDraft() {
  if (!Object.keys(draftLetters).length) return { ok: false, message: "Escribí al menos una letra." };
  if (stamp(els.pickupDate.value, els.pickupSlot.value) > stamp(els.returnDate.value, els.returnSlot.value)) {
    return { ok: false, message: "La devolución tiene que ser posterior al retiro." };
  }
  const conflicts = Object.entries(draftLetters)
    .map(([letter, requested]) => {
      const overlapping = state.orders.filter((order) => order.status === "active" && rangesOverlap(order));
      const used = overlapping.reduce((total, order) => total + (order.letters[letter] || 0), 0);
      const available = (state.inventory[letter]?.stock || 0) - used;
      return { letter, requested, available, orders: overlapping.filter((order) => order.letters[letter]).map(displayOrderName) };
    })
    .filter((item) => item.requested > item.available);
  if (!conflicts.length) return { ok: true };
  return {
    ok: false,
    message: conflicts.map((item) => `${item.letter}: pedís ${item.requested}, hay ${item.available}. Choca con ${item.orders.join(", ")}.`).join(" "),
  };
}

function rangesOverlap(order) {
  return stamp(order.pickupDate, order.pickupSlot) <= stamp(els.returnDate.value, els.returnSlot.value) && stamp(order.returnDate, order.returnSlot) >= stamp(els.pickupDate.value, els.pickupSlot.value);
}

function renderAvailability() {
  if (!Object.keys(draftLetters).length) return showAvailability("Escribí el texto para revisar disponibilidad.", "neutral");
  const validation = validateDraft();
  if (!validation.ok) return showAvailability(validation.message, "bad");
  showAvailability(`Disponible para reservar: ${lettersText(draftLetters)}.`, "good");
}

function renderPaymentPreview() {
  const total = moneyValue(els.totalAmount.value);
  const deposit = moneyValue(els.depositAmount.value);
  const due = Math.max(total - deposit, 0);
  const hasLetters = Object.keys(draftLetters).length > 0;
  const status = total && due === 0 ? "Pago completo" : total ? `Falta ${formatMoney(due)}` : hasLetters ? "Configurá el precio por letra en Finanzas." : "Escribí las letras para calcular el total.";
  els.paymentPreview.textContent = `Total ${formatMoney(total)} · Seña ${formatMoney(deposit)} · ${status}`;
  els.paymentPreview.classList.toggle("paid", total > 0 && due === 0);
}

function updateAutomaticTotal() {
  els.totalAmount.value = estimatePrice(draftLetters);
}

function showAvailability(message, type) {
  els.availabilityAlert.className = `availability-alert ${type}`;
  els.availabilityAlert.textContent = message;
}

function setReportView(view) {
  reportView = view;
  document.querySelectorAll("[data-report-view]").forEach((card) => card.classList.toggle("is-active", card.dataset.reportView === view));
  renderReport();
}

function renderReport() {
  const date = els.reportDate.value;
  const active = state.orders.filter((order) => order.status === "active");
  const events = active.filter((order) => order.eventDate === date);
  const pickups = active.filter((order) => order.pickupDate === date);
  const returns = active.filter((order) => order.returnDate === date);
  const pending = active.filter((order) => order.eventDate >= todayValue()).length;
  const lists = { events, pickups, returns };
  const labels = { events: "eventos", pickups: "retiros", returns: "devoluciones" };
  els.eventsCount.textContent = pending;
  els.pickupCount.textContent = pickups.length;
  els.returnCount.textContent = returns.length;
  els.daySummary.innerHTML = events.length ? `<div class="summary-title"><strong>Letras ${shortWeekday(date)}</strong><span>${events.length} evento(s)</span></div>${lettersTable(totalLetters(events))}` : `<p class="empty-state">Ese día no tiene eventos cargados.</p>`;
  els.dailyReport.innerHTML = lists[reportView].length ? lists[reportView].map(reportCard).join("") : `<p class="empty-state">No hay ${labels[reportView]} para ${longDate(date)}.</p>`;
  els.messageDraft.value = buildMessage(date, events, pickups, returns);
}

function reportCard(order) {
  return `<article class="report-item"><strong>${escapeHtml(displayOrderName(order))}</strong><p class="compact-word">${escapeHtml(order.word)}</p><p>${lettersText(order.letters)}</p><p>${paymentLine(order)}</p></article>`;
}

function buildMessage(date, events, pickups, returns) {
  const lines = [`Agenda ${longDate(date)}`];
  if (events.length) {
    lines.push("", "Eventos:");
    events.forEach((order) => lines.push(`- ${displayOrderName(order)}: ${order.word} (${lettersText(order.letters)}) · ${plainPaymentLine(order)}`));
    lines.push("", `Letras ${shortWeekday(date)}:`);
    Object.entries(totalLetters(events)).sort(([a], [b]) => a.localeCompare(b)).forEach(([letter, quantity]) => lines.push(`- ${letter}: ${quantity}`));
  }
  if (pickups.length) {
    lines.push("", "Retiros:");
    pickups.forEach((order) => lines.push(`- ${displayOrderName(order)}: retira ${order.pickupPerson || "sin cargar"} · ${plainPaymentLine(order)}`));
  }
  if (returns.length) {
    lines.push("", "Devoluciones:");
    returns.forEach((order) => lines.push(`- ${displayOrderName(order)}: ${order.word} (${slotLabels[order.returnSlot]})`));
  }
  if (lines.length === 1) lines.push("", "Sin movimientos cargados.");
  return lines.join("\n");
}

function renderAgenda() {
  const filter = els.statusFilter.value;
  const orders = state.orders.filter((order) => filter === "all" || order.status === filter).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const dates = [...new Set(orders.filter((order) => filter !== "completed" && order.eventDate >= todayValue()).map((order) => order.eventDate))];
  if (!selectedAgendaDate && dates.length) selectedAgendaDate = dates[0];
  if (selectedAgendaDate && !orders.some((order) => order.eventDate === selectedAgendaDate)) selectedAgendaDate = "";
  els.upcomingDays.innerHTML = dates.length ? dates.map((date) => `<button class="day-button ${date === selectedAgendaDate ? "is-active" : ""}" type="button" data-date="${date}"><strong>${shortWeekday(date)}</strong><span>${orders.filter((order) => order.eventDate === date).length} evento(s)</span></button>`).join("") : `<p class="empty-state">No hay eventos próximos.</p>`;
  els.upcomingDays.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAgendaDate = button.dataset.date;
      els.reportDate.value = selectedAgendaDate;
      setReportView("events");
      renderAgenda();
    });
  });
  const visible = selectedAgendaDate ? orders.filter((order) => order.eventDate === selectedAgendaDate) : orders;
  els.ordersList.innerHTML = visible.length ? `${selectedAgendaDate ? `<div class="agenda-day-detail"><div class="summary-title"><strong>${longDate(selectedAgendaDate)}</strong><span>${visible.length} evento(s)</span></div>${lettersTable(totalLetters(visible))}</div>` : ""}${visible.map(orderCard).join("")}` : `<p class="empty-state">No hay pedidos para este filtro.</p>`;
  els.ordersList.querySelectorAll("[data-done]").forEach((button) => button.addEventListener("click", () => updateStatus(button.dataset.done, "completed")));
  els.ordersList.querySelectorAll("[data-active]").forEach((button) => button.addEventListener("click", () => updateStatus(button.dataset.active, "active")));
  els.ordersList.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.delete)));
}

function orderCard(order) {
  const active = order.status === "active";
  return `<article class="order-card"><div class="order-top"><div><strong>${escapeHtml(displayOrderName(order))}</strong><p class="compact-word">${escapeHtml(order.word)}</p><p>${lettersText(order.letters)}</p><p>Retira: ${escapeHtml(order.pickupPerson || "sin cargar")}</p><p>${paymentLine(order)}</p></div><div class="order-actions">${active ? `<button type="button" data-done="${order.id}">Finalizar</button>` : `<button type="button" data-active="${order.id}">Activar</button>`}<button type="button" data-delete="${order.id}">Borrar</button></div></div><p>Evento ${shortDate(order.eventDate)}. Retira ${shortDate(order.pickupDate)} ${slotLabels[order.pickupSlot]}, devuelve ${shortDate(order.returnDate)} ${slotLabels[order.returnSlot]}.</p>${order.note ? `<p>${escapeHtml(order.note)}</p>` : ""}<div class="tag-row"><span class="tag event">${active ? "Activo" : "Finalizado"}</span><span class="tag">${paymentStatus(order)}</span></div></article>`;
}

function updateStatus(id, status) {
  state.orders = state.orders.map((order) => (order.id === id ? { ...order, status } : order));
  persist();
  renderAll();
}

function deleteOrder(id) {
  state.orders = state.orders.filter((order) => order.id !== id);
  persist();
  renderAll();
}

function clearForm() {
  els.orderLineInput.value = "";
  els.pickupPerson.value = "";
  els.totalAmount.value = "";
  els.depositAmount.value = "";
  els.orderNote.value = "";
  textParts = [];
  draftLetters = {};
  renderText();
  renderPaymentPreview();
  renderAvailability();
}

async function copyMessage() {
  await navigator.clipboard.writeText(els.messageDraft.value);
  els.copyMessageButton.textContent = "Copiado";
  setTimeout(() => (els.copyMessageButton.textContent = "Copiar"), 1200);
}

function countLetters(text) {
  return [...text].filter(Boolean).reduce((totals, char) => {
    totals[char] = (totals[char] || 0) + 1;
    return totals;
  }, {});
}

function normalizeText(text) {
  return text.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
}

function estimatePrice(letters, settings = state.settings) {
  const quantity = Object.values(letters).reduce((total, amount) => total + amount, 0);
  return quantity * (settings?.letterUnitPrice || 0);
}

function inferLegacyUnitPrice(inventory) {
  const prices = Object.values(inventory || {})
    .map((item) => (typeof item === "object" ? Number(item.price) : 0))
    .filter(Boolean);
  return prices.length ? Math.max(...prices) : 0;
}

function lettersText(letters) {
  return Object.entries(letters).sort(([a], [b]) => a.localeCompare(b)).map(([letter, quantity]) => `${letter}x${quantity}`).join(", ");
}

function totalLetters(orders) {
  return orders.reduce((totals, order) => {
    Object.entries(order.letters).forEach(([letter, quantity]) => (totals[letter] = (totals[letter] || 0) + quantity));
    return totals;
  }, {});
}

function lettersTable(letters) {
  return `<table class="letters-table"><thead><tr><th>Letra</th><th>Cant</th></tr></thead><tbody>${Object.entries(letters).sort(([a], [b]) => a.localeCompare(b)).map(([letter, quantity]) => `<tr><td>${escapeHtml(letter)}</td><td>${quantity}</td></tr>`).join("")}</tbody></table>`;
}

function paymentStatus(order) {
  return (order.totalAmount || 0) - (order.depositAmount || 0) <= 0 ? "Pago" : "Falta";
}

function paymentLine(order) {
  return `Total ${formatMoney(order.totalAmount || 0)} · Seña ${formatMoney(order.depositAmount || 0)} · ${plainDue(order)}`;
}

function plainPaymentLine(order) {
  return `total ${formatMoney(order.totalAmount || 0)}, seña ${formatMoney(order.depositAmount || 0)}, ${plainDue(order).toLowerCase()}`;
}

function plainDue(order) {
  const due = Math.max((order.totalAmount || 0) - (order.depositAmount || 0), 0);
  return due ? `Falta ${formatMoney(due)}` : "Pago completo";
}

function isSeedExample(order) {
  return [
    ["Josefina", "AMBAR", "2026-06-05"],
    ["Roberto", "RYA", "2026-06-05"],
    ["Cumple Alma", "ALMA", "2026-06-06"],
  ].some(([client, word, eventDate]) => order.client === client && order.word === word && order.eventDate === eventDate);
}

function displayOrderName(order) {
  return order.decorator || order.client || "Particular";
}

function moneyValue(value) {
  return Math.max(Number(value) || 0, 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
}

function stamp(date, slot) {
  return Math.floor(new Date(`${date}T00:00:00`).getTime() / 86400000) * 3 + slotOrder[slot];
}

function shiftDate(value, amount) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dateInput(date);
}

function todayValue() {
  return dateInput(new Date());
}

function dateInput(date) {
  return date.toISOString().slice(0, 10);
}

function shortDate(date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}

function shortWeekday(date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}

function longDate(date) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
