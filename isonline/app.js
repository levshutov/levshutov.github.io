const TIMEOUT_MS = 5000;

const checkBtn = document.getElementById("checkBtn");
const serviceList = document.getElementById("serviceList");

const SERVICES = [
  { id: "yandex", name: "Yandex", url: "https://ya.ru/" },
  { id: "google", name: "Google", url: "https://www.google.com/" },
  { id: "telegram", name: "Telegram", url: "https://web.telegram.org/" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/" },
];

function getServiceEls(serviceId) {
  const row = serviceList.querySelector(`[data-service="${serviceId}"]`);
  if (!row) throw new Error(`Missing row for service: ${serviceId}`);
  const pill = row.querySelector(".pill");
  const icon = row.querySelector(".status-icon");
  return { pill, icon };
}

const ICONS = {
  idle: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
  checking: `<svg class="icon spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.94 7.94 0 0 0 20 12c0-4.42-3.58-8-8-8z"/></svg>`,
  ok: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/></svg>`,
  offline: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
  timeout: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.07 1H8.93v2h6.14V1zM11 14h2V8h-2v6zm1-12C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`,
  bad: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
};

function setRowStatus(serviceId, kind, iconKey, ariaLabel) {
  const { pill, icon } = getServiceEls(serviceId);
  pill.classList.remove("ok", "warn", "bad");
  if (kind) {
    pill.classList.add(kind);
  }
  pill.setAttribute("aria-label", ariaLabel);
  pill.setAttribute("title", ariaLabel);
  icon.innerHTML = ICONS[iconKey] ?? ICONS.idle;
}

function setAllIdle() {
  for (const s of SERVICES) setRowStatus(s.id, "", "idle", "Idle");
}

async function fetchWithTimeout(url, { timeoutMs }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // no-cors is intentional: most of these sites don't send CORS headers.
    // We only care whether the request can be made at all (reachable vs blocked).
    const res = await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    return res; // In no-cors, this will usually be an "opaque" response.
  } finally {
    clearTimeout(t);
  }
}

async function checkOne(service) {
  try {
    await fetchWithTimeout(service.url, { timeoutMs: TIMEOUT_MS });
    setRowStatus(service.id, "ok", "ok", "Available");
  } catch (err) {
    if (err && err.name === "AbortError") {
      setRowStatus(service.id, "warn", "timeout", "Timed out");
    } else {
      setRowStatus(service.id, "bad", "bad", "Blocked / Unreachable");
    }
  }
}

async function checkAll() {
  checkBtn.disabled = true;

  if (navigator.onLine === false) {
    for (const s of SERVICES) setRowStatus(s.id, "bad", "offline", "Offline");
    checkBtn.disabled = false;
    return;
  }

  try {
    for (const s of SERVICES) setRowStatus(s.id, "warn", "checking", "Checking");
    await Promise.allSettled(SERVICES.map((s) => checkOne(s)));
  } finally {
    checkBtn.disabled = false;
  }
}

checkBtn.addEventListener("click", checkAll);
setAllIdle();

// Register service worker for offline app shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    } catch {
      // If SW fails, app still works (just not offline installable).
    }
  });
}

