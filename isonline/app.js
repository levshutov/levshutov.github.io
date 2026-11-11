const TIMEOUT_MS = 8000;

const checkBtn = document.getElementById("checkBtn");
const serviceList = document.getElementById("serviceList");

const SERVICES = [
  { id: "yandex", name: "Yandex", url: "https://ya.ru/" },
  { id: "google", name: "Google", url: "https://www.google.com/" },
  { id: "telegram", name: "Telegram", url: "https://web.telegram.org/" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/" },
  { id: "github1mb", name: "GitHub 1MB", url: "https://levshutov.github.io/isonline/1mb.bin" },
];

function getServiceEls(serviceId) {
  const row = serviceList.querySelector(`[data-service="${serviceId}"]`);
  if (!row) throw new Error(`Missing row for service: ${serviceId}`);
  const pill = row.querySelector(".pill");
  const icon = row.querySelector(".status-icon");
  return { pill, icon };
}

const ICONS = {
  checking: `<svg class="icon spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.94 7.94 0 0 0 20 12c0-4.42-3.58-8-8-8z"/></svg>`,
  ok: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-4-4 1.41-1.41L11 14.17l5.59-5.59L18 10l-7 7z"/></svg>`,
  bad: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
  unknown: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`,
};

function setRowStatus(serviceId, kind, iconKey, ariaLabel) {
  const { pill, icon } = getServiceEls(serviceId);
  pill.classList.remove("ok", "bad", "unknown");
  if (kind) {
    pill.classList.add(kind);
  }
  pill.setAttribute("aria-label", ariaLabel);
  pill.setAttribute("title", ariaLabel);
  icon.innerHTML = ICONS[iconKey] ?? ICONS.bad;
}

function setAllIdle() {
  for (const s of SERVICES) setRowStatus(s.id, "unknown", "unknown", "Not checked");
}

async function fetchWithTimeout(url, { timeoutMs }) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // no-cors is intentional: most of these sites don't send CORS headers.
    // We only care whether the request can be made at all (reachable vs blocked).
    const res = await fetch(url + "?" + Math.random(), {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });
    await res.blob();
  } finally {
    clearTimeout(t);
  }
}

async function checkOne(service) {
  try {
    await fetchWithTimeout(service.url, { timeoutMs: TIMEOUT_MS });
    setRowStatus(service.id, "ok", "ok", "OK");
  } catch (err) {
    setRowStatus(service.id, "bad", "bad", "NOT OK");
  }
}

async function checkAll() {
  checkBtn.disabled = true;

  if (navigator.onLine === false) {
    for (const s of SERVICES) setRowStatus(s.id, "bad", "bad", "NOT OK");
    checkBtn.disabled = false;
    return;
  }

  try {
    for (const s of SERVICES) setRowStatus(s.id, "", "checking", "Checking");
    await Promise.allSettled(SERVICES.map((s) => checkOne(s)));
  } finally {
    checkBtn.disabled = false;
  }
}

checkBtn.addEventListener("click", checkAll);

// Register service worker for offline app shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: 'none', scope: "./" });
    } catch {
      // If SW fails, app still works (just not offline installable).
    }
  });
}

