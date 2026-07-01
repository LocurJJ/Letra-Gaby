(function () {
  const STORAGE_KEY = "letras-gaby-v3";
  const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];
  const MOBILE_APP_CSS = `
    :root{--mp-yellow:#ffe600;--mp-blue:#3f6df6;--mp-soft-blue:#eef3ff}
    .bottom-nav{display:none}
    @media(max-width:720px){
      html{scroll-behavior:smooth}
      body{background:#f7f8fb;padding-bottom:86px}
      .app-header{position:relative;align-items:flex-start;min-height:198px;overflow:hidden;border-radius:0 0 28px 28px;background:var(--mp-yellow);padding:22px 16px 78px;box-shadow:0 16px 32px rgba(69,73,83,.14)}
      .app-header:after{content:"";position:absolute;right:-44px;bottom:-62px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.34)}
      .app-header .eyebrow{color:#245142}
      .app-header h1{max-width:230px;font-size:2.3rem;line-height:.96}
      .header-actions{position:absolute;left:16px;right:16px;bottom:18px;display:grid;grid-template-columns:1fr 1fr auto;gap:8px;z-index:1}
      .ghost-link,.date-chip{min-height:42px;border:0;border-radius:999px;background:rgba(255,255,255,.72);box-shadow:0 6px 18px rgba(73,74,85,.12);color:#273044;font-size:.82rem;justify-content:center;padding:8px 10px}
      .date-chip{max-width:118px;overflow:hidden;white-space:nowrap}
      .app-shell,.finance-shell,.decorators-shell{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:480px;margin:-48px auto 0;padding:0 12px 22px}
      .panel,.word-preview,.day-summary,.agenda-day-detail,.report-item,.order-card,.decorator-card,.finance-insights article{border:0;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(31,37,51,.09)}
      .panel{padding:16px}.report-panel{order:1;z-index:2}.planner-panel{order:2}.orders-panel{order:3}
      .panel-heading{flex-direction:row;align-items:center;gap:10px}.panel-heading h2{font-size:1.24rem}.compact-label{min-width:124px}
      .metric-row{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 10px;scroll-snap-type:x mandatory}
      .metric-card{min-width:146px;border:0;border-radius:16px;background:var(--mp-soft-blue);scroll-snap-align:start}
      .metric-card:nth-child(2){background:#fff5cf}.metric-card:nth-child(3){background:#eaf8f4}
      .metric-card:hover,.metric-card.is-active,.metric-card:focus-visible{background:#e7edff;box-shadow:inset 0 0 0 2px rgba(63,109,246,.28)}
      .metric-card span{color:#14213d;font-size:1.55rem}
      .message-box textarea{border-radius:16px}
      .form-grid,.money-grid,.finance-metrics,.finance-detail-grid,.inventory-config-form,.config-row,.date-filter{grid-template-columns:1fr}
      input,select,textarea{min-height:46px;border-radius:13px;background:#f9fafc}
      .primary-button,.ghost-button,.icon-button{border-radius:13px}.primary-button{min-height:48px;background:var(--mp-blue)}
      .action-report{grid-template-columns:1fr}.order-actions{flex-wrap:wrap;width:100%}
      .order-actions button,.action-report .order-actions button{flex:1 1 126px;min-height:40px;border:0;border-radius:12px;background:var(--mp-soft-blue);color:var(--mp-blue)}
      .order-actions button[data-delete]{background:#fff0ed;color:var(--coral)}
      .upcoming-days{display:flex;overflow-x:auto;gap:10px;padding-bottom:6px}
      .day-button{min-width:160px;border:0;border-radius:16px;background:#fff;box-shadow:0 10px 22px rgba(31,37,51,.08)}
      .bottom-nav{position:fixed;right:10px;bottom:10px;left:10px;z-index:20;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:480px;margin:0 auto;border:1px solid rgba(222,216,204,.8);border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 18px 36px rgba(31,37,51,.18);padding:8px;backdrop-filter:blur(10px)}
      .bottom-nav a{display:grid;place-items:center;min-height:44px;border-radius:16px;color:#5f6877;font-size:.72rem;font-weight:900;text-decoration:none}
      .bottom-nav a.is-active{background:var(--mp-blue);color:#fff}
    }`;

  injectMobileStyle();

  function injectMobileStyle() {
    if (document.querySelector("#letras-gaby-mobile-app-style")) return;
    const style = document.createElement("style");
    style.id = "letras-gaby-mobile-app-style";
    style.textContent = MOBILE_APP_CSS;
    document.head.appendChild(style);
  }

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
