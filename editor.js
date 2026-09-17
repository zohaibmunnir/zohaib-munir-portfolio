const REPO = "zohaibmunnir/zohaib-munir-portfolio";
const BRANCH = "main";
const API = `https://api.github.com/repos/${REPO}`;
const $ = (selector, root = document) => root.querySelector(selector);

const state = { token: "", content: null, sha: "", dirty: false, selected: null, history: [], uploads: [] };
const preview = $("[data-preview]");
const panel = $("[data-panel]");
const fileInput = $("[data-file-input]");

function toast(message) {
  const node = $("[data-toast]");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
}

function status(message) { $("[data-status]").textContent = message; }
function encode64(text) { return btoa(unescape(encodeURIComponent(text))); }
function decode64(text) { return decodeURIComponent(escape(atob(text.replace(/\n/g, "")))); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function parts(path) { return path.split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part); }
function getPath(path) { return parts(path).reduce((value, key) => value?.[key], state.content); }
function setPath(path, value) {
  const keys = parts(path); let target = state.content;
  keys.slice(0, -1).forEach((key) => { target = target[key]; });
  target[keys.at(-1)] = value;
}
function snapshot() {
  state.history.push(clone(state.content));
  if (state.history.length > 30) state.history.shift();
  $("[data-undo]").disabled = false;
}
function markDirty() {
  state.dirty = true;
  $("[data-save]").disabled = false;
  status("Unsaved changes");
}

async function github(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${state.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) }
  });
  if (!response.ok) {
    let detail = ""; try { detail = (await response.json()).message; } catch {}
    throw new Error(detail || `GitHub error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function connect(token, remember) {
  state.token = token.trim();
  status("Connecting…");
  const file = await github(`/contents/content.json?ref=${BRANCH}`);
  state.content = JSON.parse(decode64(file.content));
  state.content.editorStyles ||= { elements: {}, sections: {} };
  state.content.editorStyles.elements ||= {};
  state.content.editorStyles.sections ||= {};
  state.sha = file.sha;
  (remember ? localStorage : sessionStorage).setItem("zm_github_token", state.token);
  if (remember) sessionStorage.removeItem("zm_github_token"); else localStorage.removeItem("zm_github_token");
  $("[data-login]").hidden = true;
  $("[data-logout]").hidden = false;
  status("Connected to your GitHub");
  syncGlobals();
  refreshPreview();
}

function refreshPreview(scrollY) {
  const win = preview.contentWindow;
  if (!win?.applyContent || !state.content) return;
  const y = scrollY ?? win.scrollY;
  win.applyContent(clone(state.content));
  setTimeout(() => { installPreviewEditing(); win.scrollTo(0, y); }, 60);
}

function installPreviewEditing() {
  const doc = preview.contentDocument;
  if (!doc?.body) return;
  if (!$("#zm-editor-style", doc)) {
    const style = doc.createElement("style");
    style.id = "zm-editor-style";
    style.textContent = `[data-edit-path],[data-editor-project-index],[data-editor-service-index],[data-editor-section]{cursor:pointer}[data-edit-path]:hover{outline:2px dashed #5276ff;outline-offset:4px}.zm-selected{outline:3px solid #5276ff!important;outline-offset:4px}.zm-editing{outline:3px solid #d9ff4f!important;outline-offset:4px}`;
    doc.head.append(style);
  }
  if (doc.body.dataset.zmEditorReady) return;
  doc.body.dataset.zmEditorReady = "true";
  doc.addEventListener("click", handlePreviewClick, true);
  doc.addEventListener("input", handlePreviewInput, true);
}

function clearSelectionClass() { preview.contentDocument?.querySelectorAll(".zm-selected").forEach((n) => n.classList.remove("zm-selected")); }
function handlePreviewClick(event) {
  if (preview.contentDocument.body.dataset.zmAllowProjectOpen === "true") return;
  const target = event.target;
  const editable = target.closest("[data-edit-path]");
  if (editable) {
    event.preventDefault(); event.stopImmediatePropagation();
    selectText(editable); return;
  }
  const project = target.closest("[data-editor-project-index]");
  if (project) {
    event.preventDefault(); event.stopImmediatePropagation();
    clearSelectionClass(); project.classList.add("zm-selected");
    state.selected = { type: "project", index: Number(project.dataset.editorProjectIndex), node: project };
    renderPanel(); return;
  }
  const service = target.closest("[data-editor-service-index]");
  if (service) {
    clearSelectionClass(); service.classList.add("zm-selected");
    state.selected = { type: "service", index: Number(service.dataset.editorServiceIndex), node: service };
    renderPanel(); return;
  }
  const section = target.closest("[data-editor-section]");
  if (section) {
    clearSelectionClass(); section.classList.add("zm-selected");
    state.selected = { type: "section", key: section.dataset.editorSection, node: section };
    renderPanel();
  }
}

function selectText(node) {
  clearSelectionClass();
  preview.contentDocument.querySelectorAll("[contenteditable]").forEach((n) => { n.contentEditable = "false"; n.classList.remove("zm-editing"); });
  node.classList.add("zm-selected", "zm-editing");
  node.contentEditable = "true";
  node.focus();
  state.selected = { type: "text", path: node.dataset.editPath, node };
  snapshot();
  renderPanel();
}

function handlePreviewInput(event) {
  const node = event.target.closest("[data-edit-path]");
  if (!node) return;
  setPath(node.dataset.editPath, node.innerText.replace(/\n$/, ""));
  markDirty();
}

function field(label, value, path, type = "text") {
  return `<label>${label}<input type="${type}" value="${String(value ?? "").replaceAll('&','&amp;').replaceAll('"','&quot;')}" data-field="${path}"></label>`;
}
function styleControls(scope, key) {
  const styles = state.content.editorStyles[scope][key] || {};
  return `<h2>Style</h2>
    <label>Font<select data-style="fontFamily"><option value="">Use website font</option><option value="Inter, ui-sans-serif, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', serif">Times New Roman</option></select></label>
    <label>Font size (px)<input type="number" min="8" max="180" value="${parseInt(styles.fontSize) || ""}" placeholder="Default" data-style="fontSize"></label>
    <div class="colors"><label>Text color<input type="color" value="${styles.color || "#11110f"}" data-style="color"></label><label>Background<input type="color" value="${styles.backgroundColor || "#f2f0e9"}" data-style="backgroundColor"></label></div>
    <button type="button" data-reset-style>Reset selected style</button>`;
}

function renderPanel() {
  const selected = state.selected;
  if (!selected) return;
  if (selected.type === "text") {
    const linkPath = selected.node.closest("[data-editor-link-path]")?.dataset.editorLinkPath;
    panel.innerHTML = `<h1>Edit text</h1><p>Type directly in the highlighted text on the website.</p>${linkPath ? field("Button/link destination", getPath(linkPath), linkPath, "text") : ""}${styleControls("elements", selected.path)}`;
  } else if (selected.type === "section") {
    const styles = state.content.editorStyles.sections[selected.key] || {};
    panel.innerHTML = `<h1>${selected.key[0].toUpperCase()+selected.key.slice(1)} section</h1><p>Change the selected section without affecting the rest of the website.</p>${styleControls("sections", selected.key)}<label>Background image<input type="file" accept="image/*" data-section-image></label>${styles.backgroundImage ? '<button type="button" data-remove-background>Remove background image</button>' : ''}`;
  } else if (selected.type === "project") {
    const p = state.content.projects[selected.index];
    panel.innerHTML = `<h1>${p.title}</h1><p>Edit text by clicking it in the preview, or use these project controls.</p>
      <label>Category<select data-field="projects.${selected.index}.category"><option value="logo">Logo Design</option><option value="social">Social Media Design</option><option value="listing">Listing Images</option><option value="aplus">Amazon A+ Content</option><option value="print">Print Media</option></select></label>
      <label>Project image<input type="file" accept="image/*" data-project-image></label>
      <div class="panel-actions"><button data-open-details>Open details</button><button data-move="up">Move up</button><button data-move="down">Move down</button><button class="danger wide" data-delete>Remove project</button></div>`;
    $("[data-field]", panel).value = p.category;
  } else {
    const service = state.content.services[selected.index];
    panel.innerHTML = `<h1>${service.title}</h1><p>Click its title or description in the preview to type directly.</p><div class="panel-actions"><button data-move="up">Move up</button><button data-move="down">Move down</button><button class="danger wide" data-delete>Remove service</button></div>`;
  }
  bindPanel();
}

function bindPanel() {
  panel.querySelectorAll("[data-field]").forEach((input) => input.addEventListener("change", () => { snapshot(); setPath(input.dataset.field, input.value); markDirty(); refreshPreview(); }));
  panel.querySelectorAll("[data-style]").forEach((input) => {
    const selected = state.selected; const scope = selected.type === "section" ? "sections" : "elements"; const key = selected.type === "section" ? selected.key : selected.path;
    const current = state.content.editorStyles[scope][key] || {};
    const value = current[input.dataset.style];
    if (value) input.value = input.dataset.style === "fontSize" ? parseInt(value) : value;
    input.addEventListener("change", () => { snapshot(); const styles = state.content.editorStyles[scope][key] ||= {}; styles[input.dataset.style] = input.dataset.style === "fontSize" ? `${input.value}px` : input.value; markDirty(); refreshPreview(); renderPanel(); });
  });
  $("[data-reset-style]", panel)?.addEventListener("click", () => { const s=state.selected, scope=s.type==="section"?"sections":"elements", key=s.type==="section"?s.key:s.path; snapshot(); delete state.content.editorStyles[scope][key]; markDirty(); refreshPreview(); renderPanel(); });
  $("[data-project-image]", panel)?.addEventListener("change", (e) => queueImage(e.target.files[0], `projects.${state.selected.index}.image`));
  $("[data-section-image]", panel)?.addEventListener("change", (e) => queueSectionImage(e.target.files[0]));
  $("[data-remove-background]", panel)?.addEventListener("click", () => { snapshot(); delete state.content.editorStyles.sections[state.selected.key].backgroundImage; markDirty(); refreshPreview(); renderPanel(); });
  $("[data-open-details]", panel)?.addEventListener("click", () => {
    const doc=preview.contentDocument, i=state.selected.index;
    doc.body.dataset.zmAllowProjectOpen="true";
    doc.querySelector(`[data-editor-project-index="${i}"] [data-project-id]`)?.click();
    delete doc.body.dataset.zmAllowProjectOpen;
  });
  panel.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => moveSelected(button.dataset.move)));
  $("[data-delete]", panel)?.addEventListener("click", deleteSelected);
}

function safeName(name) { return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, ""); }
function queueImage(file, path) {
  if (!file) return; snapshot();
  const repoPath = `assets/uploads/${Date.now()}-${safeName(file.name)}`;
  state.uploads.push({ file, path: repoPath }); setPath(path, URL.createObjectURL(file));
  state.uploads.at(-1).contentPath = path; markDirty(); refreshPreview(); renderPanel();
}
function queueSectionImage(file) {
  if (!file) return; snapshot();
  const repoPath = `assets/uploads/${Date.now()}-${safeName(file.name)}`;
  state.uploads.push({ file, path: repoPath, styleSection: state.selected.key });
  (state.content.editorStyles.sections[state.selected.key] ||= {}).backgroundImage = `url("${URL.createObjectURL(file)}")`;
  markDirty(); refreshPreview(); renderPanel();
}

function moveSelected(direction) {
  const selected=state.selected, array=selected.type==="project"?state.content.projects:state.content.services;
  const next=selected.index+(direction==="up"?-1:1); if(next<0||next>=array.length)return;
  snapshot(); [array[selected.index],array[next]]=[array[next],array[selected.index]]; selected.index=next; markDirty(); refreshPreview(); renderPanel();
}
function deleteSelected() {
  const selected=state.selected; if(!confirm(`Remove this ${selected.type}?`))return;
  snapshot(); (selected.type==="project"?state.content.projects:state.content.services).splice(selected.index,1); state.selected=null; markDirty(); refreshPreview(); showWelcome();
}
function showWelcome() {
  panel.innerHTML = `<h1>Click anything to edit</h1><p>Click text in the preview and type. Click a project or section for more controls.</p>`;
  appendGlobals();
}
function appendGlobals() {
  panel.insertAdjacentHTML("beforeend", `<div class="global-settings"><h2>Whole website style</h2>
    <label>Body font<select data-global="site.fontFamily"><option value='Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>Inter / clean sans</option><option value="Arial, Helvetica, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option></select></label>
    <label>Accent font<select data-global="site.accentFontFamily"><option value="Georgia, serif">Georgia</option><option value="Inter, ui-sans-serif, sans-serif">Inter</option></select></label>
    <label>Base font size<input type="number" min="12" max="24" data-global="site.baseFontSize"></label>
    <div class="colors"><label>Main background<input type="color" data-global="site.paperColor"></label><label>Dark color<input type="color" data-global="site.darkColor"></label><label>Highlight<input type="color" data-global="site.primaryColor"></label><label>Accent<input type="color" data-global="site.accentColor"></label></div></div>`);
  syncGlobals();
}
function syncGlobals() {
  if(!state.content)return;
  document.querySelectorAll("[data-global]").forEach((input) => { input.value=getPath(input.dataset.global); input.onchange=()=>{snapshot();setPath(input.dataset.global,input.type==="number"?Number(input.value):input.value);markDirty();refreshPreview();}; });
}

$("[data-add-project]").addEventListener("click", () => {
  snapshot(); const n=state.content.projects.length+1;
  state.content.projects.push({ id:`project-${Date.now()}`, title:`New Project ${n}`, category:"logo", categoryLabel:"Logo Design", subtitle:"Add project subtitle", summary:"Add the project story here.", scope:"Add project scope", status:"Add project status", note:"Add portfolio note", image:"", visualStyle:"urban" });
  state.selected={type:"project",index:state.content.projects.length-1}; markDirty(); refreshPreview(); setTimeout(renderPanel,80);
});
$("[data-add-service]").addEventListener("click", () => { snapshot(); state.content.services.push({title:"New Service",description:"Add the service description."}); state.selected={type:"service",index:state.content.services.length-1}; markDirty(); refreshPreview(); setTimeout(renderPanel,80); });
$("[data-undo]").addEventListener("click", () => { if(!state.history.length)return; state.content=state.history.pop(); state.selected=null; markDirty(); refreshPreview(); showWelcome(); $("[data-undo]").disabled=!state.history.length; });

async function fileBase64(file) { return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(file);}); }
async function save() {
  const button=$("[data-save]"); button.disabled=true; status("Saving to GitHub…");
  try {
    for (const upload of state.uploads) {
      await github(`/contents/${upload.path}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:`Add portfolio image ${upload.file.name}`,content:await fileBase64(upload.file),branch:BRANCH}) });
      if(upload.contentPath)setPath(upload.contentPath,upload.path);
      if(upload.styleSection)(state.content.editorStyles.sections[upload.styleSection]||={}).backgroundImage=`url("${upload.path}")`;
    }
    const fresh=await github(`/contents/content.json?ref=${BRANCH}`);
    const result=await github(`/contents/content.json`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:"Update portfolio from visual editor",content:encode64(JSON.stringify(state.content,null,2)+"\n"),sha:fresh.sha,branch:BRANCH}) });
    state.sha=result.content.sha; state.uploads=[]; state.dirty=false; status("Published — GitHub Pages is updating"); toast("Saved. Live site will update shortly.");
  } catch(error) { status("Save failed"); toast(error.message); button.disabled=false; }
}
$("[data-save]").addEventListener("click", save);
$("[data-logout]").addEventListener("click", () => { localStorage.removeItem("zm_github_token");sessionStorage.removeItem("zm_github_token");location.reload(); });
$("[data-login-form]").addEventListener("submit", async(event)=>{event.preventDefault();const error=$("[data-login-error]");error.textContent="";try{await connect($("[data-token]").value,$("[data-remember]").checked);}catch(e){error.textContent=`Could not connect: ${e.message}. Check the token settings.`;status("Not connected");}});
preview.addEventListener("load",()=>{if(state.content){refreshPreview(0);}else{installPreviewEditing();}});
window.addEventListener("beforeunload",(event)=>{if(state.dirty){event.preventDefault();event.returnValue="";}});

const savedToken=localStorage.getItem("zm_github_token")||sessionStorage.getItem("zm_github_token");
if(savedToken){$("[data-token]").value=savedToken;connect(savedToken,Boolean(localStorage.getItem("zm_github_token"))).catch(()=>{localStorage.removeItem("zm_github_token");sessionStorage.removeItem("zm_github_token");status("Login expired");});}
