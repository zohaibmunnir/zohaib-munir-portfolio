const categoryId = new URLSearchParams(location.search).get("category");
const categoryEditorPreview = new URLSearchParams(location.search).has("editor-preview");
const categoryEscape = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function categoryText(selector, value, path) { document.querySelectorAll(selector).forEach((node) => { node.textContent = value || ""; if (path) node.dataset.editPath = path; }); }
function categoryStyles(site) { const root=document.documentElement.style; root.setProperty("--paper",site.paperColor);root.setProperty("--paper-soft",site.softPaperColor||"#e8e5dc");root.setProperty("--ink",site.darkColor);root.setProperty("--acid",site.primaryColor);root.setProperty("--orange",site.accentColor);root.setProperty("--blue",site.secondaryColor||"#5276ff");root.setProperty("--body-font",site.fontFamily||"Inter, sans-serif");root.setProperty("--accent-font",site.accentFontFamily||"Georgia, serif");document.documentElement.style.fontSize=`${Number(site.baseFontSize)||16}px`; }

function renderCategoryGallery(category, index) {
  const gallery=document.querySelector("[data-category-gallery]"); const items=Array.isArray(category.gallery)?category.gallery:[];
  gallery.innerHTML=items.length?items.map((item,itemIndex)=>`<figure class="gallery-item" data-editor-category-gallery-index="${itemIndex}" data-editor-category-index="${index}"><img src="${categoryEscape(item.src||item.image)}" alt="${categoryEscape(item.alt||`${category.title} gallery image ${itemIndex+1}`)}" loading="lazy" decoding="async"><figcaption data-edit-path="categories.${index}.gallery.${itemIndex}.caption">${categoryEscape(item.caption||"")}</figcaption></figure>`).join(""):`<div class="gallery-empty">${categoryEditorPreview?"Use the editor panel to add category images.":"More selected work will be added here."}</div>`;
}

function applyCategoryContent(data) {
  const index=(data.categories||[]).findIndex((category)=>category.id===categoryId); const category=data.categories?.[index];
  if(!category){document.querySelector("[data-category-root]").hidden=true;document.querySelector("[data-category-error]").hidden=false;return;}
  document.body.dataset.categoryIndex=index; categoryStyles(data.site);
  categoryText("[data-site-name]",data.site.name);categoryText("[data-monogram]",data.site.monogram);categoryText("[data-location]",data.contact.location||data.site.location);categoryText("[data-year-now]",new Date().getFullYear());
  const path=`categories.${index}`;categoryText("[data-category-title]",category.title,`${path}.title`);categoryText("[data-category-description]",category.description,`${path}.description`);categoryText("[data-category-details]",category.details,`${path}.details`);
  const projects=data.projects.filter((project)=>project.category===category.id);
  document.querySelector("[data-category-projects]").innerHTML=projects.map((project)=>{const projectIndex=data.projects.indexOf(project);const visual=project.image?`<img class="project-image" src="${categoryEscape(project.image)}" alt="${categoryEscape(project.coverAlt||project.title)}" loading="lazy" decoding="async">`:`<div class="category-project-placeholder"><span>${categoryEscape(category.label)}</span><strong>${categoryEscape(project.title)}</strong><small>Artwork preview</small></div>`;return `<article class="project-card reveal is-visible" data-editor-project-index="${projectIndex}"><a class="project-open" href="project.html?id=${encodeURIComponent(project.id)}"><div class="project-visual has-image">${visual}</div><div class="project-meta"><div><p data-edit-path="projects.${projectIndex}.title">${categoryEscape(project.title)}</p><span data-edit-path="projects.${projectIndex}.subtitle">${categoryEscape(project.subtitle)}</span></div><span class="project-arrow">↗</span></div></a></article>`;}).join("")||`<p>No projects have been added to this category yet.</p>`;
  renderCategoryGallery(category,index);
  const description=category.description||data.site.metaDescription;document.title=`${category.title} — ${data.site.name}`;document.querySelector("[data-meta-description]").content=description;document.querySelector("[data-og-title]").content=document.title;document.querySelector("[data-og-description]").content=description;const canonical=`${location.origin}${location.pathname}?category=${encodeURIComponent(category.id)}`;document.querySelector("[data-canonical]").href=canonical;document.querySelector("[data-og-url]").content=canonical;
  Object.entries(data.editorStyles?.elements||{}).forEach(([editPath,styles])=>document.querySelectorAll(`[data-edit-path="${CSS.escape(editPath)}"]`).forEach((node)=>Object.assign(node.style,styles)));
}

window.applyCategoryContent=applyCategoryContent;
fetch("content.json",{cache:"no-store"}).then((response)=>response.json()).then(applyCategoryContent).catch(()=>{document.querySelector("[data-category-root]").hidden=true;document.querySelector("[data-category-error]").hidden=false;});
