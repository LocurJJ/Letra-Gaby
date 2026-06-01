
    Y: 1,
    "★": 2,
    "✝": 1,
    "♥": 2,
    "*": 2,
    "&": 1,
  },
let draftLetters = {};
let draftTextParts = [];
let reportView = "events";
  eventDate: document.querySelector("#eventDate"),
  orderWord: document.querySelector("#orderWord"),
  orderLineInput: document.querySelector("#orderLineInput"),
  addTextLineButton: document.querySelector("#addTextLineButton"),
  orderPreview: document.querySelector("#orderPreview"),
  pickupDate: document.querySelector("#pickupDate"),
  returnSlot: document.querySelector("#returnSlot"),
  letterSelect: document.querySelector("#letterSelect"),
  letterQuantity: document.querySelector("#letterQuantity"),
  addLetterButton: document.querySelector("#addLetterButton"),
  selectedLetters: document.querySelector("#selectedLetters"),
function bindEvents() {
  els.addLetterButton.addEventListener("click", addDraftLetter);
  els.addTextLineButton.addEventListener("click", addTextLine);
  els.orderLineInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTextLine();
    }
  });
  document.querySelectorAll("[data-special-char]").forEach((button) => {
    button.addEventListener("click", () => addSpecialCharacter(button.dataset.specialChar));
  });
  els.orderForm.addEventListener("submit", saveOrder);
function render() {
  renderLetterOptions();
  renderDraftLetters();

function renderLetterOptions() {
  const letters = Object.keys(state.inventory).sort((a, b) => a.localeCompare(b));
  els.letterSelect.innerHTML = letters
    .map((letter) => `<option value="${escapeHtml(letter)}">${escapeHtml(letter)} (${state.inventory[letter]})</option>`)
    .join("");
function addTextLine() {
  const value = normalizeTextPart(els.orderLineInput.value);
  if (!value) return;

  draftTextParts.push(value);
  els.orderLineInput.value = "";
  syncDraftFromText();
}

function addDraftLetter() {
  const letter = els.letterSelect.value;
  const quantity = Math.max(1, Number(els.letterQuantity.value) || 1);
  if (!letter) return;
function addSpecialCharacter(character) {
  draftTextParts.push(character);
  syncDraftFromText();
}

  draftLetters[letter] = (draftLetters[letter] || 0) + quantity;
  els.letterQuantity.value = 1;
function removeTextPart(index) {
  draftTextParts.splice(index, 1);
  syncDraftFromText();
}

function syncDraftFromText() {
  draftLetters = countLetters(getDraftWord());
  renderDraftLetters();
function renderDraftLetters() {
  const word = getDraftWord();
  const entries = Object.entries(draftLetters).sort(([a], [b]) => a.localeCompare(b));
  els.orderPreview.innerHTML = word
    ? `
      <strong>${escapeHtml(word)}</strong>
      <p>${lettersToText(draftLetters)}</p>
      <div class="text-parts">
        ${draftTextParts
          .map(
            (part, index) => `
              <span>
                ${escapeHtml(part)}
                <button type="button" data-remove-part="${index}" title="Quitar ${escapeHtml(part)}">x</button>
              </span>
            `,
          )
          .join("")}
      </div>
    `
    : `
      <strong>Texto</strong>
      <p>Escribí el texto para armar la reserva.</p>
    `;

  els.selectedLetters.innerHTML = entries

  els.orderPreview.querySelectorAll("[data-remove-part]").forEach((button) => {
    button.addEventListener("click", () => removeTextPart(Number(button.dataset.removePart)));
  });

  els.selectedLetters.querySelectorAll("[data-remove-letter]").forEach((button) => {
    button.addEventListener("click", () => {
      delete draftLetters[button.dataset.removeLetter];
      renderDraftLetters();
      renderAvailability();
      removeLetterFromDraft(button.dataset.removeLetter);
    });
  event.preventDefault();
  if (els.orderLineInput.value.trim()) addTextLine();

    letters: { ...draftLetters },
    word: els.orderWord.value.trim().toUpperCase(),
    word: getDraftWord(),
    note: els.orderNote.value.trim(),
  els.clientName.value = "";
  els.orderWord.value = "";
  els.orderLineInput.value = "";
  els.orderNote.value = "";
  draftLetters = {};
  draftTextParts = [];
  renderDraftLetters();
  draftLetters = {};
  draftTextParts = [];
  selectedAgendaDate = "";

function getDraftWord() {
  return draftTextParts.join("");
}

function normalizeTextPart(value) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function countLetters(text) {
  return [...text].reduce((totals, character) => {
    if (!character.trim()) return totals;
    totals[character] = (totals[character] || 0) + 1;
    return totals;
  }, {});
}

function removeLetterFromDraft(letter) {
  const index = draftTextParts.findIndex((part) => [...part].includes(letter));
  if (index === -1) return;

  const characters = [...draftTextParts[index]];
  const characterIndex = characters.indexOf(letter);
  characters.splice(characterIndex, 1);

  if (characters.length) {
    draftTextParts[index] = characters.join("");
  } else {
    draftTextParts.splice(index, 1);
  }

  syncDraftFromText();
}

function lettersToText(letters) {
        <span class="letter-pill">
          ${escapeHtml(letter)} x${quantity}
          ${escapeHtml(letter)}x${quantity}
          <button type="button" data-remove-letter="${escapeHtml(letter)}" title="Quitar ${escapeHtml(letter)}">x</button>
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, quantity]) => `${escapeHtml(letter)} x${quantity}`)
    .map(([letter, quantity]) => `${escapeHtml(letter)}x${quantity}`)
    .join(", ");
    return {
      inventory: parsed.inventory || structuredClone(demoState.inventory),
      inventory: { ...structuredClone(demoState.inventory), ...(parsed.inventory || {}) },
      orders: parsed.orders || [],
