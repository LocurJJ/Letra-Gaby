const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];

const reportEls = {
  dateFrom: document.querySelector("#dateFrom"),
  dateTo: document.querySelector("#dateTo"),
  dailyDetailPanel: document.querySelector("#dailyDetailPanel"),
  dailyDetailButton: document.querySelector("#dailyDetailButton"),
  exportFinanceButton: document.querySelector("#exportFinanceButton"),
  dailyRevenueBody: document.querySelector("#dailyRevenueBody"),
  dailyRevenueTotal: document.querySelector("#dailyRevenueTotal"),
  topLettersList: document.querySelector("#topLettersList"),
  bestEventsDay: document.querySelector("#bestEventsDay"),
  bestRevenueDay: document.querySelector("#bestRevenueDay"),
};

if (reportEls.dailyDetailPanel && reportEls.dailyDetailButton?.dataset.financeDetailBound !== "true") {
  reportEls.dailyDetailButton.addEventListener("click", () => reportEls.dailyDetailPanel.classList.toggle("is-open"));
  reportEls.exportFinanceButton.addEventListener("click", exportFinanceReport);
  reportEls.dateFrom.addEventListener("change", renderFinanceReport);
  reportEls.dateTo.addEventListener("change", renderFinanceReport);
  window.addEventListener("storage", renderFinanceReport);
  window.addEventListener("focus", renderFinanceReport);
  renderFinanceReport();
}

function renderFinanceReport() {
  const orders = filteredOrders();
  const daily = dailyStats(orders);
  const rows = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
  const totalCollected = rows.reduce((total, [, item]) => total + item.collected, 0);
  const bestEvents = rows.reduce((best, [date, item]) => (!best || item.count > best.count ? { date, ...item } : best), null);
  const bestRevenue = rows.reduce((best, [date, item]) => (!best || item.collected > best.collected ? { date, ...item } : best), null);

  reportEls.dailyRevenueTotal.textContent = `Total ${formatMoney(totalCollected)}`;
  reportEls.dailyRevenueBody.innerHTML = rows.length
    ? rows.map(([date, item]) => `<tr><td>${shortDate(date)}</td><td>${item.count}</td><td>${formatMoney(item.collected)}</td><td>${formatMoney(item.total)}</td><td>${formatMoney(item.pending)}</td></tr>`).join("")
    : `<tr><td colspan="5">No hay movimientos en este rango.</td></tr>`;
  reportEls.bestEventsDay.textContent = bestEvents ? `${shortDate(bestEvents.date)} · ${bestEvents.count} evento(s)` : "---";
  reportEls.bestRevenueDay.textContent = bestRevenue ? `${shortDate(bestRevenue.date)} · ${formatMoney(bestRevenue.collected)}` : "---";
  reportEls.topLettersList.innerHTML = topLetters(orders).slice(0, 8).map(([letter, quantity]) => `<span class="tag">${escapeHtml(letter)}x${quantity}</span>`).join("") || `<span class="tag">---</span>`;
}

function exportFinanceReport() {
  const orders = filteredOrders();
  const daily = dailyStats(orders);
  const decorators = topDecorators(orders);
  const letters = topLetters(orders);
  const rows = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b));
  const totalCollected = rows.reduce((total, [, item]) => total + item.collected, 0);
  const totalSold = rows.reduce((total, [, item]) => total + item.total, 0);
  const bestEvents = rows.reduce((best, [date, item]) => (!best || item.count > best.count ? { date, ...item } : best), null);
  const bestRevenue = rows.reduce((best, [date, item]) => (!best || item.collected > best.collected ? { date, ...item } : best), null);
  const lines = [
    "Reporte Letras Gaby",
    `Desde: ${shortDate(reportEls.dateFrom.value)} - Hasta: ${shortDate(reportEls.dateTo.value)}`,
    "",
    "Entrada por dia",
    ...rows.map(([date, item]) => `${shortDate(date)} | eventos ${item.count} | entro ${formatMoney(item.collected)} | vendido ${formatMoney(item.total)} | pendiente ${formatMoney(item.pending)}`),
    "",
    `Total cobrado: ${formatMoney(totalCollected)}`,
    `Total vendido: ${formatMoney(totalSold)}`,
    `Dia con mas eventos: ${bestEvents ? `${shortDate(bestEvents.date)} (${bestEvents.count})` : "---"}`,
    `Mejor dia: ${bestRevenue ? `${shortDate(bestRevenue.date)} (${formatMoney(bestRevenue.collected)})` : "---"}`,
    "",
    "Top decoradoras",
    ...(decorators.length ? decorators.map(([name, item], index) => `${index + 1}. ${name} | eventos ${item.count} | vendido ${formatMoney(item.total)} | cobrado ${formatMoney(item.collected)}`) : ["---"]),
    "",
    "Top letras",
    ...(letters.length ? letters.map(([letter, quantity], index) => `${index + 1}. ${letter}x${quantity}`) : ["---"]),
  ];
  downloadText(`reporte-letras-gaby-${reportEls.dateFrom.value}-${reportEls.dateTo.value}.txt`, lines.join("\n"));
}

function filteredOrders() {
  return readState().orders.filter((order) => order.eventDate >= reportEls.dateFrom.value && order.eventDate <= reportEls.dateTo.value);
}

function readState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return { orders: [] };
  try {
    const state = JSON.parse(stored);
    return { ...state, orders: state.orders || [] };
  } catch {
    return { orders: [] };
  }
}

function dailyStats(orders) {
  return orders.reduce((acc, order) => {
    acc[order.eventDate] ||= { count: 0, total: 0, collected: 0, pending: 0 };
    acc[order.eventDate].count += 1;
    acc[order.eventDate].total += order.totalAmount || 0;
    acc[order.eventDate].collected += order.depositAmount || 0;
    acc[order.eventDate].pending += Math.max((order.totalAmount || 0) - (order.depositAmount || 0), 0);
    return acc;
  }, {});
}

function topDecorators(orders) {
  const stats = orders.reduce((acc, order) => {
    const name = order.decorator || "Particular";
    acc[name] ||= { count: 0, total: 0, collected: 0 };
    acc[name].count += 1;
    acc[name].total += order.totalAmount || 0;
    acc[name].collected += order.depositAmount || 0;
    return acc;
  }, {});
  return Object.entries(stats).sort(([, a], [, b]) => b.total - a.total);
}

function topLetters(orders) {
  const letters = orders.reduce((acc, order) => {
    Object.entries(order.letters || {}).forEach(([letter, quantity]) => {
      acc[letter] = (acc[letter] || 0) + quantity;
    });
    return acc;
  }, {});
  return Object.entries(letters).sort(([, a], [, b]) => b - a);
}

function shortDate(date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T00:00:00`));
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
