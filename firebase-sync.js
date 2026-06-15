import { loadRemoteState, saveRemoteState, subscribeRemoteState } from "./firebase-store.js";

const STORAGE_KEY = "letras-gaby-v3";
const LEGACY_KEYS = ["letras-gaby-v2", "letras-gaby-v1"];

let lastSaved = "";
let applyingRemote = false;

startSync();

async function startSync() {
  const localState = readLocalState();
  lastSaved = localState ? JSON.stringify(localState) : "";
  window.setInterval(syncLocalChanges, 1200);

  try {
    const remoteState = await loadRemoteState();
    if (remoteState) {
      applyRemoteState(remoteState);
    } else if (localState) {
      await saveRemoteState(localState);
    }

    subscribeRemoteState((remoteState) => {
      if (applyingRemote) return;
      applyRemoteState(remoteState);
    }, (error) => console.warn("No se pudo leer Firebase.", error));
  } catch (error) {
    console.warn("Firebase no esta disponible. La app sigue usando guardado local.", error);
  }
}

async function syncLocalChanges() {
  const localState = readLocalState();
  if (!localState) return;
  const serialized = JSON.stringify(localState);
  if (serialized === lastSaved) return;
  lastSaved = serialized;
  applyingRemote = true;
  try {
    await saveRemoteState(localState);
  } catch (error) {
    console.warn("No se pudo guardar en Firebase.", error);
  } finally {
    applyingRemote = false;
  }
}

function applyRemoteState(remoteState) {
  const serialized = JSON.stringify(remoteState);
  if (!serialized || serialized === lastSaved) return;
  lastSaved = serialized;
  localStorage.setItem(STORAGE_KEY, serialized);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: serialized }));
}

function readLocalState() {
  const stored = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
