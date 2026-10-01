import fs from "node:fs/promises";

const GH = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "Extension-Hub-Sync/1.0"
};

function looksLikeCodeName(value) {
  if (typeof value !== "string") return true;
  const name = value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!name || name.length > 120) return true;
  if (/[{};]/.test(name)) return true;
  if (/\$\{/.test(name)) return true;
  if (/\bif\s*\(/i.test(name)) return true;
  if (/\breturn\b/i.test(name)) return true;
  if (/===|==/.test(name)) return true;
  if (/\bname\b\s*(===|==)/i.test(name)) return true;
  return false;
}

function sanitizeName(value) {
  const raw = String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (!raw || looksLikeCodeName(raw)) return "";
  return raw.replace(/^['"`]+|['"`]+$/g, "").trim();
}

async function get(url) {
  const r = await fetch(url, {headers});
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function raw(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
function strip(v){ return String(v ?? "").replace(/^['"`]|['"`]$/g,"").trim(); }
function pick(src, key) {
  const re = new RegExp(`${key}\\s*(?::|=)\\s*['"\`]([^'"\`\\n]+)['"\`]`, "gi");
  const matches = [...src.matchAll(re)];
  for (const match of matches) {
    const value = sanitizeName(match[1]);
    if (value) return value;
  }
  return "";
}
function tags(name, desc="") {
  const s=(name+" "+desc).toLowerCase();
  const out=[];
  const map={graphics:["graphics","canvas","3d","pen"],audio:["audio","sound","music","tts"],network:["network","http","websocket","cloud"],files:["file","zip","storage","indexeddb"],game:["game","physics","sprite"],ui:["ui","button","dialog","menu"],data:["data","variable","list","string"],extension:["extension"]};
  for (const [tag,words] of Object.entries(map)) if(words.some(w=>s.includes(w))) out.push(tag);
  return out.length?out:["other"];
}

async function turboWarp() {
  const list=await raw(`${RAW}/TurboWarp/extensions/master/extensions/extensions.json`);
  const paths=[...list.matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(x=>x && !x.startsWith("//"));
  return (await Promise.all(paths.map(async p=>{
    try {
      const code=await raw(`${RAW}/TurboWarp/extensions/master/extensions/${p}.js`);
      let name = pick(code,"name");
      if (!name) name = p.split("/").pop().replace(/[-_]/g," ");
      name = sanitizeName(name);
      if (!name) return null;
      const creator=p.includes("/")?p.split("/")[0]:"TurboWarp";
      return {id:`turbowarp:${p}`,name,description:"Extension de la galerie TurboWarp.",creator,source:"TurboWarp",tags:tags(name),codeUrl:`${RAW}/TurboWarp/extensions/master/extensions/${p}.js`,url:"https://turbowarp.org"};
    } catch { return null; }
  }))).filter(Boolean);
}

async function penguinMod() {
  const code=await raw(`${RAW}/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js`);
  const out=[]; 
  const re=/name:\s*["'`]([^"'`]+)["'`][\s\S]{0,900}?description:\s*["'`]([^"'`]*)["'`][\s\S]{0,900}?code:\s*["'`]([^"'`]+)["'`]/g;
  for(const m of code.matchAll(re)){
    const [,name,description,codePath]=m;
    const cleanName = sanitizeName(name);
    if (!cleanName) continue;
    const creator=codePath.split("/")[0];
    out.push({id:`penguinmod:${codePath}`,name:cleanName,description,creator,source:"PenguinMod",tags:tags(cleanName,description),codeUrl:`${RAW}/PenguinMod/PenguinMod-ExtensionsGallery/main/static/${codePath}`,url:"https://penguinmod.com"});
  }
  return out;
}

async function penguinModEditor() {
  try {
    const indexCode = await raw(`${RAW}/PenguinMod/PenguinMod/main/editor/extensions/index.js`);
    const out = [];
    
    // Parse les extensions du fichier index
    const re = /import\s+(?:{[^}]*}|\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g;
    const imports = [];
    let match;
    while ((match = re.exec(indexCode)) !== null) {
      imports.push(match[1]);
    }
    
    // Récupère les extensions via le fichier d'index
    for (const imp of imports) {
      try {
        const extCode = await raw(`${RAW}/PenguinMod/PenguinMod/main/editor/extensions/${imp}.js`).catch(() => "");
        if (!extCode) continue;
        
        let name = pick(extCode, "name");
        if (!name) name = imp.replace(/[-_]/g, " ");
        name = sanitizeName(name);
        if (!name) continue;
        
        const desc = pick(extCode, "description");
        out.push({
          id: `penguinmod-editor:${imp}`,
          name,
          description: desc || "Extension de l'éditeur PenguinMod.",
          creator: "PenguinMod",
          source: "PenguinMod Editor",
          tags: tags(name, desc),
          codeUrl: `${RAW}/PenguinMod/PenguinMod/main/editor/extensions/${imp}.js`,
          url: "https://penguinmod.com"
        });
      } catch (e) {
        // Ignore les extensions qui ne peuvent pas être lues
      }
    }
    return out;
  } catch (e) {
    console.error("Erreur lors de la lecture de PenguinMod Editor:", e.message);
    return [];
  }
}

async function githubTree(owner,repo,branch="master") {
  const data=await get(`${GH}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  return data.tree.filter(x=>x.type==="blob").map(x=>x.path);
}

async function sharkPool() {
  const paths=await githubTree("SharkPool-SP","SharkPools-Extensions","master");
  const js=paths.filter(p=>/^extension-code\/.*\.js$/i.test(p));
  return (await Promise.all(js.map(async p=>{
    try {
      const code=await raw(`${RAW}/SharkPool-SP/SharkPools-Extensions/master/${p}`);
      let name = pick(code,"name");
      if (!name) name = p.split("/").pop().replace(/\.js$/,"");
      name = sanitizeName(name);
      if (!name) return null;
      const desc=pick(code,"description");
      return {id:`sharkpool:${p}`,name,description:desc||"Extension de la collection SharkPool.",creator:"SharkPool / communauté",source:"SharkPool",tags:tags(name,desc),codeUrl:`${RAW}/SharkPool-SP/SharkPools-Extensions/master/${p}`,url:"https://sharkpool.tk"};
    } catch { return null; }
  }))).filter(Boolean);
}

async function mistium() {
  const paths=await githubTree("Mistium","extensions.mistium","master").catch(()=>[]);
  const js=paths.filter(p=>p.endsWith(".js") && !p.includes("node_modules"));
  return (await Promise.all(js.map(async p=>{
    try {
      const code=await raw(`${RAW}/Mistium/extensions.mistium/master/${p}`);
      let name = pick(code,"name");
      if (!name) name = p.split("/").pop().replace(/\.js$/,"").replace(/[-_]/g," ");
      name = sanitizeName(name);
      if (!name) return null;
      const desc=pick(code,"description");
      return {id:`mistium:${p}`,name,description:desc||"Extension de Mistium.",creator:"Mistium",source:"Mistium",tags:tags(name,desc),codeUrl:`${RAW}/Mistium/extensions.mistium/master/${p}`,url:"https://mistium.com"};
    } catch { return null; }
  }))).filter(Boolean);
}

async function turboWarpCommunity() {
  try {
    const paths = await githubTree("TurboWarp", "community-extensions", "master");
    const js = paths.filter(p => p.endsWith(".js") && !p.includes("node_modules"));
    return (await Promise.all(js.map(async p => {
      try {
        const code = await raw(`${RAW}/TurboWarp/community-extensions/master/${p}`);
        let name = pick(code, "name");
        if (!name) name = p.split("/").pop().replace(/\.js$/, "").replace(/[-_]/g, " ");
        name = sanitizeName(name);
        if (!name) return null;
        const desc = pick(code, "description");
        const creator = p.includes("/") ? p.split("/")[0] : "TurboWarp Community";
        return {
          id: `turbowarp-community:${p}`,
          name,
          description: desc || "Extension communautaire TurboWarp.",
          creator,
          source: "TurboWarp Community",
          tags: tags(name, desc),
          codeUrl: `${RAW}/TurboWarp/community-extensions/master/${p}`,
          url: "https://turbowarp.org"
        };
      } catch { return null; }
    }))).filter(Boolean);
  } catch (e) {
    console.error("Erreur TurboWarp Community:", e.message);
    return [];
  }
}

async function fetchExtensions() {
  try {
    const paths = await githubTree("Fetch-fetch", "Extensions", "main");
    const js = paths.filter(p => p.endsWith(".js") && !p.includes("node_modules"));
    return (await Promise.all(js.map(async p => {
      try {
        const code = await raw(`${RAW}/Fetch-fetch/Extensions/main/${p}`);
        let name = pick(code, "name");
        if (!name) name = p.split("/").pop().replace(/\.js$/, "").replace(/[-_]/g, " ");
        name = sanitizeName(name);
        if (!name) return null;
        const desc = pick(code, "description");
        return {
          id: `fetch:${p}`,
          name,
          description: desc || "Extension Fetch.",
          creator: "Fetch",
          source: "Fetch",
          tags: tags(name, desc),
          codeUrl: `${RAW}/Fetch-fetch/Extensions/main/${p}`,
          url: "https://fetchcrm.com"
        };
      } catch { return null; }
    }))).filter(Boolean);
  } catch (e) {
    console.error("Erreur Fetch Extensions:", e.message);
    return [];
  }
}

async function limeExtensions() {
  try {
    const paths = await githubTree("LimE-Modifier", "lime-extensions", "main");
    const js = paths.filter(p => p.endsWith(".js") && !p.includes("node_modules"));
    return (await Promise.all(js.map(async p => {
      try {
        const code = await raw(`${RAW}/LimE-Modifier/lime-extensions/main/${p}`);
        let name = pick(code, "name");
        if (!name) name = p.split("/").pop().replace(/\.js$/, "").replace(/[-_]/g, " ");
        name = sanitizeName(name);
        if (!name) return null;
        const desc = pick(code, "description");
        return {
          id: `lime:${p}`,
          name,
          description: desc || "Extension Lime.",
          creator: "LimE-Modifier",
          source: "Lime",
          tags: tags(name, desc),
          codeUrl: `${RAW}/LimE-Modifier/lime-extensions/main/${p}`,
          url: "https://github.com/LimE-Modifier/lime-extensions"
        };
      } catch { return null; }
    }))).filter(Boolean);
  } catch (e) {
    console.error("Erreur Lime Extensions:", e.message);
    return [];
  }
}

const results=[];
for (const fn of [turboWarp, penguinMod, penguinModEditor, sharkPool, mistium, turboWarpCommunity, fetchExtensions, limeExtensions]) {
  try { 
    const x = await fn(); 
    results.push(...x); 
    console.log(`OK ${fn.name}: ${x.length}`); 
  }
  catch(e){ 
    console.error(`Source ${fn.name} ignorée:`, e.message); 
  }
}
const seen=new Set(), extensions=results
  .filter(x => x && x.name && !looksLikeCodeName(x.name))
  .filter(x=>!seen.has(x.id)&&seen.add(x.id))
  .sort((a,b)=>a.name.localeCompare(b.name));
await fs.mkdir("data",{recursive:true});
await fs.writeFile("data/catalog.json",JSON.stringify({generatedAt:new Date().toISOString(),extensions},null,2)+"\n");
console.log(`Catalogue: ${extensions.length} extensions`);
