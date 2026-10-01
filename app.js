const state = { all: [], filtered: [] };
const $ = id => document.getElementById(id);

async function loadCatalog(force=false) {
  $("status").textContent = "Synchronisation…";
  try {
    const url = `data/catalog.json${force ? `?t=${Date.now()}` : ""}`;
    const res = await fetch(url, {cache: "no-store"});
    if (!res.ok) throw new Error("catalogue indisponible");
    const data = await res.json();
    state.all = Array.isArray(data.extensions) ? data.extensions : [];
    populateFilters();
    render();
    $("updated").textContent = data.generatedAt ? `Mis à jour ${new Date(data.generatedAt).toLocaleString("fr-FR")}` : "";
    $("status").textContent = "● À jour";
  } catch (e) {
    $("status").textContent = "Erreur de synchronisation";
    console.error(e);
  }
}

function populateFilters(){
  const sources=[...new Set(state.all.map(x=>x.source).filter(Boolean))].sort();
  const cats=[...new Set(state.all.flatMap(x=>x.tags||[]))].sort();
  $("source").innerHTML='<option value="">Toutes les sources</option>'+sources.map(x=>`<option>${esc(x)}</option>`).join("");
  $("category").innerHTML='<option value="">Toutes les catégories</option>'+cats.map(x=>`<option>${esc(x)}</option>`).join("");
  $("stats").innerHTML=`<div class="stat"><b>${state.all.length}</b><span>extensions</span></div><div class="stat"><b>${sources.length}</b><span>sources</span></div>`;
}

function render(){
  const q=$("search").value.toLowerCase().trim(), s=$("source").value, c=$("category").value;
  state.filtered=state.all.filter(x=>
    (!q || [x.name,x.description,x.creator,x.source,...(x.tags||[])].join(" ").toLowerCase().includes(q)) &&
    (!s || x.source===s) && (!c || (x.tags||[]).includes(c))
  );
  $("count").textContent=`${state.filtered.length} extension${state.filtered.length>1?"s":""}`;
  $("empty").hidden=state.filtered.length!==0;
  $("grid").innerHTML=state.filtered.map(card).join("");
}

function card(x, index){
  const tags=(x.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
  const imageHtml = x.image ? 
    `<img src="${safeUrl(x.image)}" alt="${esc(x.name||'Extension')}" onerror="this.style.display='none'">` :
    `<div class="card-image-placeholder">🧩</div>`;
  
  return `<article class="card">
    <div class="card-image">
      ${imageHtml}
    </div>
    <div class="card-content">
      <div class="card-header">
        <h3>${esc(x.name||x.id||"Extension")}</h3>
        <span class="badge source">${esc(x.source||"Autre")}</span>
      </div>
      <div class="desc">${esc(x.description||"Extension communautaire.")}</div>
      <div class="tags">${tags}</div>
      <div class="actions">
        ${x.url?`<a class="primary" href="${safeUrl(x.url)}" target="_blank" rel="noopener">Ouvrir</a>`:""}
        ${x.codeUrl?`<button onclick="copyUrl('${attr(x.codeUrl)}')">URL</button>`:""}
        <button onclick='showDetails(${JSON.stringify(x).replace(/'/g,"&#39;")})'>Détails</button>
      </div>
    </div>
  </article>`;
}

function showDetails(x){
  const imageHtml = x.image ?
    `<div class="details-image"><img src="${safeUrl(x.image)}" alt="${esc(x.name||'Extension')}" onerror="this.style.display='none'"></div>` :
    "";
  
  $("detailsContent").innerHTML=`
    ${imageHtml}
    <p class="details-source">${esc(x.source||"Autre")}</p>
    <h2>${esc(x.name||x.id)}</h2>
    <p>${esc(x.description||"Aucune description disponible.")}</p>
    ${x.creator ? `<p><b>Créateur :</b> ${esc(x.creator)}</p>` : ""}
    ${x.updatedAt ? `<p><b>Mise à jour :</b> ${date(x.updatedAt)}</p>` : ""}
    ${x.url ? `<p><a href="${safeUrl(x.url)}" target="_blank" rel="noopener">Visiter l'extension →</a></p>` : ""}
  `;
  $("details").showModal();
}

async function copyUrl(u){
  await navigator.clipboard.writeText(u);
  $("status").textContent="URL copiée ✓";
  setTimeout(()=>loadCatalog(),1200);
}

function date(v){try{return new Date(v).toLocaleDateString("fr-FR")}catch{return ""}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function attr(s){return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'")}
function safeUrl(s){try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:"#"}catch{return "#"}}

$("search").addEventListener("input",render);
$("source").addEventListener("change",render);
$("category").addEventListener("change",render);
$("refresh").addEventListener("click",()=>loadCatalog(true));
$("close").addEventListener("click",()=>$("details").close());

loadCatalog();
