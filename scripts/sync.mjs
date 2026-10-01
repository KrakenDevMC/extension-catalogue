import fs from "node:fs/promises";

const GH = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";
const headers = {
  "Accept": "application/vnd.github+json",
  "User-Agent": "Extension-Hub-Sync/1.0"
};

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
function strip(v){ return String(v ?? "").replace(/^["'`]|["'`]$/g,"").trim(); }
function pick(src, key) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  return src.match(re)?.[1] || "";
}
function tags(name, desc="") {
  const s=(name+" "+desc).toLowerCase();
  const out=[];
  const map={graphics:["graphics","canvas","3d","pen"],audio:["audio","sound","music","tts"],network:["network","http","websocket","cloud"],files:["file","zip","storage","indexeddb"],game:["game","physics","gamepad"],utility:["util","math","json","xml","encoding"],web:["html","iframe","browser","web"],input:["keyboard","mouse","camera","input"]};
  for (const [tag,words] of Object.entries(map)) if(words.some(w=>s.includes(w))) out.push(tag);
  return out.length?out:["other"];
}

async function turboWarp() {
  const list=await raw(`${RAW}/TurboWarp/extensions/master/extensions/extensions.json`);
  const paths=[...list.matchAll(/"([^"]+)"/g)].map(m=>m[1]).filter(x=>x && !x.startsWith("//"));
  return (await Promise.all(paths.map(async p=>{
    try {
      const code=await raw(`${RAW}/TurboWarp/extensions/master/extensions/${p}.js`);
      const name=pick(code,"name") || p.split("/").pop().replace(/[-_]/g," ");
      const creator=p.includes("/")?p.split("/")[0]:"TurboWarp";
      return {id:`turbowarp:${p}`,name,description:"Extension de la galerie TurboWarp.",creator,source:"TurboWarp",tags:tags(name),codeUrl:`${RAW}/TurboWarp/extensions/master/extensions/${p}.js`,url:`https://extensions.turbowarp.org/`};
    } catch { return null; }
  }))).filter(Boolean);
}

async function penguinMod() {
  const code=await raw(`${RAW}/PenguinMod/PenguinMod-ExtensionsGallery/main/src/lib/extensions.js`);
  const out=[]; 
  const re=/name:\s*["'`]([^"'`]+)["'`][\s\S]{0,900}?description:\s*["'`]([^"'`]*)["'`][\s\S]{0,900}?code:\s*["'`]([^"'`]+)["'`]/g;
  for(const m of code.matchAll(re)){
    const [,name,description,codePath]=m;
    const creator=codePath.split("/")[0];
    out.push({id:`penguinmod:${codePath}`,name,description,creator,source:"PenguinMod",tags:tags(name,description),codeUrl:`${RAW}/PenguinMod/PenguinMod-ExtensionsGallery/main/static/extensions/${codePath}`,url:"https://extensions.penguinmod.com/"});
  }
  return out;
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
      const name=pick(code,"name") || p.split("/").pop().replace(/\.js$/,"");
      const desc=pick(code,"description");
      return {id:`sharkpool:${p}`,name,description:desc||"Extension de la collection SharkPool.",creator:"SharkPool / communauté",source:"SharkPool",tags:tags(name,desc),codeUrl:`${RAW}/SharkPool-SP/SharkPools-Extensions/master/${p}`,url:"https://sharkpools-extensions.vercel.app/"};
    } catch { return null; }
  }))).filter(Boolean);
}

async function mistium() {
  const paths=await githubTree("Mistium","extensions.mistium","master").catch(()=>[]);
  const js=paths.filter(p=>p.endsWith(".js") && !p.includes("node_modules"));
  return (await Promise.all(js.map(async p=>{
    try {
      const code=await raw(`${RAW}/Mistium/extensions.mistium/master/${p}`);
      const name=pick(code,"name") || p.split("/").pop().replace(/\.js$/,"").replace(/[-_]/g," ");
      const desc=pick(code,"description");
      return {id:`mistium:${p}`,name,description:desc||"Extension de Mistium.",creator:"Mistium",source:"Mistium",tags:tags(name,desc),codeUrl:`${RAW}/Mistium/extensions.mistium/master/${p}`,url:"https://extensions.mistium.com/"};
    } catch { return null; }
  }))).filter(Boolean);
}

const results=[];
for (const fn of [turboWarp,penguinMod,sharkPool,mistium]) {
  try { const x=await fn(); results.push(...x); console.log(`OK ${fn.name}: ${x.length}`); }
  catch(e){ console.error(`Source ${fn.name} ignorée:`,e.message); }
}
const seen=new Set(), extensions=results.filter(x=>!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>a.name.localeCompare(b.name));
await fs.mkdir("data",{recursive:true});
await fs.writeFile("data/catalog.json",JSON.stringify({generatedAt:new Date().toISOString(),extensions},null,2)+"\n");
console.log(`Catalogue: ${extensions.length} extensions`);
