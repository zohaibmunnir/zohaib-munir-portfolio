const categoryLabels = {
  logo: "Branding / Logo Design",
  social: "Social Media Design",
  listing: "Listing Images",
  aplus: "Amazon A+ Content",
  print: "Print Design"
};

const placeholderMarkup = {
  urban: '<span class="building-line line-a"></span><span class="building-line line-b"></span><strong>URBAN<br>CREST</strong><small>REAL ESTATE</small><span class="placeholder-flag">Artwork preview</span>',
  zyro: '<span class="zyro-label">STREET / FORM / CULTURE</span><strong>ZYRO<br><i>WEAR</i></strong><span class="zyro-stamp">ZW<br><small>2026</small></span><span class="placeholder-flag dark">Artwork preview</span>',
  iron: '<span class="pulse-line"></span><span class="iron-kicker">TRAIN WITH PURPOSE</span><strong>IRON<span>PULSE</span></strong><small>STRENGTH · ENDURANCE · CONTROL</small><span class="placeholder-flag">Artwork preview</span>',
  social: '<div class="social-tile tile-one"><small>NEW DROP</small><strong>MAKE<br>NOISE.</strong></div><div class="social-tile tile-two"><span>01</span><strong>YOUR<br>STORY</strong></div><div class="social-tile tile-three"><small>BUILT TO</small><strong>MOVE</strong></div><span class="placeholder-flag dark">Artwork slot</span>',
  thumbnail: '<div class="thumb-frame"><span>01</span><strong>THE<br>BIG IDEA</strong><i></i></div><div class="thumb-frame secondary"><span>02</span><strong>WATCH<br>THIS</strong><i></i></div><span class="placeholder-flag">Artwork slot</span>',
  listing: '<div class="product-bottle"><span>BRAND</span><strong>01</strong><small>PRODUCT</small></div><div class="feature-copy"><span>KEY BENEFIT</span><strong>Clear value.<br>Quickly understood.</strong><small>Feature highlights · Visual hierarchy · Product focus</small></div><span class="placeholder-flag dark">Product placeholder</span>',
  aplus: '<div class="aplus-copy"><small>BOTANICAL CARE</small><strong>NOURISH<br>FROM ROOT<br>TO TIP.</strong><span>Amazon A+ content system</span></div><div class="oil-bottle"><span>HAIR<br>OIL</span><i></i></div><span class="leaf leaf-one"></span><span class="leaf leaf-two"></span><span class="placeholder-flag">Artwork slot</span>',
  print: '<div class="print-card card-one"><strong>ZM</strong><small>DESIGN STUDIO</small></div><div class="print-card card-two"><small>VISUAL<br>SYSTEMS</small><strong>01</strong></div><div class="print-card card-three"><span></span><small>PRINT WITH<br>PURPOSE.</small></div><span class="placeholder-flag dark">Artwork slot</span>'
};

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const withBreaks = (value = "") => escapeHtml(value).replaceAll("\n", "<br>");

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => { node.textContent = value ?? ""; });
}

function setHtml(selector, value) {
  document.querySelectorAll(selector).forEach((node) => { node.innerHTML = withBreaks(value); });
}

function setSectionBackground(selector, imagePath) {
  const section = document.querySelector(selector);
  if (!section) return;
  if (!imagePath) {
    section.style.removeProperty("background-image");
    section.style.removeProperty("background-size");
    section.style.removeProperty("background-position");
    return;
  }
  const safePath = String(imagePath).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  section.style.backgroundImage = `url("${safePath}")`;
  section.style.backgroundSize = "cover";
  section.style.backgroundPosition = "center";
}

function setEditPath(selector, path) {
  document.querySelectorAll(selector).forEach((node) => {
    node.dataset.editPath = path;
  });
}

function applyEditorStyles(editorStyles = {}) {
  Object.entries(editorStyles.elements || {}).forEach(([path, styles]) => {
    document.querySelectorAll(`[data-edit-path="${CSS.escape(path)}"]`).forEach((node) => Object.assign(node.style, styles));
  });
  Object.entries(editorStyles.sections || {}).forEach(([key, styles]) => {
    document.querySelectorAll(`[data-editor-section="${CSS.escape(key)}"]`).forEach((node) => Object.assign(node.style, styles));
  });
}

function applyContent(data) {
  const { site, hero, work, about, services, contact, projects, categories = [] } = data;
  document.title = site.pageTitle;
  document.querySelector("[data-meta-description]")?.setAttribute("content", site.metaDescription);
  document.querySelector("[data-og-title]")?.setAttribute("content", site.pageTitle);
  document.querySelector("[data-og-description]")?.setAttribute("content", site.metaDescription);
  document.documentElement.style.setProperty("--paper", site.paperColor);
  document.documentElement.style.setProperty("--paper-soft", site.softPaperColor || "#e8e5dc");
  document.documentElement.style.setProperty("--ink", site.darkColor);
  document.documentElement.style.setProperty("--acid", site.primaryColor);
  document.documentElement.style.setProperty("--orange", site.accentColor);
  document.documentElement.style.setProperty("--blue", site.secondaryColor || "#5276ff");
  document.documentElement.style.setProperty("--muted", site.mutedColor || "#a7a59e");
  document.documentElement.style.setProperty("--body-font", site.fontFamily || 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  document.documentElement.style.setProperty("--accent-font", site.accentFontFamily || "Georgia, serif");
  document.documentElement.style.fontSize = `${Number(site.baseFontSize) || 16}px`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", site.darkColor);
  setSectionBackground(".hero", site.heroBackgroundImage);
  setSectionBackground(".work-section", site.workBackgroundImage);
  setSectionBackground(".profile-section", site.profileBackgroundImage);

  setText("[data-site-name]", site.name);
  setText("[data-monogram]", site.monogram);
  setText("[data-role]", site.role);
  setText("[data-location]", site.location);
  setText("[data-hero-eyebrow]", hero.eyebrow);
  setText("[data-hero-title]", hero.title);
  setText("[data-hero-highlight]", hero.highlight);
  setText("[data-hero-intro]", hero.intro);
  setText("[data-primary-action]", hero.primaryAction);
  document.querySelector("[data-primary-action]")?.closest("a")?.setAttribute("href", hero.primaryActionUrl || "#contact");
  setText("[data-secondary-action]", hero.secondaryAction || "Explore selected work");
  document.querySelector("[data-secondary-action]")?.closest("a")?.setAttribute("href", hero.secondaryActionUrl || "#work");
  setText("[data-hero-disciplines]", hero.disciplines);
  const monogram = [...site.monogram];
  setText("[data-monogram-first]", monogram[0] || "Z");
  setText("[data-monogram-last]", monogram.slice(1).join("") || "M");

  setText("[data-work-title]", work.title);
  setText("[data-work-note]", work.note);
  setText("[data-about-title]", about.title);
  setText("[data-about-lead]", about.lead);
  setText("[data-about-body]", about.body);

  const serviceList = document.querySelector("[data-service-list]");
  serviceList.innerHTML = services.map((service, index) => `
    <li data-editor-service-index="${index}"><span>${String(index + 1).padStart(2, "0")}</span><div><strong data-edit-path="services.${index}.title">${escapeHtml(service.title)}</strong><small data-edit-path="services.${index}.description">${escapeHtml(service.description)}</small></div></li>
  `).join("");

  setText("[data-contact-eyebrow]", contact.eyebrow);
  setText("[data-contact-title]", contact.title);
  setText("[data-contact-highlight]", contact.highlight);
  setText("[data-contact-note]", contact.note);
  setText("[data-contact-button-label]", contact.buttonLabel);
  setText("[data-contact-phone]", contact.phone);
  setText("[data-contact-email]", contact.email);
  setText("[data-contact-location]", contact.location);
  setText("[data-contact-whatsapp-label]", contact.whatsappLabel || "Message directly ↗");
  setText("[data-contact-linkedin-label]", contact.linkedinLabel || "LinkedIn profile ↗");
  document.querySelector("[data-contact-phone-link]")?.setAttribute("href", contact.phoneUrl || `tel:${String(contact.phone || "").replace(/\s/g, "")}`);
  document.querySelector("[data-contact-whatsapp-link]")?.setAttribute("href", contact.whatsappUrl || "#contact");
  document.querySelector("[data-contact-email-link]")?.setAttribute("href", contact.email ? `mailto:${contact.email}` : "#contact");
  document.querySelector("[data-contact-linkedin-link]")?.setAttribute("href", contact.linkedinUrl || "#contact");
  document.querySelector("[data-contact-location-link]")?.setAttribute("href", contact.locationUrl || "#contact");

  renderFilters(projects, categories);
  renderProjects(projects);
  configureContact(contact);
  applyEditorStyles(data.editorStyles);
  observeReveals();
}

function renderFilters(projects, categories = []) {
  const counts = projects.reduce((result, project) => {
    result[project.category] = (result[project.category] || 0) + 1;
    return result;
  }, {});
  const filterBar = document.querySelector("[data-filter-bar]");
  const categorySummary = document.querySelector("[data-category-summary]");
  filterBar.innerHTML = [
    `<button class="filter-button is-active" type="button" data-filter="all" aria-pressed="true">All <span>${String(projects.length).padStart(2, "0")}</span></button>`,
    ...(categories.length ? categories.map((category, index) => `<button class="filter-button" type="button" data-filter="${escapeHtml(category.id)}" data-editor-category-index="${index}" aria-pressed="false">${escapeHtml(category.label)} <span>${String(counts[category.id] || 0).padStart(2, "0")}</span></button>`) : Object.entries(categoryLabels).map(([key, label]) => `<button class="filter-button" type="button" data-filter="${key}" aria-pressed="false">${label} <span>${String(counts[key] || 0).padStart(2, "0")}</span></button>`))
  ].join("");

  filterBar.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      filterBar.querySelectorAll("[data-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      document.querySelectorAll("[data-category]").forEach((card) => {
        card.hidden = category !== "all" && card.dataset.category !== category;
      });
      const categoryIndex = categories.findIndex((item) => item.id === category);
      const categoryData = categories[categoryIndex];
      if (!categoryData) {
        categorySummary.hidden = true;
        categorySummary.innerHTML = "";
      } else {
        categorySummary.hidden = false;
        categorySummary.innerHTML = `<p data-edit-path="categories.${categoryIndex}.description">${escapeHtml(categoryData.description)}</p><a href="category.html?category=${encodeURIComponent(categoryData.id)}">Open ${escapeHtml(categoryData.label)} category ↗</a>`;
      }
    });
  });
}

function renderProjects(projects) {
  const grid = document.querySelector("[data-project-grid]");
  grid.innerHTML = projects.map((project, projectIndex) => {
    const style = placeholderMarkup[project.visualStyle] ? project.visualStyle : "urban";
    const visual = project.image
      ? `<img class="project-image" data-editor-image-path="projects.${projectIndex}.image" src="${escapeHtml(project.image)}" alt="${escapeHtml(project.coverAlt || `${project.title} project artwork`)}" loading="lazy" decoding="async">`
      : placeholderMarkup[style];
    return `
      <article class="project-card reveal" data-category="${escapeHtml(project.category)}" data-editor-project-index="${projectIndex}">
        <a class="project-open" href="project.html?id=${encodeURIComponent(project.id)}" data-project-id="${escapeHtml(project.id)}" aria-label="Open ${escapeHtml(project.title)} project details">
          <div class="project-visual visual-${style}${project.image ? " has-image" : ""}">${visual}</div>
          <div class="project-meta"><div><p data-edit-path="projects.${projectIndex}.title">${escapeHtml(project.title)}</p><span data-edit-path="projects.${projectIndex}.subtitle">${escapeHtml(project.subtitle)}</span></div><span class="project-arrow">↗</span></div>
        </a>
      </article>`;
  }).join("");
}

function configureContact(contact) {
  const button = document.querySelector("[data-contact-button]");
  const status = document.querySelector(".copy-status");
  button.onclick = null;
  button.removeAttribute("target");
  button.removeAttribute("rel");
  if (contact.whatsappUrl) {
    button.href = contact.whatsappUrl;
    button.target = "_blank";
    button.rel = "noopener";
    return;
  }
  if (contact.email) {
    button.href = `mailto:${contact.email}`;
    return;
  }
  button.href = "#contact";
  button.onclick = async (event) => {
    event.preventDefault();
    const brief = "Hello Zohaib, I’d like to discuss a design project.\n\nProject type:\nBusiness or brand:\nWhat I need designed:\nPreferred timeline:\nBudget range:\nReferences or notes:";
    try {
      await navigator.clipboard.writeText(brief);
      status.textContent = "Project brief copied to clipboard.";
    } catch {
      status.textContent = "Copy unavailable. Please add an email or WhatsApp link in the editor.";
    }
  };
}

function observeReveals() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
    { threshold: 0.08 }
  );
  document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
}

function configureMenu() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }));
}

async function initialize() {
  configureMenu();
  setText("[data-year]", new Date().getFullYear());
  try {
    const response = await fetch("content.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
    applyContent(await response.json());
  } catch (error) {
    console.error(error);
    document.body.classList.add("content-error");
    document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
  }
}

initialize();
