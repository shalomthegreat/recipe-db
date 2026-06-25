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
      const record = Object.assign({}, data, { _id: data._id || genId(), createdAt: now, updatedAt: now });
      return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
    },
    update: function (id, data) {
      return local.getById(id).then(function (existing) {
        const record = Object.assign({}, existing, data, { _id: id, updatedAt: new Date().toISOString() });
        return tx("readwrite", function (s) { return s.put(record); }).then(function () { return record; });
      });
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
      const r = await apiJson("/api/recipes");
      return r.json();
    },
    getById: async function (id) {
      const r = await apiJson("/api/recipes/" + id);
      return r.json();
    },
    create: async function (data) {
      const r = await apiJson("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
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
    remove: async function (id) {
      await apiJson("/api/recipes/" + id, { method: "DELETE" });
      return true;
    }
  };

  function backend() {
    return getMode() === "remote" ? remote : local;
  }

  async function migrateRemoteToLocal() {
    const recipes = await remote.getAll();
    for (const recipe of recipes) {
      const record = Object.assign({}, recipe, { _id: String(recipe._id) });
      await tx("readwrite", function (s) { return s.put(record); });
    }
    return recipes.length;
  }

  async function migrateLocalToRemote() {
    const recipes = await local.getAll();
    for (const recipe of recipes) {
      const payload = Object.assign({}, recipe);
      delete payload._id;
      await remote.create(payload);
    }
    return recipes.length;
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

  function newer(a, b) {
    return (a.updatedAt || a.createdAt || "") >= (b.updatedAt || b.createdAt || "") ? a : b;
  }

  async function mergeBothWays() {
    const localRows = await local.getAll();
    const remoteRows = await remote.getAll();
    const map = new Map();
    localRows.forEach(function (r) { map.set(String(r._id), Object.assign({}, r, { _id: String(r._id) })); });
    remoteRows.forEach(function (r) {
      const id = String(r._id);
      const rec = Object.assign({}, r, { _id: id });
      map.set(id, map.has(id) ? newer(map.get(id), rec) : rec);
    });
    const merged = Array.from(map.values());

    const remoteIds = new Set(remoteRows.map(function (r) { return String(r._id); }));
    let syncedToServer = 0;
    let serverFailed = 0;
    for (const rec of merged) {
      await tx("readwrite", function (s) { return s.put(rec); });
      const payload = Object.assign({}, rec);
      const id = payload._id;
      delete payload._id;
      try {
        if (remoteIds.has(id)) {
          await remote.update(id, payload);
        } else {
          await remote.create(Object.assign({ _id: id }, payload));
        }
        syncedToServer++;
      } catch (e) {
        serverFailed++;
      }
    }
    return { total: merged.length, syncedToServer: syncedToServer, serverFailed: serverFailed };
  }

  global.Storage = {
    getMode: getMode,
    setMode: setMode,
    hasChosenMode: hasChosenMode,
    getAll: function () { return backend().getAll(); },
    getById: function (id) { return backend().getById(id); },
    create: function (data) { return backend().create(data); },
    update: function (id, data) { return backend().update(id, data); },
    remove: function (id) { return backend().remove(id); },
    migrateRemoteToLocal: migrateRemoteToLocal,
    migrateLocalToRemote: migrateLocalToRemote,
    mergeBothWays: mergeBothWays,
    probeServer: probeServer,
    localCount: localCount
  };
})(window);
