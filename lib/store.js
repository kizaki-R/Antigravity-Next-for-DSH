import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";

async function homePath(...segments) {
  try { const mod = await import("@deepseek-ai/dsh-home-paths"); if (typeof mod.dshHomePath === "function") return mod.dshHomePath(...segments); } catch {}
  return join(process.env.DSH_HOME?.trim() || join(homedir(), ".dsh"), ...segments);
}
export async function credentialPath(override = "") { return override?.trim() || process.env.AGY_NEXT_CREDENTIAL_PATH?.trim() || homePath("storages", "agy-next-oauth.json"); }
export async function legacyCredentialPath() { return homePath("storages", "antigravity-oauth.json"); }
const record = (x) => typeof x === "object" && x !== null && !Array.isArray(x);
const flat = (a) => a && ({ email:a.email, refresh:a.refresh, access:a.access, expires:a.expires, projectId:a.projectId, addedAt:a.addedAt, ...(a.stale !== undefined ? {stale:a.stale}:{}), ...(a.exhausted !== undefined ? {exhausted:a.exhausted}:{}) });
export function normalizeCredential(raw) {
  if (!record(raw)) return undefined;
  if (Array.isArray(raw.accounts)) { const active=raw.accounts.find(a=>record(a)&&a.id===raw.activeId)??raw.accounts.find(record); return active ? flat(active) : undefined; }
  return flat(raw);
}
export function needsRefresh(c) { return !c?.access || !c.expires || c.expires <= Date.now()+60_000; }
export class CredentialStore {
  #file; #explicit; #chain=Promise.resolve();
  constructor(file="") { this.#explicit=file?.trim()||""; this.#file=this.#explicit||undefined; }
  async path(){ if(!this.#file)this.#file=await credentialPath(); return this.#file; }
  pathSync(){return this.#file;}
  async #raw(){try{return JSON.parse(await readFile(await this.path(),"utf8"));}catch(e){if(e?.code==="ENOENT")return undefined;throw e;}}
  async #legacy(){try{return JSON.parse(await readFile(await legacyCredentialPath(),"utf8"));}catch{return undefined;}}
  async readBook(){let raw=await this.#raw(); if(!raw){const legacy=normalizeCredential(await this.#legacy()); if(!legacy)return undefined; raw={version:2,activeId:randomUUID(),accounts:[{id:randomUUID(),...legacy}],autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null}; raw.activeId=raw.accounts[0].id; await this.writeBook(raw);} if(Array.isArray(raw.accounts)) return {...raw,accounts:raw.accounts.filter(record)}; const c=normalizeCredential(raw); if(!c)return undefined; const a={id:randomUUID(),...c}; const book={version:2,activeId:a.id,accounts:[a],autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null}; await this.writeBook(book); return book; }
  async read(){const b=await this.readBook(); return flat(b?.accounts.find(a=>a.id===b.activeId)??b?.accounts[0]);}
  async readOrImport(){return this.read();}
  async writeBook(book){const file=await this.path();await mkdir(dirname(file),{recursive:true});const temp=`${file}.tmp`;await writeFile(temp,JSON.stringify(book,null,2),{mode:0o600});await rename(temp,file);}
  async write(c){return this.modifyBook(b=>{if(!b)return undefined;const a=b.accounts.find(x=>x.id===b.activeId)??b.accounts[0];if(!a)return undefined;Object.assign(a,c);return b;});}
  modifyBook(fn){const next=(async()=>{await this.#chain.catch(()=>{});const cur=await this.readBook();const updated=await fn(cur);if(updated!==undefined)await this.writeBook(updated);return updated??cur;})();this.#chain=next.catch(()=>{});return next;}
  modify(fn){return this.#chain.then(async()=>{const cur=await this.read();const updated=await fn(cur);if(updated!==undefined)await this.write(updated);return updated??cur;});}
  async addAccount(c){return this.modifyBook(b=>{b??={version:2,accounts:[],activeId:null,autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null};const a={id:randomUUID(),...c};b.accounts.push(a);b.activeId=a.id;return b;});}
  async delete(){await this.#chain.catch(()=>{});try{await unlink(await this.path());}catch(e){if(e?.code!=="ENOENT")throw e;}}
}
export function joinPath(...segments){return join(...segments);}
