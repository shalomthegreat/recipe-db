(function (global) {
  const MODE_KEY = "storageMode";
  const DB_NAME = "recipedb";
  const STORE = "recipes";
  const DB_VERSION = 1;

  function getMode() {
    return localStorage.getItem(MODE_KEY) === "remote" ? "remote" : "local";
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode === "remote" ? "remote" : "local");
  }

  function hasChosenMode() {
    return localStorage.getItem(MODE_KEY) !== null;
  }

  function genId() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "r-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }

  function genUid() {
    return genId();
  }

  // The recipe's stable identity. A record that has been through ensureUid always
  // has a real `uid`; this is the ONLY place identity is read. There is no
  // _id-derived fallback — that produced different ids on different paths and
  // caused duplicates, so a uid-less record must be passed through ensureUid first.
  function uidOf(recipe) {
    return recipe && recipe.uid ? String(recipe.uid) : null;
  }

  // Guarantee a record has a real, persisted uid. The first path to touch a
  // uid-less recipe (legacy data) mints one canonical uuid and writes it back to
  // the given backend, so every later path agrees on one identity. Returns the
  // record with its uid set. Persisting is best-effort but, crucially, the SAME
  // uuid is used in-memory whether or not the write succeeds.
  async function ensureUid(record, be) {
    if (record && record.uid) return record;
    const uid = genUid();
    const withUid = Object.assign({}, record, { uid: uid });
    if (record && record._id != null && be.setUid) {
      // Persist only the uid, without bumping the record's modification time
      // (a backfill is not a real edit).
      try { await be.setUid(String(record._id), uid, record && record.updatedAt); } catch (e) { /* best-effort */ }
    }
    return withUid;
  }

  // Ensure a whole list of records have persisted uids (canonicalizes legacy data
  // on read). Returns the list with uids guaranteed.
  async function ensureUids(records, be) {
    const out = [];
    for (const r of records) out.push(await ensureUid(r, be));
    return out;
  }

  const CONTENT_FIELDS = ["title", "category", "tags", "author", "prep", "cook", "total", "yield", "steps", "notes", "ingredients", "credit"];

  function sameContent(a, b) {
    const proj = function (r) {
      const o = {};
      CONTENT_FIELDS.forEach(function (k) { o[k] = r[k] === undefined ? null : r[k]; });
      return JSON.stringify(o);
    };
    return proj(a) === proj(b);
  }

  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "_id" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        const r = fn(store);
        if (r) r.onsuccess = function () { result = r.result; };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  const local = {
    getAll: function () {
      return tx("readonly", function (s) { return s.getAll(); }).then(function (rows) {
        return (rows || []).sort(function (a, b) {
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });
      });
    },
    getById: function (id) {
      return tx("readonly", function (s) { return s.get(id); });
    },
    create: function (data) {
      const now = new Date().toISOString();
      const record = Object.assign({}, data, {
        _id: data._id || genId(),
        uid: data.uid || genUid(),
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      });
      return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
    },
    update: function (id, data) {
      return local.getById(id).then(function (existing) {
        const record = Object.assign({}, existing, data, { _id: id, updatedAt: new Date().toISOString() });
        return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
      });
    },
    // Partial update. Locally, update() already merges onto the existing record,
    // so a partial payload behaves identically — patch is just the explicit alias.
    patch: function (id, data) {
      return local.update(id, data);
    },
    // Backfill a uid without changing updatedAt (the record isn't really edited).
    setUid: function (id, uid) {
      return local.getById(id).then(function (existing) {
        if (!existing) return null;
        const record = Object.assign({}, existing, { uid: uid });
        return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
      });
    },
    // Full overwrite — the record is replaced as-is, so fields absent from `data`
    // are cleared (used by import "Update"). Does NOT merge with the existing row.
    replace: function (id, data) {
      const record = Object.assign({}, data, { _id: id, updatedAt: new Date().toISOString() });
      return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
    },
    remove: function (id) {
      return tx("readwrite", function (s) { return s.delete(id); }).then(function () { return true; });
    }
  };

  async function apiJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      let errorData = {};
      try { errorData = await response.json(); } catch (e) { errorData = {}; }
      let message = errorData.error || "HTTP error! Status: " + response.status;
      if (errorData.details) {
        message += ": " + Object.entries(errorData.details)
          .map(function (e) { return e[0] + " - " + e[1]; })
          .join(", ");
      }
      throw new Error(message);
    }
    return response;
  }

  const remote = {
    getAll: async function () {
      const PAGE_SIZE = 1000;
      let all = [];
      let page = 1;
      while (true) {
        const r = await apiJson("/api/recipes?page=" + page + "&limit=" + PAGE_SIZE);
        const batch = await r.json();
        if (!Array.isArray(batch) || batch.length === 0) break;
        all = all.concat(batch);
        if (batch.length < PAGE_SIZE) break;
        page++;
      }
      return all;
    },
    getById: async function (id) {
      const r = await apiJson("/api/recipes/" + id);
      return r.json();
    },
    create: async function (data) {
      const payload = Object.assign({ uid: genUid() }, data);
      const r = await apiJson("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return r.json();
    },
    update: async function (id, data) {
      const r = await apiJson("/api/recipes/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    // Partial update — only the changed fields are sent. The server PATCH
    // endpoint $sets exactly what it receives, leaving untouched fields alone.
    patch: async function (id, data) {
      const r = await apiJson("/api/recipes/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    // Backfill a uid. The server always stamps a fresh updatedAt on any update,
    // so in MongoDB mode this does bump it; we re-send the original value as a
    // best effort. (Browser mode preserves updatedAt exactly.)
    setUid: async function (id, uid, updatedAt) {
      const body = updatedAt ? { uid: uid, updatedAt: updatedAt } : { uid: uid };
      const r = await apiJson("/api/recipes/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      return r.json();
    },
    // Full overwrite via the same PUT endpoint. The server $sets whatever it's
    // given, so to actually clear a field we send every content field explicitly
    // (absent ones reset to their empty value) — fields the import omitted are
    // blanked rather than silently kept.
    replace: async function (id, data) {
      const payload = Object.assign({}, data);
      CONTENT_FIELDS.forEach(function (k) {
        if (!(k in payload)) {
          payload[k] = (k === "steps" || k === "notes" || k === "ingredients") ? [] : "";
        }
      });
      const r = await apiJson("/api/recipes/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return r.json();
    },
    remove: async function (id) {
      await apiJson("/api/recipes/" + id, { method: "DELETE" });
      return true;
    }
  };

  function backend() {
    return getMode() === "remote" ? remote : local;
  }

  async function migrateRemoteToLocal() {
    const recipes = await ensureUids(await remote.getAll(), remote);
    const localExisting = await local.getAll();
    const localByUid = new Map();
    localExisting.forEach(function (r) { if (r.uid) localByUid.set(String(r.uid), r); });
    for (const recipe of recipes) {
      // Reuse the local row's own _id when this uid already exists locally, so we
      // overwrite rather than create a second copy.
      const existing = localByUid.get(String(recipe.uid));
      const localId = existing ? String(existing._id) : String(recipe._id);
      const record = Object.assign({}, recipe, { _id: localId });
      await tx("readwrite", function (s) { return s.put(record); });
    }
    return recipes.length;
  }

  function looksLikeRecipe(r) {
    return r && typeof r === "object" && typeof r.title === "string" && r.title.trim() !== "";
  }

  async function importRecipes(incoming, askConflict) {
    // Pin the backend for the whole import so an async conflict prompt or a mode
    // change mid-import can't redirect writes to a different store.
    const be = backend();
    // Canonicalize existing recipes (give legacy rows real uids) so matching is
    // by one stable identity. `pool` grows as we add, so intra-batch duplicates
    // are caught too.
    const pool = await ensureUids(await be.getAll(), be);
    const byUid = new Map();
    pool.forEach(function (r) { if (r.uid) byUid.set(String(r.uid), r); });

    let added = 0, updated = 0, skipped = 0, invalid = 0, failed = 0;
    let applyAll = null;

    for (const raw of incoming) {
      if (!looksLikeRecipe(raw)) { invalid++; continue; }
      const rec = Object.assign({}, raw);
      const uid = rec.uid ? String(rec.uid) : null;
      let match = uid ? byUid.get(uid) : null;
      // Fallback for incoming recipes with NO uid (older uid-less exports): treat
      // an existing recipe with identical content as the same recipe. Only used
      // when incoming has no uid, so a coincidental content match can't hijack a
      // uid-identified record.
      if (!match && !uid) {
        for (const e of pool) {
          if (sameContent(e, rec)) { match = e; break; }
        }
      }

      if (!match) {
        try {
          const payload = Object.assign({}, rec);
          delete payload._id;
          if (!payload.uid) payload.uid = genUid();
          const created = await be.create(payload);
          if (created) { byUid.set(String(created.uid), created); pool.push(created); added++; }
        } catch (e) { failed++; }
        continue;
      }

      if (sameContent(match, rec)) { skipped++; continue; }

      let action = applyAll;
      if (!action) {
        const answer = await askConflict(rec, match);
        action = answer.action;
        if (answer.applyAll) applyAll = action;
      }

      // A single rejected record (e.g. the server rejecting a missing required
      // field) must not abort the rest of the import.
      try {
        if (action === "update") {
          // Faithful replace: the imported record wins wholesale, so a field the
          // file omits is actually cleared. Only the stable identity and original
          // creation time are preserved from the existing record.
          const payload = Object.assign({}, rec, { uid: String(match.uid), createdAt: match.createdAt });
          delete payload._id;
          await be.replace(String(match._id), payload);
          updated++;
        } else if (action === "add") {
          const payload = Object.assign({}, rec);
          delete payload._id;
          payload.uid = genUid();
          const created = await be.create(payload);
          if (created) { byUid.set(String(created.uid), created); pool.push(created); }
          added++;
        } else {
          skipped++;
        }
      } catch (e) { failed++; }
    }
    return { added: added, updated: updated, skipped: skipped, invalid: invalid, failed: failed };
  }

  // Find a record in `pool` that is the same recipe as `rec`. Match by uid first.
  // Only fall back to content matching when `rec` has NO uid (legacy/transitional
  // data) — never fold two records that both carry real, distinct uids, since
  // genuinely-different recipes can share identical content fields.
  function findMatch(rec, byUid, pool) {
    if (rec.uid && byUid.has(String(rec.uid))) return byUid.get(String(rec.uid));
    if (!rec.uid) {
      for (const e of pool) {
        if (!e.uid && sameContent(e, rec)) return e;
      }
    }
    return null;
  }

  async function migrateLocalToRemote() {
    const recipes = await ensureUids(await local.getAll(), local);
    const remoteRows = await ensureUids(await remote.getAll(), remote);
    const remoteByUid = new Map();
    remoteRows.forEach(function (r) { if (r.uid) remoteByUid.set(String(r.uid), r); });

    let copied = 0;
    let failed = 0;
    for (const recipe of recipes) {
      const payload = Object.assign({}, recipe, { uid: String(recipe.uid) });
      delete payload._id;
      try {
        const existing = findMatch(recipe, remoteByUid, remoteRows);
        if (existing) {
          await remote.update(String(existing._id), payload);
        } else {
          await remote.create(payload);
        }
        copied++;
      } catch (e) {
        failed++;
      }
    }
    return { copied: copied, failed: failed };
  }

  async function probeServer() {
    try {
      const recipes = await remote.getAll();
      return { available: true, count: Array.isArray(recipes) ? recipes.length : 0 };
    } catch (e) {
      return { available: false, count: 0 };
    }
  }

  function localCount() {
    return local.getAll().then(function (rows) { return rows.length; });
  }

  function stamp(r) {
    const t = Date.parse(r.updatedAt || r.createdAt || "");
    return isNaN(t) ? null : t;
  }

  // Pick the record to keep when the same uid exists on both sides.
  // Identical content -> either is fine. Otherwise prefer the one with the
  // newer parseable timestamp; if timestamps are missing/equal and the content
  // differs, keep `a` (the side already in the map) rather than guessing — this
  // avoids silently overwriting a good copy with an equally-plausible one.
  function newer(a, b) {
    if (sameContent(a, b)) return a;
    const ta = stamp(a);
    const tb = stamp(b);
    if (ta !== null && tb !== null && ta !== tb) return ta > tb ? a : b;
    return a;
  }

  async function mergeBothWays() {
    // Canonicalize both sides first so every record has a real, persisted uid —
    // no _id-derived ids that disagree across stores.
    const localRows = await ensureUids(await local.getAll(), local);
    const remoteRows = await ensureUids(await remote.getAll(), remote);

    const remoteByUid = new Map();
    remoteRows.forEach(function (r) { remoteByUid.set(String(r.uid), r); });
    const localByUid = new Map();
    localRows.forEach(function (r) { localByUid.set(String(r.uid), r); });

    // Build the unified set keyed by uid. Because both sides were canonicalized
    // (every record has a real persisted uid), matching is purely by uid — we do
    // NOT fold by content, since two genuinely-different recipes can share the
    // same content fields and must not be collapsed.
    const map = new Map();
    function place(r) {
      const key = String(r.uid);
      map.set(key, map.has(key) ? newer(map.get(key), r) : r);
    }
    localRows.forEach(place);
    remoteRows.forEach(place);
    const merged = Array.from(map.values());

    let syncedToServer = 0;
    let serverFailed = 0;
    for (const rec of merged) {
      const payload = Object.assign({}, rec);
      delete payload._id;
      let serverOk = true;
      try {
        const existingRemote = remoteByUid.get(String(rec.uid));
        if (existingRemote) {
          await remote.update(String(existingRemote._id), payload);
        } else {
          await remote.create(payload);
        }
        syncedToServer++;
      } catch (e) {
        serverOk = false;
        serverFailed++;
      }
      // Only overwrite the local copy once the server side is in sync; on server
      // failure leave the existing local record untouched so nothing is lost.
      if (serverOk) {
        const existingLocal = localByUid.get(String(rec.uid));
        const localId = existingLocal ? String(existingLocal._id) : (rec._id ? String(rec._id) : genId());
        const localRec = Object.assign({}, rec, { _id: localId });
        await tx("readwrite", function (s) { return s.put(localRec); });
      }
    }
    return { total: merged.length, syncedToServer: syncedToServer, serverFailed: serverFailed };
  }

  // Return every recipe with a real uid guaranteed, using the same canonical
  // backfill as every other path — so an exported file is de-duplicatable on
  // re-import and its uids agree with what copy/sync will use.
  async function exportAll() {
    const be = backend();
    return ensureUids(await be.getAll(), be);
  }

  global.Storage = {
    getMode: getMode,
    setMode: setMode,
    hasChosenMode: hasChosenMode,
    getAll: function () { return backend().getAll(); },
    getById: function (id) { return backend().getById(id); },
    create: function (data) { return backend().create(data); },
    update: function (id, data) { return backend().update(id, data); },
    patch: function (id, data) { return backend().patch(id, data); },
    remove: function (id) { return backend().remove(id); },
    migrateRemoteToLocal: migrateRemoteToLocal,
    migrateLocalToRemote: migrateLocalToRemote,
    mergeBothWays: mergeBothWays,
    importRecipes: importRecipes,
    exportAll: exportAll,
    probeServer: probeServer,
    localCount: localCount
  };
})(window);
