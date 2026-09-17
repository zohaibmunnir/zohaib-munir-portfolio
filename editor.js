const REPO = "zohaibmunnir/zohaib-munir-portfolio";
const BRANCH = "main";
const API = `https://api.github.com/repos/${REPO}`;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = { token: "", content: null, sha: "", dirty: false, selected: null, history: [], uploads: [] };
const preview = $("[data-preview]");
const panel = $("[data-panel]");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function escapeValue(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function encode64(text) { return btoa(unescape(encodeURIComponent(text))); }
function decode64(text) { return decodeURIComponent(escape(atob(text.replace(/\n/g, "")))); }
function pathParts(path) { return path.split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part); }
function getPath(path) { return pathParts(path).reduce((value, key) => value?.[key], state.content); }
function setPath(path, value) { const keys = pathParts(path); let target = state.content; keys.slice(0, -1).forEach((key) => { target = target[key]; }); target[keys.at(-1)] = value; }
function status(message) { $("[data-status]").textContent = message; }
function toast(message) { const node = $("[data-toast]"); node.textContent = message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2800); }
function snapshot() { state.history.push(clone(state.content)); if (state.history.length > 30) state.history.shift(); $("[data-undo]").disabled = false; }
function markDirty() { state.dirty = true; $("[data-save]").disabled = false; status("Unsaved changes"); }

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${state.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) } });
  if (!response.ok) { let detail = ""; try { detail = (await response.json()).message; } catch {} throw new Error(detail || `GitHub error ${response.status}`); }
  return response.status === 204 ? null : response.json();
}

function migrateContent() {
  state.content.editorStyles ||= { elements: {}, sections: {} };
  state.content.editorStyles.elements ||= {}; state.content.editorStyles.sections ||= {}; state.content.categories ||= [];
  state.content.projects.forEach((project) => Object.assign(project, {
    coverAlt: project.coverAlt || `${project.title} project cover`, fullDescription: project.fullDescription || project.summary,
    client: project.client || "", year: project.year || "", tools: Array.isArray(project.tools) ? project.tools : [], colors: Array.isArray(project.colors) ? project.colors : [],
    challenge: project.challenge || "", approach: project.approach || "", outcome: project.outcome || "", gallery: Array.isArray(project.gallery) ? project.gallery : []
  }));
}

async function connect(token, remember) {
  state.token = token.trim(); status("Connecting…");
  const file = await github(`/contents/content.json?ref=${BRANCH}`);
  state.content = JSON.parse(decode64(file.content)); migrateContent(); state.sha = file.sha;
  (remember ? localStorage : sessionStorage).setItem("zm_github_token", state.token);
  if (remember) sessionStorage.removeItem("zm_github_token"); else localStorage.removeItem("zm_github_token");
  $("[data-login]").hidden = true; $("[data-logout]").hidden = false; status("Connected to your GitHub"); showWelcome(); refreshPreview(0);
}

function previewRenderer() { const win = preview.contentWindow; return win?.applyContent || win?.applyProjectContent || win?.applyCategoryContent; }
function refreshPreview(scrollY) {
  if (!state.content) return;
  const win = preview.contentWindow; const renderer = previewRenderer();
  if (!renderer) { setTimeout(() => refreshPreview(scrollY), 120); return; }
  const y = scrollY ?? win.scrollY; renderer(clone(state.content));
  setTimeout(() => { installPreviewEditing(); win.scrollTo(0, y); }, 70);
}
function navigatePreview(url) { preview.src = url; status(state.dirty ? "Unsaved changes" : "Connected to your GitHub"); }

function installPreviewEditing() {
  const doc = preview.contentDocument; if (!doc?.body) return;
  if (!$("#zm-editor-style", doc)) { const style = doc.createElement("style"); style.id = "zm-editor-style"; style.textContent = `[data-edit-path],[data-editor-project-index],[data-editor-service-index],[data-editor-category-index],[data-editor-gallery-index],[data-editor-category-gallery-index],[data-editor-section]{cursor:pointer}[data-edit-path]:hover{outline:2px dashed #5276ff;outline-offset:4px}.zm-selected{outline:3px solid #5276ff!important;outline-offset:4px}.zm-editing{outline:3px solid #d9ff4f!important;outline-offset:4px}`; doc.head.append(style); }
  if (doc.body.dataset.zmEditorReady) return;
  doc.body.dataset.zmEditorReady = "true"; doc.addEventListener("click", handlePreviewClick, true); doc.addEventListener("input", handlePreviewInput, true);
}
function clearSelection() { preview.contentDocument?.querySelectorAll(".zm-selected").forEach((node) => node.classList.remove("zm-selected")); }
function handlePreviewClick(event) {
  const target = event.target; const editable = target.closest("[data-edit-path]");
  if (editable) { event.preventDefault(); event.stopImmediatePropagation(); selectText(editable); return; }
  const gallery = target.closest("[data-editor-gallery-index]");
  if (gallery) { event.preventDefault(); event.stopImmediatePropagation(); selectNode(gallery, { type: "project", index: Number(gallery.dataset.editorProjectIndex) }); return; }
  const categoryGallery = target.closest("[data-editor-category-gallery-index]");
  if (categoryGallery) { event.preventDefault(); event.stopImmediatePropagation(); selectNode(categoryGallery, { type: "category", index: Number(categoryGallery.dataset.editorCategoryIndex) }); return; }
  const project = target.closest("[data-editor-project-index]");
  if (project) { event.preventDefault(); event.stopImmediatePropagation(); selectNode(project, { type: "project", index: Number(project.dataset.editorProjectIndex) }); return; }
  const category = target.closest("[data-editor-category-index]");
  if (category) { event.preventDefault(); event.stopImmediatePropagation(); selectNode(category, { type: "category", index: Number(category.dataset.editorCategoryIndex) }); return; }
  const service = target.closest("[data-editor-service-index]");
  if (service) { event.preventDefault(); event.stopImmediatePropagation(); selectNode(service, { type: "service", index: Number(service.dataset.editorServiceIndex) }); return; }
  const section = target.closest("[data-editor-section]");
  if (section) { event.preventDefault(); selectNode(section, { type: "section", key: section.dataset.editorSection }); }
}
function selectNode(node, selection) { clearSelection(); node.classList.add("zm-selected"); state.selected = { ...selection, node }; renderPanel(); }
function selectText(node) {
  clearSelection(); preview.contentDocument.querySelectorAll("[contenteditable]").forEach((item) => { item.contentEditable = "false"; item.classList.remove("zm-editing"); });
  node.classList.add("zm-selected", "zm-editing"); node.contentEditable = "true"; node.focus(); state.selected = { type: "text", path: node.dataset.editPath, node }; snapshot(); renderPanel();
}
function handlePreviewInput(event) { const node = event.target.closest("[data-edit-path]"); if (!node) return; setPath(node.dataset.editPath, node.innerText.replace(/\n$/, "")); markDirty(); }

function inputField(label, value, path, type = "text") { return `<label>${label}<input type="${type}" value="${escapeValue(value)}" data-field="${path}"></label>`; }
function textareaField(label, value, path) { return `<label>${label}<textarea data-field="${path}">${escapeValue(value)}</textarea></label>`; }
function styleControls(scope, key) {
  const styles = state.content.editorStyles[scope][key] || {};
  return `<h2>Selected style</h2><label>Font<select data-style="fontFamily"><option value="">Use website font</option><option value="Inter, ui-sans-serif, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option></select></label><label>Font size (px)<input type="number" min="8" max="180" value="${parseInt(styles.fontSize) || ""}" placeholder="Default" data-style="fontSize"></label><div class="colors"><label>Text color<input type="color" value="${styles.color || "#11110f"}" data-style="color"></label><label>Background<input type="color" value="${styles.backgroundColor || "#f2f0e9"}" data-style="backgroundColor"></label></div><button type="button" data-reset-style>Reset selected style</button>`;
}
function galleryManager(items, ownerType, ownerIndex) {
  const root = ownerType === "project" ? "projects" : "categories";
  return `<h2>Image gallery</h2><label>Add multiple images<input type="file" accept="image/*" multiple data-gallery-upload="${ownerType}"></label><p class="hint">Large photos are optimized before upload for faster loading.</p><div class="gallery-manager">${items.length ? items.map((item, index) => `<article class="gallery-row"><img src="${escapeValue(item.src || item.image)}" alt=""><div>${inputField("Alt text", item.alt || "", `${root}.${ownerIndex}.gallery.${index}.alt`)}${inputField("Caption", item.caption || "", `${root}.${ownerIndex}.gallery.${index}.caption`)}</div><div class="gallery-buttons"><button type="button" data-gallery-move="up" data-gallery-index="${index}">↑</button><button type="button" data-gallery-move="down" data-gallery-index="${index}">↓</button><button type="button" class="danger" data-gallery-delete="${index}">×</button></div></article>`).join("") : "<p>No gallery images yet.</p>"}</div>`;
}

function renderPanel() {
  const selected = state.selected; if (!selected) return;
  if (selected.type === "text") {
    const linkPath = selected.node.closest("[data-editor-link-path]")?.dataset.editorLinkPath;
    panel.innerHTML = `<h1>Edit text</h1><p>Type directly in the highlighted text on the website.</p>${linkPath ? inputField("Button/link destination", getPath(linkPath), linkPath) : ""}${styleControls("elements", selected.path)}`;
  } else if (selected.type === "section") {
    const styles = state.content.editorStyles.sections[selected.key] || {};
    panel.innerHTML = `<h1>${escapeValue(selected.key)} section</h1><p>Change this section without affecting the rest of the site.</p>${styleControls("sections", selected.key)}<label>Background image<input type="file" accept="image/*" data-section-image></label>${styles.backgroundImage ? '<button type="button" data-remove-background>Remove background image</button>' : ""}`;
  } else if (selected.type === "project") renderProjectPanel(selected.index);
  else if (selected.type === "category") renderCategoryPanel(selected.index);
  else {
    const service = state.content.services[selected.index];
    panel.innerHTML = `<h1>${escapeValue(service.title)}</h1><p>Click its title or description in the preview to type directly.</p>${inputField("Service title", service.title, `services.${selected.index}.title`)}${textareaField("Description", service.description, `services.${selected.index}.description`)}<div class="panel-actions"><button data-move="up">Move up</button><button data-move="down">Move down</button><button class="danger wide" data-delete>Remove service</button></div>`;
  }
  bindPanel();
}

function renderProjectPanel(index) {
  const p = state.content.projects[index]; const base = `projects.${index}`;
  panel.innerHTML = `<div class="panel-title"><div><span>Project</span><h1>${escapeValue(p.title)}</h1></div><button type="button" data-open-project>Open case study ↗</button></div>
    ${inputField("Project title", p.title, `${base}.title`)}${inputField("Card subtitle", p.subtitle, `${base}.subtitle`)}
    <label>Category<select data-field="${base}.category"><option value="logo">Branding / Logo Design</option><option value="social">Social Media Design</option><option value="listing">Listing Images</option><option value="aplus">Amazon A+ Content</option><option value="print">Print Design</option></select></label>
    ${inputField("Category label", p.categoryLabel, `${base}.categoryLabel`)}${textareaField("Short summary", p.summary, `${base}.summary`)}${textareaField("Full description", p.fullDescription, `${base}.fullDescription`)}
    <div class="two-fields">${inputField("Client", p.client, `${base}.client`)}${inputField("Year", p.year, `${base}.year`)}</div>
    ${textareaField("Scope", p.scope, `${base}.scope`)}${textareaField("Status", p.status, `${base}.status`)}${textareaField("Challenge", p.challenge, `${base}.challenge`)}${textareaField("Approach", p.approach, `${base}.approach`)}${textareaField("Outcome", p.outcome, `${base}.outcome`)}${textareaField("Portfolio note", p.note, `${base}.note`)}
    <label>Tools (comma separated)<textarea data-list-field="${base}.tools">${escapeValue((p.tools || []).join(", "))}</textarea></label>
    <label>Colors (hex codes, comma separated)<textarea data-list-field="${base}.colors">${escapeValue((p.colors || []).map((color) => typeof color === "string" ? color : color.value).join(", "))}</textarea></label>
    <h2>Cover image</h2><label>Replace cover<input type="file" accept="image/*" data-project-image></label>${p.image ? '<button type="button" data-remove-cover>Remove cover image</button>' : ""}${inputField("Cover image alt text", p.coverAlt, `${base}.coverAlt`)}
    ${galleryManager(p.gallery || [], "project", index)}
    <div class="panel-actions"><button data-move="up">Move up</button><button data-move="down">Move down</button><button class="danger wide" data-delete>Remove project</button></div>`;
  $(`[data-field="${base}.category"]`, panel).value = p.category;
}

function renderCategoryPanel(index) {
  const category = state.content.categories[index]; const base = `categories.${index}`;
  panel.innerHTML = `<div class="panel-title"><div><span>Category</span><h1>${escapeValue(category.title)}</h1></div><button type="button" data-open-category>Open category ↗</button></div>${inputField("Navigation label", category.label, `${base}.label`)}${inputField("Category title", category.title, `${base}.title`)}${textareaField("Short description", category.description, `${base}.description`)}${textareaField("Full details", category.details, `${base}.details`)}${galleryManager(category.gallery || [], "category", index)}`;
}

function bindPanel() {
  $$('[data-field]', panel).forEach((input) => input.addEventListener("change", () => { snapshot(); setPath(input.dataset.field, input.value); markDirty(); refreshPreview(); if (state.selected?.type !== "text") renderPanel(); }));
  $$('[data-list-field]', panel).forEach((input) => input.addEventListener("change", () => { snapshot(); setPath(input.dataset.listField, input.value.split(",").map((item) => item.trim()).filter(Boolean)); markDirty(); refreshPreview(); renderPanel(); }));
  $$('[data-style]', panel).forEach((input) => { const selected=state.selected,scope=selected.type==="section"?"sections":"elements",key=selected.type==="section"?selected.key:selected.path,current=state.content.editorStyles[scope][key]||{},value=current[input.dataset.style];if(value)input.value=input.dataset.style==="fontSize"?parseInt(value):value;input.addEventListener("change",()=>{snapshot();const styles=state.content.editorStyles[scope][key]||={};styles[input.dataset.style]=input.dataset.style==="fontSize"?`${input.value}px`:input.value;markDirty();refreshPreview();renderPanel();}); });
  $("[data-reset-style]",panel)?.addEventListener("click",()=>{const selected=state.selected,scope=selected.type==="section"?"sections":"elements",key=selected.type==="section"?selected.key:selected.path;snapshot();delete state.content.editorStyles[scope][key];markDirty();refreshPreview();renderPanel();});
  $("[data-section-image]",panel)?.addEventListener("change",(event)=>queueSectionImage(event.target.files[0]));
  $("[data-remove-background]",panel)?.addEventListener("click",()=>{snapshot();delete state.content.editorStyles.sections[state.selected.key].backgroundImage;markDirty();refreshPreview();renderPanel();});
  $("[data-project-image]",panel)?.addEventListener("change",(event)=>queueCoverImage(event.target.files[0],state.selected.index));
  $("[data-remove-cover]",panel)?.addEventListener("click",()=>{snapshot();state.content.projects[state.selected.index].image="";markDirty();refreshPreview();renderPanel();});
  $("[data-gallery-upload]",panel)?.addEventListener("change",(event)=>queueGalleryImages(event.target.files,event.target.dataset.galleryUpload,state.selected.index));
  $$('[data-gallery-delete]',panel).forEach((button)=>button.addEventListener("click",()=>deleteGalleryItem(Number(button.dataset.galleryDelete))));
  $$('[data-gallery-move]',panel).forEach((button)=>button.addEventListener("click",()=>moveGalleryItem(Number(button.dataset.galleryIndex),button.dataset.galleryMove)));
  $("[data-open-project]",panel)?.addEventListener("click",()=>navigatePreview(`project.html?id=${encodeURIComponent(state.content.projects[state.selected.index].id)}&editor-preview=1`));
  $("[data-open-category]",panel)?.addEventListener("click",()=>navigatePreview(`category.html?category=${encodeURIComponent(state.content.categories[state.selected.index].id)}&editor-preview=1`));
  $$('[data-move]',panel).forEach((button)=>button.addEventListener("click",()=>moveSelected(button.dataset.move)));
  $("[data-delete]",panel)?.addEventListener("click",deleteSelected);
}

function safeName(name) { return name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
async function optimizeImage(file) {
  if (!file || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try { const bitmap=await createImageBitmap(file),max=2400,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));if(scale===1&&file.size<900000){bitmap.close();return file;}const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise((resolve)=>canvas.toBlob(resolve,"image/webp",.86));return new File([blob],`${safeName(file.name)}.webp`,{type:"image/webp"}); } catch { return file; }
}
function uploadPath(file) { const extension=file.name.includes(".")?file.name.split(".").pop().toLowerCase():"webp";return `assets/uploads/${Date.now()}-${Math.random().toString(36).slice(2,7)}-${safeName(file.name)}.${extension}`; }
async function queueCoverImage(file,index) { if(!file)return;status("Optimizing image…");const optimized=await optimizeImage(file);snapshot();const target=state.content.projects[index],previewUrl=URL.createObjectURL(optimized);target.image=previewUrl;state.uploads.push({file:optimized,path:uploadPath(optimized),target,key:"image",previewUrl});markDirty();refreshPreview();renderPanel(); }
async function queueGalleryImages(files,type,index) { if(!files?.length)return;status("Optimizing images…");snapshot();const target=type==="project"?state.content.projects[index]:state.content.categories[index];target.gallery||=[];for(const file of files){const optimized=await optimizeImage(file),item={src:URL.createObjectURL(optimized),alt:"",caption:""};target.gallery.push(item);state.uploads.push({file:optimized,path:uploadPath(optimized),target:item,key:"src",previewUrl:item.src});}markDirty();refreshPreview();renderPanel(); }
async function queueSectionImage(file) { if(!file)return;const optimized=await optimizeImage(file);snapshot();const target=state.content.editorStyles.sections[state.selected.key]||={},previewUrl=URL.createObjectURL(optimized);target.backgroundImage=`url("${previewUrl}")`;state.uploads.push({file:optimized,path:uploadPath(optimized),target,key:"backgroundImage",previewUrl,cssUrl:true});markDirty();refreshPreview();renderPanel(); }
function galleryArray(){return state.selected.type==="project"?state.content.projects[state.selected.index].gallery:state.content.categories[state.selected.index].gallery;}
function deleteGalleryItem(index){snapshot();galleryArray().splice(index,1);markDirty();refreshPreview();renderPanel();}
function moveGalleryItem(index,direction){const items=galleryArray(),next=index+(direction==="up"?-1:1);if(next<0||next>=items.length)return;snapshot();[items[index],items[next]]=[items[next],items[index]];markDirty();refreshPreview();renderPanel();}
function moveSelected(direction){const selected=state.selected,array=selected.type==="project"?state.content.projects:state.content.services,next=selected.index+(direction==="up"?-1:1);if(next<0||next>=array.length)return;snapshot();[array[selected.index],array[next]]=[array[next],array[selected.index]];selected.index=next;markDirty();refreshPreview();renderPanel();}
function deleteSelected(){const selected=state.selected;if(!confirm(`Remove this ${selected.type}?`))return;snapshot();(selected.type==="project"?state.content.projects:state.content.services).splice(selected.index,1);state.selected=null;markDirty();refreshPreview();showWelcome();}

function showWelcome() {
  state.selected=null;
  panel.innerHTML=`<h1>Click anything to edit</h1><p>Click text in the preview and type. Click a project, category, service, image, or section for more controls.</p><h2>Contact information</h2>${inputField("Phone",state.content?.contact.phone||"","contact.phone")}${inputField("Phone link",state.content?.contact.phoneUrl||"","contact.phoneUrl")}${inputField("WhatsApp link",state.content?.contact.whatsappUrl||"","contact.whatsappUrl")}${inputField("WhatsApp label",state.content?.contact.whatsappLabel||"","contact.whatsappLabel")}${inputField("Email",state.content?.contact.email||"","contact.email","email")}${inputField("LinkedIn",state.content?.contact.linkedinUrl||"","contact.linkedinUrl")}${inputField("LinkedIn label",state.content?.contact.linkedinLabel||"","contact.linkedinLabel")}${inputField("Location",state.content?.contact.location||"","contact.location")}${inputField("Map link",state.content?.contact.locationUrl||"","contact.locationUrl")}<div class="global-settings"><h2>Whole website style</h2><label>Body font<select data-global="site.fontFamily"><option value='Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>Inter / clean sans</option><option value="Arial, Helvetica, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option></select></label><label>Accent font<select data-global="site.accentFontFamily"><option value="Georgia, serif">Georgia</option><option value="Inter, ui-sans-serif, sans-serif">Inter</option></select></label><label>Base font size<input type="number" min="12" max="24" data-global="site.baseFontSize"></label><div class="colors"><label>Main background<input type="color" data-global="site.paperColor"></label><label>Dark color<input type="color" data-global="site.darkColor"></label><label>Highlight<input type="color" data-global="site.primaryColor"></label><label>Accent<input type="color" data-global="site.accentColor"></label></div></div>`;
  bindPanel(); syncGlobals();
}
function syncGlobals(){if(!state.content)return;$$('[data-global]').forEach((input)=>{input.value=getPath(input.dataset.global);input.onchange=()=>{snapshot();setPath(input.dataset.global,input.type==="number"?Number(input.value):input.value);markDirty();refreshPreview();};});}

$("[data-show-home]").addEventListener("click",()=>navigatePreview("index.html?editor-preview=1"));
$("[data-add-project]").addEventListener("click",()=>{snapshot();const n=state.content.projects.length+1;state.content.projects.push({id:`project-${Date.now()}`,title:`New Project ${n}`,category:"logo",categoryLabel:"Branding / Logo Design",subtitle:"Add project subtitle",summary:"Add the project story here.",scope:"Add project scope",status:"Add project status",note:"",image:"",visualStyle:"urban",coverAlt:"",fullDescription:"",client:"",year:"",tools:[],colors:[],challenge:"",approach:"",outcome:"",gallery:[]});state.selected={type:"project",index:state.content.projects.length-1};markDirty();refreshPreview();setTimeout(renderPanel,80);});
$("[data-add-service]").addEventListener("click",()=>{snapshot();state.content.services.push({title:"New Service",description:"Add the service description."});state.selected={type:"service",index:state.content.services.length-1};markDirty();refreshPreview();setTimeout(renderPanel,80);});
$("[data-undo]").addEventListener("click",()=>{if(!state.history.length)return;state.content=state.history.pop();state.selected=null;markDirty();refreshPreview();showWelcome();$("[data-undo]").disabled=!state.history.length;});

async function fileBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=reject;reader.readAsDataURL(file);});}
async function save(){const button=$("[data-save]");button.disabled=true;status("Saving to GitHub…");try{for(const upload of state.uploads){if(!JSON.stringify(state.content).includes(upload.previewUrl))continue;await github(`/contents/${upload.path}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Add portfolio image ${upload.file.name}`,content:await fileBase64(upload.file),branch:BRANCH})});upload.target[upload.key]=upload.cssUrl?`url("${upload.path}")`:upload.path;}const fresh=await github(`/contents/content.json?ref=${BRANCH}`);const result=await github("/contents/content.json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Update portfolio from visual editor",content:encode64(JSON.stringify(state.content,null,2)+"\n"),sha:fresh.sha,branch:BRANCH})});state.sha=result.content.sha;state.uploads=[];state.dirty=false;status("Published — GitHub Pages is updating");toast("Saved. Live site will update shortly.");refreshPreview();}catch(error){status("Save failed");toast(error.message);button.disabled=false;}}
$("[data-save]").addEventListener("click",save);
$("[data-logout]").addEventListener("click",()=>{localStorage.removeItem("zm_github_token");sessionStorage.removeItem("zm_github_token");location.reload();});
$("[data-login-form]").addEventListener("submit",async(event)=>{event.preventDefault();const error=$("[data-login-error]");error.textContent="";try{await connect($("[data-token]").value,$("[data-remember]").checked);}catch(exception){error.textContent=`Could not connect: ${exception.message}. Check the token settings.`;status("Not connected");}});
preview.addEventListener("load",()=>{if(state.content)refreshPreview(0);else installPreviewEditing();});
window.addEventListener("beforeunload",(event)=>{if(state.dirty){event.preventDefault();event.returnValue="";}});

const savedToken=localStorage.getItem("zm_github_token")||sessionStorage.getItem("zm_github_token");
if(savedToken){$("[data-token]").value=savedToken;connect(savedToken,Boolean(localStorage.getItem("zm_github_token"))).catch(()=>{localStorage.removeItem("zm_github_token");sessionStorage.removeItem("zm_github_token");status("Login expired");});}
