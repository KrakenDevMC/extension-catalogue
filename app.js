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
    $("status").style.color = "#4db84d";
  } catch (e) {
    $("status").textContent = "Erreur de synchronisation";
    $("status").style.color = "#ff6680";
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

function getCardGradient(index) {
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
  ];
  return gradients[index % gradients.length];
}

function card(x, index){
  const tags=(x.tags||[]).slice(0,3).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
  const imageHtml = x.image ? 
    `<img src="${safeUrl(x.image)}" alt="${esc(x.name||'Extension')}" onerror="this.style.display='none'">` :
    `<div class="card-image-placeholder">🧩</div>`;
  
  return `<article class="card">
    <div class="card-image" style="${x.image ? '' : `background: ${getCardGradient(index)};`}">
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
        ${x.codeUrl?`<button onclick="copyUrl('${attr(x.codeUrl)}')">Copier URL</button>`:""}
        <button onclick='showDetails(${JSON.stringify(x).replace(/'/g,"&#39;")})'>Détails</button>
      </div>
    </div>
  </article>`;
}

function showDetails(x){
  const imageHtml = x.image ?
    `<div style="width: 100%; height: 200px; border-radius: 8px; margin-bottom: 16px; overflow: hidden; border: 2px solid #e0e0e0;"><img src="${safeUrl(x.image)}" alt="${esc(x.name||'Extension')}" style="width: 100%; height: 100%; object-fit: cover;"></div>` :
    "";
  
  $("detailsContent").innerHTML=`
    ${imageHtml}
    <p class="details-source">${esc(x.source||"Autre")}</p>
    <h2>${esc(x.name||x.id)}</h2>
    <p>${esc(x.description||"Aucune description disponible.")}</p>
    ${x.creator ? `<p><b>Créateur :</b> ${esc(x.creator)}</p>` : ""}
    ${x.updatedAt ? `<p><b>Dernière mise à jour :</b> ${date(x.updatedAt)}</p>` : ""}
    ${x.url ? `<p><b><a href="${safeUrl(x.url)}" target="_blank" rel="noopener" style="color: #4c97ff;">Visiter l'extension →</a></b></p>` : ""}
  `;
  $("details").showModal();
}

async function copyUrl(u){
  await navigator.clipboard.writeText(u);
  $("status").textContent="URL copiée ✓";
  $("status").style.color = "#4db84d";
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
