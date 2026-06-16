(function () {
  const STORAGE_KEY = "letras-gaby-v3";
  const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];

  function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    try {
      return stored ? JSON.parse(stored) : { orders: [] };
    } catch {
      return { orders: [] };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("storage"));
  }

  function moneyValue(value) {
    return Math.max(Number(String(value).replace(/[^\d.-]/g, "")) || 0, 0);
  }

  function dueAmount(order) {
    return Math.max((order.totalAmount || 0) - (order.depositAmount || 0), 0);
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value || 0);
  }

  function enhancePaymentButtons() {
    const list = document.querySelector("#ordersList");
    if (!list) return;
    const state = loadState();

    list.querySelectorAll(".order-card").forEach((card) => {
      if (card.querySelector("[data-payment-edit]")) return;
      const id =
        card.querySelector("[data-delete]")?.dataset.delete ||
        card.querySelector("[data-active]")?.dataset.active ||
        card.querySelector("[data-done]")?.dataset.done;
      const order = state.orders?.find((item) => item.id === id);
      const actions = card.querySelector(".order-actions");
      if (!order || !actions || dueAmount(order) <= 0) return;

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.dataset.paymentEdit = id;
      editButton.textContent = "Editar pago";

      const completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.dataset.paymentComplete = id;
      completeButton.textContent = "Pago completo";

      const deleteButton = actions.querySelector("[data-delete]");
      actions.insertBefore(editButton, deleteButton);
      actions.insertBefore(completeButton, deleteButton);
    });
  }

  function editPayment(id) {
    const state = loadState();
    const order = state.orders?.find((item) => item.id === id);
    if (!order) return;
    const total = order.totalAmount || 0;
    const answer = window.prompt(`Total ${formatMoney(total)}. Cuanto tiene pago/cobrado en total?`, String(order.depositAmount || 0));
    if (answer === null) return;
    const paid = Math.min(moneyValue(answer), total);
    state.orders = state.orders.map((item) => (item.id === id ? { ...item, depositAmount: paid, paymentEditedAt: new Date().toISOString() } : item));
    saveState(state);
  }

  function completePayment(id) {
    const state = loadState();
    state.orders = (state.orders || []).map((item) => (item.id === id ? { ...item, depositAmount: item.totalAmount || 0, paymentCompletedAt: new Date().toISOString() } : item));
    saveState(state);
  }

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-payment-edit]");
    const completeButton = event.target.closest("[data-payment-complete]");
    if (editButton) editPayment(editButton.dataset.paymentEdit);
    if (completeButton) completePayment(completeButton.dataset.paymentComplete);
  });

  document.addEventListener("DOMContentLoaded", () => {
    enhancePaymentButtons();
    const list = document.querySelector("#ordersList");
    if (list) new MutationObserver(enhancePaymentButtons).observe(list, { childList: true, subtree: true });
  });
})();
