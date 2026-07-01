(function () {
  const THEME_ID = "letras-gaby-lila-theme";
  const CSS = `
    :root{--mp-yellow:#e8c6ff;--mp-blue:#7d4ab8;--mp-soft-blue:#f3e7fb;--teal:#8a55bd;--amber:#c9a24d;--sky:#9c78c8;--coral:#d86e89}
    body{background:#faf5ff}
    .eyebrow,.app-header .eyebrow{color:#6e3b9f}
    input:focus,select:focus,textarea:focus{border-color:#8a55bd;box-shadow:0 0 0 3px rgba(138,85,189,.16)}
    .metric-track,.letters-table th{background:#efe5f5}
    .availability-alert.good,.payment-preview.paid,.metric-card:hover,.metric-card.is-active,.metric-card:focus-visible,.day-button:hover,.day-button.is-active,.tag,.decorator-totals span{background:#f3e7fb;color:#5b2d86}
    .availability-alert.bad,.order-actions button[data-delete]{background:#fff0f4}
    .pickup-field input,.pickup-field select{border-color:#eac7d3;background:#fff0f4}
    .return-field input,.return-field select{border-color:#d8c6ef;background:#f4eaff}
    @media(max-width:720px){
      body{background:#faf5ff}
      .app-header{background:#e8c6ff;box-shadow:0 16px 32px rgba(86,47,112,.16)}
      .ghost-link,.date-chip{color:#2e2435;box-shadow:0 6px 18px rgba(86,47,112,.14)}
      .panel,.word-preview,.day-summary,.agenda-day-detail,.report-item,.order-card,.decorator-card,.finance-insights article{box-shadow:0 10px 28px rgba(86,47,112,.1)}
      .metric-card{background:#f3e7fb}
      .metric-card:nth-child(2){background:#fff3d9}
      .metric-card:nth-child(3){background:#f4eaff}
      .metric-card:hover,.metric-card.is-active,.metric-card:focus-visible{background:#ead8f8;box-shadow:inset 0 0 0 2px rgba(125,74,184,.26)}
      .metric-card span{color:#2d1e38}
      input,select,textarea{background:#fffbff}
      .primary-button,.bottom-nav a.is-active{background:#7d4ab8}
      .order-actions button,.action-report .order-actions button{background:#f3e7fb;color:#7d4ab8}
      .day-button{box-shadow:0 10px 22px rgba(86,47,112,.1)}
      .bottom-nav{border-color:rgba(231,216,236,.9);box-shadow:0 18px 36px rgba(86,47,112,.2)}
      .bottom-nav a{color:#74677d}
    }`;

  function applyTheme() {
    let style = document.querySelector(`#${THEME_ID}`);
    if (!style) {
      style = document.createElement("style");
      style.id = THEME_ID;
      document.head.appendChild(style);
    }
    style.textContent = CSS;
  }

  applyTheme();
  window.addEventListener("load", applyTheme);
})();
