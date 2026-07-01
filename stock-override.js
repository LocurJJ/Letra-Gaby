(function () {
  const STORAGE_KEY = "letras-gaby-v3";
  const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];
  const slotOrder = { morning: 0, afternoon: 1, night: 2 };

  document.addEventListener(
    "submit",
    (event) => {
      if (event.target?.id !== "orderForm") return;
      const draft = readDraft();
      const validation = validateDraft(draft);
      if (!validation.allowOverride) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const confirmed = window.confirm(`${validation.message}\n\nNo hay stock suficiente para esas letras. Queres guardar igual?`);
      if (!confirmed) {
        showAvailability(`${validation.message} Podés guardar igual si confirmás.`, "bad");
        return;
      }

      const state = loadState();
      state.orders = state.orders || [];
      state.orders.push(buildOrder(draft, validation));
      saveState(state);
      document.querySelector("#clearFormButton")?.click();
      showAvailability("Pedido guardado aunque faltan letras. Revisar stock negativo.", "bad");
      window.dispatchEvent(new Event("storage"));
    },
    true
  );

  function readDraft() {
    const previewText = document.querySelector("#orderPreview strong")?.textContent || "";
    const currentWord = previewText === "Texto" ? "" : previewText;
    const pendingLine = normalizeText(document.querySelector("#orderLineInput")?.value || "");
    const word = `${currentWord}${pendingLine}`;
    const letters = countLetters(word);
    return {
      word,
      letters,
      decorator: document.querySelector("#decoratorSelect")?.value || "Particular",
      eventDate: document.querySelector("#eventDate")?.value || "",
      pickupDate: document.querySelector("#pickupDate")?.value || "",
      pickupSlot: document.querySelector("#pickupSlot")?.value || "morning",
      returnDate: document.querySelector("#returnDate")?.value || "",
      returnSlot: document.querySelector("#returnSlot")?.value || "morning",
      pickupPerson: document.querySelector("#pickupPerson")?.value.trim() || "",
      totalAmount: moneyValue(document.querySelector("#totalAmount")?.value),
      depositAmount: moneyValue(document.querySelector("#depositAmount")?.value),
      note: document.querySelector("#orderNote")?.value.trim() || "",
    };
  }

  function validateDraft(draft) {
    if (!Object.keys(draft.letters).length) return { ok: false };
    if (stamp(draft.pickupDate, draft.pickupSlot) > stamp(draft.returnDate, draft.returnSlot)) return { ok: false };

    const state = loadState();
    const conflicts = Object.entries(draft.letters)
      .map(([letter, requested]) => {
        const overlapping = (state.orders || []).filter((order) => order.status === "active" && rangesOverlap(order, draft));
        const used = overlapping.reduce((total, order) => total + (order.letters?.[letter] || 0), 0);
        const available = (state.inventory?.[letter]?.stock || 0) - used;
        return { letter, requested, available, orders: overlapping.filter((order) => order.letters?.[letter]).map(displayOrderName) };
      })
      .filter((item) => item.requested > item.available);

    if (!conflicts.length) return { ok: true };
    return {
      ok: false,
      allowOverride: true,
      conflicts,
      message: conflicts.map((item) => `${item.letter}: pedís ${item.requested}, hay ${item.available}. Choca con ${item.orders.join(", ")}.`).join(" "),
    };
  }

  function buildOrder(draft, validation) {
    return {
      id: crypto.randomUUID(),
      client: draft.decorator,
      decorator: draft.decorator,
      eventDate: draft.eventDate,
      pickupDate: draft.pickupDate,
      pickupSlot: draft.pickupSlot,
      returnDate: draft.returnDate,
      returnSlot: draft.returnSlot,
      word: draft.word,
      letters: draft.letters,
      pickupPerson: draft.pickupPerson,
      totalAmount: draft.totalAmount,
      depositAmount: draft.depositAmount,
      note: draft.note,
      status: "active",
      stockOverride: true,
      stockConflicts: validation.conflicts,
      pickupConfirmed: false,
      returnConfirmed: false,
      createdAt: new Date().toISOString(),
    };
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
  }

  function rangesOverlap(order, draft) {
    return stamp(order.pickupDate, order.pickupSlot) <= stamp(draft.returnDate, draft.returnSlot) && stamp(order.returnDate, order.returnSlot) >= stamp(draft.pickupDate, draft.pickupSlot);
  }

  function stamp(date, slot) {
    return Math.floor(new Date(`${date}T00:00:00`).getTime() / 86400000) * 3 + slotOrder[slot];
  }

  function normalizeText(text) {
    return text.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
  }

  function countLetters(text) {
    return [...text].filter(Boolean).reduce((totals, char) => {
      totals[char] = (totals[char] || 0) + 1;
      return totals;
    }, {});
  }

  function displayOrderName(order) {
    return order.decorator || order.client || "Particular";
  }

  function moneyValue(value) {
    return Math.max(Number(value) || 0, 0);
  }

  function showAvailability(message, type) {
    const alert = document.querySelector("#availabilityAlert");
    if (!alert) return;
    alert.className = `availability-alert ${type}`;
    alert.textContent = message;
  }
})();
