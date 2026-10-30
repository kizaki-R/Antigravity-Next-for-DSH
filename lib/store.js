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
const flat = (a) => a && ({ ...(a.id !== undefined && a.id !== null ? {id:a.id} : {}), email:a.email, refresh:a.refresh, access:a.access, expires:a.expires, projectId:a.projectId, addedAt:a.addedAt, ...(a.importedFrom ? {importedFrom:a.importedFrom} : {}), ...(a.clientRecorded !== undefined ? {clientRecorded:a.clientRecorded} : {}), ...(a.stale !== undefined ? {stale:a.stale}:{}), ...(a.exhausted !== undefined ? {exhausted:a.exhausted}:{}) });
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
  async readBook(){
    let raw=await this.#raw();
    if(!raw){
      const legacyRaw=await this.#legacy();
      if(!legacyRaw)return undefined;
      let accounts=[];
      let activeId=null;
      if (Array.isArray(legacyRaw.accounts) && legacyRaw.accounts.length > 0) {
        accounts = legacyRaw.accounts.filter(record).map(a => ({
          id: a.id || randomUUID(),
          ...flat(a),
          importedFrom: "dsh-antigravity",
        }));
        activeId = accounts.find(a => a.id === legacyRaw.activeId)?.id || accounts[0]?.id;
      } else {
        const legacy = normalizeCredential(legacyRaw);
        if(!legacy)return undefined;
        accounts = [{id:randomUUID(),...legacy,importedFrom:"dsh-antigravity"}];
        activeId = accounts[0].id;
      }
      raw={version:2,activeId,accounts,autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null};
      await this.writeBook(raw);
    }
    if(Array.isArray(raw.accounts)) return {...raw,accounts:raw.accounts.filter(record)};
    const c=normalizeCredential(raw);
    if(!c)return undefined;
    const a={id:randomUUID(),...c};
    const book={version:2,activeId:a.id,accounts:[a],autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null};
    await this.writeBook(book);
    return book;
  }
  async syncLegacyAccounts(){
    const legacyRaw=await this.#legacy();
    if(!legacyRaw||!Array.isArray(legacyRaw.accounts))return 0;
    let added=0;
    await this.modifyBook((book)=>{
      if(!book||!Array.isArray(book.accounts))return book;
      const existing=new Set(book.accounts.map(a=>a.email).filter(Boolean));
      for(const a of legacyRaw.accounts){
        if(record(a)&&a.email&&!existing.has(a.email)){
          book.accounts.push({id:a.id||randomUUID(),...flat(a),importedFrom:"dsh-antigravity"});
          existing.add(a.email);
          added++;
        }
      }
      return book;
    });
    return added;
  }
  /**
   * Was this account imported from the official plugin's file?
   *
   * The import used to leave no trace, so an imported login looked identical to
   * one made here — and because the imported file carries refresh tokens but no
   * OAuth client, the settings page showed "signed in" beside "no OAuth client"
   * with nothing explaining the pair. `importedFrom` marks new imports; older
   * ones are recognised by the absence of `clientRecorded`, which every login
   * performed here sets because it must supply a client first.
   */
  static isImported(account){
    if(!account) return false;
    if(account.importedFrom) return true;
    return account.refresh !== undefined && account.clientRecorded !== true;
  }
  async read(){const b=await this.readBook(); return flat(b?.accounts.find(a=>a.id===b.activeId)??b?.accounts[0]);}
  // Public, read-only view of the official plugin's file. `readBook` imports it
  // on first use, which writes agy-next's own file; `--status` must not migrate
  // anything, so it asks for the legacy record directly.
  async readLegacy(){return normalizeCredential(await this.#legacy());}
  // Reads agy-next's own file without importing a legacy login. Used by
  // `--status`, which reports state instead of changing it: `readBook` would
  // migrate the official plugin's credential as a side effect.
  async peek(){
    const raw=await this.#raw();
    if(!raw)return undefined;
    if(Array.isArray(raw.accounts)){
      const accounts=raw.accounts.filter(record);
      return flat(accounts.find(a=>a.id===raw.activeId)??accounts[0]);
    }
    return flat(raw);
  }
  async readOrImport(){return this.read();}
  async writeBook(book){
    const file=await this.path();
    await mkdir(dirname(file),{recursive:true});
    // Per-write unique temp name: a shared `.tmp` lets two overlapping writers
    // rename each other's file and lose an account update.
    const temp=`${file}.${process.pid}.${randomUUID()}.tmp`;
    try{
      await writeFile(temp,JSON.stringify(book,null,2),{mode:0o600});
      await rename(temp,file);
    }catch(error){
      await unlink(temp).catch(()=>{});
      throw error;
    }
  }
  /**
   * Upsert a credential without retargeting an in-flight refresh after an account
   * switch. Prefer the captured account id; legacy callers without an id update
   * only the account that is active when the serialized mutation runs.
   */
  async write(c){
    let written = false;
    await this.modifyBook(b=>{
      if(!b){
        const a={id:c.id??c.email??randomUUID(),...c};
        written = true;
        return {version:2,accounts:[a],activeId:a.id,autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null};
      }
      b.accounts ??= [];
      const hasTargetId = c.id !== undefined && c.id !== null;
      let a = hasTargetId ? b.accounts.find(x => x.id === c.id) : undefined;
      if (!a && !hasTargetId) a = b.accounts.find(x=>x.id===b.activeId)??b.accounts[0];
      if (!a && hasTargetId) {
        // A credential captured before an asynchronous refresh must not be
        // retargeted to the now-active account or resurrect after logout.
        return b;
      }
      if(!a){
        const created={...c,id:c.id??c.email??randomUUID()};
        b.accounts.push(created);
        b.activeId=created.id;
        written = true;
        return b;
      }
      Object.assign(a,c);
      written = true;
      return b;
    });
    return written;
  }
  #chainUpdate(fn){const next=(async()=>{await this.#chain.catch(()=>{});const cur=await this.readBook();const updated=await fn(cur);if(updated!==undefined)await this.writeBook(updated);return updated??cur;})();this.#chain=next.catch(()=>{});return next;}
  /** The one serialized read-modify-write used by every caller. */
  modifyBook(fn){return this.#chainUpdate(fn);}
  /** Mutate one captured account without retargeting after an active-account switch. */
  async modifyAccount(id, fn){
    if (id === undefined || id === null) return false;
    let modified = false;
    await this.#chainUpdate(async(book)=>{
      const account = book?.accounts?.find(item => item.id === id);
      if (!account) return undefined;
      const before = JSON.stringify(account);
      const changed = await fn(account, book);
      if (changed === false) return undefined;
      modified = JSON.stringify(account) !== before;
      return modified ? book : undefined;
    });
    return modified;
  }
  /** Remove one account atomically, preserving the rest of the book and preferences. */
  async removeAccount(id){
    if (id === undefined || id === null) return false;
    let removed = false;
    const next = (async()=>{
      await this.#chain.catch(()=>{});
      const book = await this.readBook();
      if (!book?.accounts?.length) return book;
      const index = book.accounts.findIndex(item => item.id === id);
      if (index < 0) return book;
      book.accounts.splice(index, 1);
      removed = true;
      if (book.activeId === id) book.activeId = book.accounts[0]?.id ?? null;
      if (book.accounts.length) await this.writeBook(book);
      else {
        try { await unlink(await this.path()); }
        catch (error) { if (error?.code !== "ENOENT") throw error; }
      }
      return book;
    })();
    this.#chain = next.catch(()=>{});
    await next;
    return removed;
  }
  /** Update the active account through the same serialized write path. */
  modify(fn){return this.modifyBook(async(b)=>{
    if(!b)return undefined;
    const active=b.accounts.find(a=>a.id===b.activeId)??b.accounts[0];
    const patch=await fn(flat(active));
    if(patch&&typeof patch==="object")Object.assign(active,patch);
    return b;
  });}
  async addAccount(c){return this.modifyBook(b=>{b??={version:2,accounts:[],activeId:null,autoSwitch:{enabled:false,thresholdPct:80},visibleModels:null};const a={id:randomUUID(),...c};b.accounts.push(a);b.activeId=a.id;return b;});}
  async delete(){
    const next=(async()=>{
      await this.#chain.catch(()=>{});
      try{await unlink(await this.path());}catch(e){if(e?.code!=="ENOENT")throw e;}
    })();
    this.#chain=next.catch(()=>{});
    await next;
  }
}
export function joinPath(...segments){return join(...segments);}
