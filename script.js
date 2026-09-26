const CATEGORY_ORDER = ["parade", "religious", "professional", "collegiate", "advocacy", "culture", "other"];

function categoryBucket(rawCategory) {
  const c = (rawCategory || "").toLowerCase();
  if (c.includes("parade")) return { key: "parade", label: "Parades & processions" };
  if (c.includes("religious") || c.includes("samagam") || c.includes("spiritual")) return { key: "religious", label: "Religious observance" };
  if (c.includes("professional") || c.includes("tech")) return { key: "professional", label: "Professional & tech" };
  if (c.includes("collegiate") || c.includes("youth")) return { key: "collegiate", label: "Collegiate & youth" };
  if (c.includes("advocacy")) return { key: "advocacy", label: "Advocacy & civil rights" };
  if (c.includes("art") || c.includes("cultur") || c.includes("humanitarian") || c.includes("seva") || c.includes("media") || c.includes("education")) return { key: "culture", label: "Arts, culture & seva" };
  return { key: "other", label: rawCategory || "Other" };
}

function statusBadge(event) {
  const s = (event.status || "").toLowerCase();
  switch (event.status_bucket) {
    case "confirmed":
      if (s.includes("closed")) return { text: "Registration closed", tone: "confirmed" };
      if (s.includes("full")) return { text: "Full", tone: "confirmed" };
      return { text: "Confirmed", tone: "confirmed" };
    case "recurring":
      return { text: "Recurring", tone: "recurring" };
    case "not-found":
      return { text: "No date found yet", tone: "notfound" };
    default:
      if (s.includes("registration open")) return { text: "Registration open", tone: "tbd" };
      return { text: "Date TBA", tone: "tbd" };
  }
}

function isDatedISO(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str || "");
}

function monthShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function dayNum(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.getDate();
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function renderDateBlock(event) {
  if (event.status_bucket === "recurring") {
    return `<div class="date-block" style="background: var(--status-recurring-bg)">
      <span class="tba" style="color: var(--status-recurring-fg)">Recurring</span>
    </div>`;
  }
  if (!isDatedISO(event.start_date)) {
    return `<div class="date-block" style="background: var(--chip-bg)">
      <span class="tba">Date TBA</span>
    </div>`;
  }
  const cat = categoryBucket(event.category);
  const bg = `var(--cat-${cat.key}-bg)`;
  const fg = `var(--cat-${cat.key}-fg)`;
  const month = monthShort(event.start_date);
  const day = dayNum(event.start_date);
  let rangeHtml = "";
  if (isDatedISO(event.end_date) && event.end_date !== event.start_date) {
    rangeHtml = `<span class="range" style="color: ${fg}">–${dayNum(event.end_date)}</span>`;
  }
  return `<div class="date-block" style="background: ${bg}">
    <span class="month" style="color: ${fg}">${month}</span>
    <span class="day">${day}</span>
    ${rangeHtml}
  </div>`;
}

function renderCard(event) {
  const cat = categoryBucket(event.category);
  const badge = statusBadge(event);
  const isTbd = event.status_bucket === "tbd";
  const isInstagramOnly = (event.notes || "").toLowerCase().includes("instagram");
  const isVirtual = (event.format || "").toLowerCase().includes("virtual");

  const tags = [`<span class="tag" style="background: var(--cat-${cat.key}-bg); color: var(--cat-${cat.key}-fg)">${escapeHtml(cat.label)}</span>`];
  if (isVirtual) tags.push(`<span class="tag" style="background: var(--cat-professional-bg); color: var(--cat-professional-fg)">Virtual</span>`);
  if (isInstagramOnly) tags.push(`<span class="tag" style="background: var(--chip-bg); color: var(--ink-soft)">Via Instagram only</span>`);
  tags.push(`<span class="tag" style="background: var(--status-${badge.tone}-bg); color: var(--status-${badge.tone}-fg)">${escapeHtml(badge.text)}</span>`);

  const metaParts = [escapeHtml(event.org)];
  if (event.location) metaParts.push(escapeHtml(event.location));

  const actionHtml = event.source_url
    ? `<a class="event-action" href="${escapeHtml(event.source_url)}" target="_blank" rel="noopener">Details
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"></polyline></svg>
      </a>`
    : `<span class="event-action is-disabled" title="No public source link yet">No link yet</span>`;

  const card = document.createElement("article");
  card.className = "event-card" + (isTbd ? " is-tbd" : "");
  card.dataset.category = cat.key;
  card.dataset.search = `${event.name} ${event.org} ${event.location}`.toLowerCase();

  card.innerHTML = `
    ${renderDateBlock(event)}
    <div class="event-main">
      <div class="tag-row">${tags.join("")}</div>
      <h3 class="event-title">${event.source_url ? `<a href="${escapeHtml(event.source_url)}" target="_blank" rel="noopener">${escapeHtml(event.name)}</a>` : escapeHtml(event.name)}</h3>
      <div class="event-meta">${metaParts.join(" · ")}</div>
    </div>
    ${actionHtml}
  `;
  return card;
}

async function init() {
  const listEl = document.getElementById("event-list");
  const emptyEl = document.getElementById("empty-state");
  const chipRow = document.getElementById("chip-row");
  const searchInput = document.getElementById("site-search");
  const searchForm = document.getElementById("search-form");
  const statEvents = document.getElementById("stat-events");
  const statOrgs = document.getElementById("stat-orgs");
  const lastUpdated = document.getElementById("last-updated");
  document.getElementById("year").textContent = new Date().getFullYear();

  let events = [];
  try {
    const res = await fetch("data/events.json", { cache: "no-store" });
    const data = await res.json();
    events = data.events || [];
    if (data.generated_at) {
      const d = new Date(data.generated_at);
      lastUpdated.textContent = `Calendar last rebuilt ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
  } catch (err) {
    listEl.innerHTML = `<p class="empty-state">Couldn't load events.json — if you're running this locally, serve the folder with a local server (fetch() blocks file:// requests). See the README.</p>`;
    return;
  }

  statEvents.textContent = events.length;
  statOrgs.textContent = new Set(events.map((e) => e.org).filter(Boolean)).size;

  // Build chip list from categories actually present, in a fixed sensible order
  const present = new Set(events.map((e) => categoryBucket(e.category).key));
  const chips = [{ key: "all", label: "All" }];
  CATEGORY_ORDER.forEach((key) => {
    if (present.has(key)) {
      const example = events.find((e) => categoryBucket(e.category).key === key);
      chips.push({ key, label: categoryBucket(example.category).label });
    }
  });

  let activeCategory = "all";

  chips.forEach((chip, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = chip.label;
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    btn.addEventListener("click", () => {
      activeCategory = chip.key;
      [...chipRow.children].forEach((c) => c.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      applyFilters();
    });
    chipRow.appendChild(btn);
  });

  const cards = events.map((e) => ({ event: e, el: renderCard(e) }));
  cards.forEach(({ el }) => listEl.appendChild(el));

  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    cards.forEach(({ el }) => {
      const matchesCategory = activeCategory === "all" || el.dataset.category === activeCategory;
      const matchesSearch = !term || el.dataset.search.includes(term);
      const visible = matchesCategory && matchesSearch;
      el.style.display = visible ? "" : "none";
      if (visible) visibleCount++;
    });
    emptyEl.hidden = visibleCount !== 0;
  }

  applyFilters();
  document.getElementById("empty-state") && (document.getElementById("empty-state").hidden = cards.length !== 0);

  searchForm.addEventListener("submit", (e) => { e.preventDefault(); applyFilters(); });
  searchInput.addEventListener("input", applyFilters);

  // Mobile menu
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  menuToggle.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("is-open");
    mobileNav.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
  });
}

init();
