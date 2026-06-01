const STORAGE_KEY = "letras-gaby-v2";
const slotLabels = { morning: "mañana", afternoon: "tarde", night: "noche" };
const slotOrder = { morning: 0, afternoon: 1, night: 2 };

const demoState = {
  inventory: { A: 5, B: 3, C: 2, G: 2, I: 4, L: 4, M: 3, O: 5, R: 3, S: 3, Y: 1, "★": 2, "✝": 1, "♥": 2, "*": 2, "&": 1 },
  orders: [
    makeDemoOrder("Josefina", "2026-06-05", "2026-06-04", "afternoon", "2026-06-06", "morning", "AMBAR", "Pedido AMBAR."),
    makeDemoOrder("Roberto", "2026-06-05", "2026-06-05", "morning", "2026-06-06", "afternoon", "RYA", "Pedido RYA."),
    makeDemoOrder("Cumple Alma", "2026-06-06", "2026-06-06", "night", "2026-06-07", "afternoon", "ALMA", "Sale sábado a la noche."),
  ],
};

let state = loadState();
let textParts = [];
let draftLetters = {};
let reportView = "events";
let selectedAgendaDate = "";

const els = {
  todayLabel: document.querySelector("#todayLabel"),
  orderForm: document.querySelector("#orderForm"),
  clientName: document.querySelector("#clientName"),
  eventDate: document.querySelector("#eventDate"),
  orderLineInput: document.querySelector("#orderLineInput"),
  addTextLineButton: document.querySelector("#addTextLineButton"),
  orderPreview: document.querySelector("#orderPreview"),
  selectedLetters: document.querySelector("#selectedLetters"),
  pickupDate: document.querySelector("#pickupDate"),
  pickupSlot: document.querySelector("#pickupSlot"),
  returnDate: document.querySelector("#returnDate"),
  returnSlot: document.querySelector("#returnSlot"),
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
  inventoryForm: document.querySelector("#inventoryForm"),
  inventoryLetter: document.querySelector("#inventoryLetter"),
  inventoryQuantity: document.querySelector("#inventoryQuantity"),
  inventoryGrid: document.querySelector("#inventoryGrid"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
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
  els.orderForm.addEventListener("submit", saveOrder);
  els.inventoryForm.addEventListener("submit", saveInventory);
  els.reportDate.addEventListener("change", () => {
    selectedAgendaDate = els.reportDate.value;
    renderReport();
    renderAgenda();
  });
  els.statusFilter.addEventListener("change", renderAgenda);
  els.clearFormButton.addEventListener("click", clearForm);
  els.resetDemoButton.addEventListener("click", resetDemo);
  els.copyMessageButton.addEventListener("click", copyMessage);
}

function makeDemoOrder(client, eventDate, pickupDate, pickupSlot, returnDate, returnSlot, word, note) {
  return {
    id: crypto.randomUUID(),
    client,
    eventDate,
    pickupDate,
    pickupSlot,
    returnDate,
    returnSlot,
    word,
    letters: countLetters(word),
    note,
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(demoState);
  try {
    const parsed = JSON.parse(stored);
    return {
      inventory: { ...structuredClone(demoState.inventory), ...(parsed.inventory || {}) },
      orders: parsed.orders || [],
    };
  } catch {
    return structuredClone(demoState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderText();
  renderAvailability();
  renderInventory();
  renderReport();
  renderAgenda();
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
  renderText();
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
    client: els.clientName.value.trim(),
    eventDate: els.eventDate.value,
    pickupDate: els.pickupDate.value,
    pickupSlot: els.pickupSlot.value,
    returnDate: els.returnDate.value,
    returnSlot: els.returnSlot.value,
    word: textParts.join(""),
    letters: { ...draftLetters },
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
      const available = (state.inventory[letter] || 0) - used;
      return { letter, requested, available, orders: overlapping.filter((order) => order.letters[letter]).map((order) => order.client) };
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

function showAvailability(message, type) {
  els.availabilityAlert.className = `availability-alert ${type}`;
  els.availabilityAlert.textContent = message;
}

function saveInventory(event) {
  event.preventDefault();
  const letter = els.inventoryLetter.value.trim().toUpperCase();
  if (!letter) return;
  state.inventory[letter] = Math.max(0, Number(els.inventoryQuantity.value) || 0);
  persist();
  els.inventoryForm.reset();
  els.inventoryQuantity.value = 1;
  renderAll();
}

function renderInventory() {
  els.inventoryGrid.innerHTML = Object.entries(state.inventory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, quantity]) => `<span class="stock-tile">${escapeHtml(letter)} <small>${quantity}</small><button type="button" data-stock="${escapeHtml(letter)}">x</button></span>`)
    .join("");
  els.inventoryGrid.querySelectorAll("[data-stock]").forEach((button) => {
    button.addEventListener("click", () => {
      delete state.inventory[button.dataset.stock];
      persist();
      renderAll();
    });
  });
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
  return `<article class="report-item"><strong>${escapeHtml(order.client)}</strong><p class="compact-word">${escapeHtml(order.word)}</p><p>${lettersText(order.letters)}</p></article>`;
}

function buildMessage(date, events, pickups, returns) {
  const lines = [`Agenda ${longDate(date)}`];
  if (events.length) {
    lines.push("", "Eventos:");
    events.forEach((order) => lines.push(`- ${order.client}: ${order.word} (${lettersText(order.letters)})`));
    lines.push("", `Letras ${shortWeekday(date)}:`);
    Object.entries(totalLetters(events)).sort(([a], [b]) => a.localeCompare(b)).forEach(([letter, quantity]) => lines.push(`- ${letter}: ${quantity}`));
  }
  if (pickups.length) {
    lines.push("", "Retiros:");
    pickups.forEach((order) => lines.push(`- ${order.client}: ${order.word} (${slotLabels[order.pickupSlot]})`));
  }
  if (returns.length) {
    lines.push("", "Devoluciones:");
    returns.forEach((order) => lines.push(`- ${order.client}: ${order.word} (${slotLabels[order.returnSlot]})`));
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
  return `<article class="order-card"><div class="order-top"><div><strong>${escapeHtml(order.client)}</strong><p class="compact-word">${escapeHtml(order.word)}</p><p>${lettersText(order.letters)}</p></div><div class="order-actions">${active ? `<button type="button" data-done="${order.id}">Finalizar</button>` : `<button type="button" data-active="${order.id}">Activar</button>`}<button type="button" data-delete="${order.id}">Borrar</button></div></div><p>Evento ${shortDate(order.eventDate)}. Retira ${shortDate(order.pickupDate)} ${slotLabels[order.pickupSlot]}, devuelve ${shortDate(order.returnDate)} ${slotLabels[order.returnSlot]}.</p>${order.note ? `<p>${escapeHtml(order.note)}</p>` : ""}<div class="tag-row"><span class="tag event">${active ? "Activo" : "Finalizado"}</span></div></article>`;
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
  els.clientName.value = "";
  els.orderLineInput.value = "";
  els.orderNote.value = "";
  textParts = [];
  draftLetters = {};
  renderText();
  renderAvailability();
}

function resetDemo() {
  state = structuredClone(demoState);
  textParts = [];
  draftLetters = {};
  selectedAgendaDate = "";
  persist();
  renderAll();
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