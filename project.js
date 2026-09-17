const projectPlaceholders = {
  urban: '<span class="building-line line-a"></span><span class="building-line line-b"></span><strong>URBAN<br>CREST</strong><small>REAL ESTATE</small><span class="placeholder-flag">Artwork preview</span>',
  zyro: '<span class="zyro-label">STREET / FORM / CULTURE</span><strong>ZYRO<br><i>WEAR</i></strong><span class="zyro-stamp">ZW<br><small>2026</small></span><span class="placeholder-flag dark">Artwork preview</span>',
  iron: '<span class="pulse-line"></span><span class="iron-kicker">TRAIN WITH PURPOSE</span><strong>IRON<span>PULSE</span></strong><small>STRENGTH · ENDURANCE · CONTROL</small><span class="placeholder-flag">Artwork preview</span>',
  social: '<div class="social-tile tile-one"><small>NEW DROP</small><strong>MAKE<br>NOISE.</strong></div><div class="social-tile tile-two"><span>01</span><strong>YOUR<br>STORY</strong></div><div class="social-tile tile-three"><small>BUILT TO</small><strong>MOVE</strong></div><span class="placeholder-flag dark">Artwork slot</span>',
  thumbnail: '<div class="thumb-frame"><span>01</span><strong>THE<br>BIG IDEA</strong><i></i></div><div class="thumb-frame secondary"><span>02</span><strong>WATCH<br>THIS</strong><i></i></div><span class="placeholder-flag">Artwork slot</span>',
  listing: '<div class="product-bottle"><span>BRAND</span><strong>01</strong><small>PRODUCT</small></div><div class="feature-copy"><span>KEY BENEFIT</span><strong>Clear value.<br>Quickly understood.</strong><small>Feature highlights · Visual hierarchy · Product focus</small></div><span class="placeholder-flag dark">Product placeholder</span>',
  aplus: '<div class="aplus-copy"><small>BOTANICAL CARE</small><strong>NOURISH<br>FROM ROOT<br>TO TIP.</strong><span>Amazon A+ content system</span></div><div class="oil-bottle"><span>HAIR<br>OIL</span><i></i></div><span class="leaf leaf-one"></span><span class="leaf leaf-two"></span><span class="placeholder-flag">Artwork slot</span>',
  print: '<div class="print-card card-one"><strong>ZM</strong><small>DESIGN STUDIO</small></div><div class="print-card card-two"><small>VISUAL<br>SYSTEMS</small><strong>01</strong></div><div class="print-card card-three"><span></span><small>PRINT WITH<br>PURPOSE.</small></div><span class="placeholder-flag dark">Artwork slot</span>'
};

const projectEscape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const projectId = new URLSearchParams(location.search).get("id");
const editorPreview = new URLSearchParams(location.search).has("editor-preview");

function projectText(selector, value, path) {
  document.querySelectorAll(selector).forEach((node) => { node.textContent = value || ""; if (path) node.dataset.editPath = path; });
}

function projectSiteStyles(site) {
  const root = document.documentElement.style;
  root.setProperty("--paper", site.paperColor); root.setProperty("--paper-soft", site.softPaperColor || "#e8e5dc"); root.setProperty("--ink", site.darkColor);
  root.setProperty("--acid", site.primaryColor); root.setProperty("--orange", site.accentColor); root.setProperty("--blue", site.secondaryColor || "#5276ff");
  root.setProperty("--body-font", site.fontFamily || "Inter, sans-serif"); root.setProperty("--accent-font", site.accentFontFamily || "Georgia, serif");
  document.documentElement.style.fontSize = `${Number(site.baseFontSize) || 16}px`;
}

function renderProjectCover(project, index) {
  const root = document.querySelector("[data-project-cover]");
  if (project.image) {
    root.innerHTML = `<img class="case-cover-image" src="${projectEscape(project.image)}" alt="${projectEscape(project.coverAlt || `${project.title} project cover`)}" decoding="async" fetchpriority="high" data-editor-image-path="projects.${index}.image">`;
    return;
  }
  const style = projectPlaceholders[project.visualStyle] ? project.visualStyle : "urban";
  root.innerHTML = `<div class="project-visual visual-${style}" data-editor-project-index="${index}">${projectPlaceholders[style]}</div>`;
}

function renderGallery(project, index) {
  const gallery = document.querySelector("[data-project-gallery]");
  const items = Array.isArray(project.gallery) ? project.gallery : [];
  gallery.innerHTML = items.length ? items.map((item, galleryIndex) => `<figure class="gallery-item" data-editor-gallery-index="${galleryIndex}" data-editor-project-index="${index}"><img src="${projectEscape(item.src || item.image)}" alt="${projectEscape(item.alt || `${project.title} gallery image ${galleryIndex + 1}`)}" loading="lazy" decoding="async"><figcaption data-edit-path="projects.${index}.gallery.${galleryIndex}.caption">${projectEscape(item.caption || "")}</figcaption></figure>`).join("") : `<div class="gallery-empty">${editorPreview ? "Use the editor panel to add project images." : "Project gallery is being prepared."}</div>`;
}

function renderPalette(colors = []) {
  const section = document.querySelector("[data-project-palette-section]");
  const palette = document.querySelector("[data-project-palette]");
  section.hidden = !colors.length;
  palette.innerHTML = colors.map((item) => { const value = typeof item === "string" ? item : item.value; const name = typeof item === "string" ? item : (item.name || item.value); return `<div class="color-swatch"><span style="background:${projectEscape(value)}"></span><small>${projectEscape(name)}</small></div>`; }).join("");
}

function applyProjectContent(data) {
  const index = data.projects.findIndex((project) => project.id === projectId);
  const project = data.projects[index];
  if (!project) { document.querySelector("[data-project-root]").hidden = true; document.querySelector("[data-project-error]").hidden = false; return; }
  document.body.dataset.projectIndex = index;
  projectSiteStyles(data.site);
  projectText("[data-site-name]", data.site.name); projectText("[data-monogram]", data.site.monogram); projectText("[data-location]", data.contact.location || data.site.location);
  const path = `projects.${index}`;
  projectText("[data-project-category]", project.categoryLabel, `${path}.categoryLabel`);
  projectText("[data-project-title]", project.title, `${path}.title`);
  projectText("[data-project-summary]", project.summary, `${path}.summary`);
  projectText("[data-project-client]", project.client || "Add client", `${path}.client`);
  projectText("[data-project-year]", project.year || "Add year", `${path}.year`);
  projectText("[data-project-scope]", project.scope, `${path}.scope`);
  projectText("[data-project-status]", project.status, `${path}.status`);
  projectText("[data-project-description]", project.fullDescription || project.summary, `${path}.fullDescription`);
  projectText("[data-project-challenge]", project.challenge, `${path}.challenge`);
  projectText("[data-project-approach]", project.approach, `${path}.approach`);
  projectText("[data-project-outcome]", project.outcome, `${path}.outcome`);
  projectText("[data-project-note]", project.note, `${path}.note`);
  ["challenge", "approach", "outcome"].forEach((key) => document.querySelector(`[data-process="${key}"]`).classList.toggle("is-empty", !project[key] && !editorPreview));
  document.querySelector("[data-project-note-wrap]").hidden = !project.note;
  const tools = Array.isArray(project.tools) ? project.tools : [];
  document.querySelector("[data-project-tools]").innerHTML = tools.length ? tools.map((tool) => `<span class="tool-chip">${projectEscape(tool)}</span>`).join("") : `<span class="tool-chip">${editorPreview ? "Add tools in editor" : "Tools to be added"}</span>`;
  renderProjectCover(project, index); renderGallery(project, index); renderPalette(project.colors || []);
  const next = data.projects[(index + 1) % data.projects.length];
  document.querySelector("[data-next-project]").innerHTML = `<a href="project.html?id=${encodeURIComponent(next.id)}"><span>Next project</span><strong>${projectEscape(next.title)} ↗</strong></a>`;
  document.querySelector("[data-whatsapp-link]").href = data.contact.whatsappUrl || `mailto:${data.contact.email}`;
  projectText("[data-year-now]", new Date().getFullYear());
  const description = project.summary || data.site.metaDescription;
  document.title = `${project.title} — ${data.site.name}`;
  document.querySelector("[data-meta-description]").content = description;
  document.querySelector("[data-og-title]").content = document.title; document.querySelector("[data-og-description]").content = description;
  const canonical = `${location.origin}${location.pathname}?id=${encodeURIComponent(project.id)}`;
  document.querySelector("[data-canonical]").href = canonical; document.querySelector("[data-og-url]").content = canonical;
  Object.entries(data.editorStyles?.elements || {}).forEach(([editPath, styles]) => document.querySelectorAll(`[data-edit-path="${CSS.escape(editPath)}"]`).forEach((node) => Object.assign(node.style, styles)));
}

window.applyProjectContent = applyProjectContent;
fetch("content.json", { cache: "no-store" }).then((response) => response.json()).then(applyProjectContent).catch(() => { document.querySelector("[data-project-root]").hidden = true; document.querySelector("[data-project-error]").hidden = false; });
