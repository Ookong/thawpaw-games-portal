/**
 * ☁️ TPG Cloud Sync — cloud-sync.js
 * Auto-sync game saves to TPG HQ Cloudflare Worker + KV
 *
 * API:
 *   cloudSync.register(id, nickname)  → {ok} / {error}
 *   cloudSync.login(id, nickname)     → {ok, data} / {error}
 *   cloudSync.lookup(id)              → {found:true/false}
 *   cloudSync.save(id, nickname, data) → {ok} / {error}
 *   cloudSync.load(id, nickname)      → {ok, data} / {error}
 *   cloudSync.autoSave()              — debounced auto-save (call on data changes)
 *   cloudSync.isEnabled()             — true if cloud sync is active
 */

var cloudSync = (function() {
  var BACKEND = 'https://tpg-hq.thawflow.com';
  var AUTO_SAVE_DELAY = 5000; // 5s debounce
  var autoSaveTimer = null;

  // Current session
  var session = {
    id: null,
    nickname: null,
    enabled: false
  };

  function getLocal(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  }
  function setLocal(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  }

  function api(path, method, body) {
    var url = BACKEND + '/' + path;
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      signal: null
    };
    if (body) opts.body = JSON.stringify(body);
    // Timeout via AbortController
    var ctrl = new AbortController();
    opts.signal = ctrl.signal;
    var timer = setTimeout(function() { ctrl.abort(); }, 8000);
    return fetch(url, opts).then(function(r) {
      clearTimeout(timer);
      return r.json();
    }).catch(function(e) {
      clearTimeout(timer);
      return { ok: false, error: '网络错误: ' + (e.message || e) };
    });
  }

  function collectAllSaves() {
    // Gather all game saves from localStorage
    var saves = {};
    var id = getUnifiedPlayerIdLocal();
    // Snake
    var snake = getLocal('snake_save_' + id);
    if (snake) saves.snake = JSON.parse(snake);
    // Sword Master
    var sword = getLocal('sword_master_save_' + id);
    if (sword) saves.sword_master = JSON.parse(sword);
    // Dungeon
    var dungeon = getLocal('thawpaw.dungeon.save.v2_' + id);
    if (dungeon) saves.dungeon = JSON.parse(dungeon);
    // Moonstone (solo + duo)
    var msSolo = getLocal('moonstone_save_solo_' + id);
    if (msSolo) saves.moonstone_solo = JSON.parse(msSolo);
    var msDuo = getLocal('moonstone_save_duo_' + id);
    if (msDuo) saves.moonstone_duo = JSON.parse(msDuo);
    // Moonstone home data
    var msHome = getLocal('moonstone_home_' + id);
    if (msHome) saves.moonstone_home = JSON.parse(msHome);
    // Profile
    var players = getLocal('thawpawPlayers');
    if (players) {
      players = JSON.parse(players);
      if (players[id]) saves.profile = players[id];
    }
    return saves;
  }

  function restoreAllSaves(data) {
    if (!data) return;
    var id = getUnifiedPlayerIdLocal();
    if (data.snake) setLocal('snake_save_' + id, JSON.stringify(data.snake));
    if (data.sword_master) setLocal('sword_master_save_' + id, JSON.stringify(data.sword_master));
    if (data.dungeon) setLocal('thawpaw.dungeon.save.v2_' + id, JSON.stringify(data.dungeon));
    if (data.moonstone_solo) setLocal('moonstone_save_solo_' + id, JSON.stringify(data.moonstone_solo));
    if (data.moonstone_duo) setLocal('moonstone_save_duo_' + id, JSON.stringify(data.moonstone_duo));
    if (data.moonstone_home) setLocal('moonstone_home_' + id, JSON.stringify(data.moonstone_home));
    if (data.profile) {
      var players = getLocal('thawpawPlayers');
      players = players ? JSON.parse(players) : {};
      players[id] = Object.assign(players[id] || {}, data.profile);
      setLocal('thawpawPlayers', JSON.stringify(players));
    }
  }

  function getUnifiedPlayerIdLocal() {
    return getLocal('thawpawActiveId') || '';
  }

  return {
    BACKEND: BACKEND,

    init: function(id, nickname) {
      session.id = id;
      session.nickname = nickname;
      session.enabled = true;
    },

    disable: function() {
      session.enabled = false;
    },

    isEnabled: function() {
      return session.enabled && session.id && session.nickname;
    },

    lookup: function(id) {
      return api('lookup?id=' + id, 'GET');
    },

    register: function(id, nickname) {
      return api('register', 'POST', { id: id, nickname: nickname });
    },

    login: function(id, nickname) {
      return api('verify', 'POST', { id: id, nickname: nickname });
    },

    save: function(id, nickname, data) {
      if (!data) data = collectAllSaves();
      return api('save', 'POST', { id: id, nickname: nickname, data: data });
    },

    load: function(id, nickname) {
      return api('load', 'POST', { id: id, nickname: nickname });
    },

    restoreAll: function(data) {
      restoreAllSaves(data);
    },

    collectAll: function() {
      return collectAllSaves();
    },

    // Debounced auto-save
    autoSave: function() {
      if (!this.isEnabled()) return;
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function() {
        cloudSync.save(session.id, session.nickname).then(function(r) {
          if (r.ok) {
            console.log('☁️ Cloud sync: saved');
          } else {
            console.warn('☁️ Cloud sync failed:', r.error);
          }
        });
      }, AUTO_SAVE_DELAY);
    },

    // On login: restore cloud data to localStorage
    syncOnLogin: function(id, nickname) {
      var self = this;
      return self.load(id, nickname).then(function(r) {
        if (r.ok && r.data) {
          restoreAllSaves(r.data);
          self.init(id, nickname);
          return { ok: true, restored: true, savedAt: r.savedAt };
        }
        self.init(id, nickname);
        return { ok: true, restored: false };
      });
    }
  };
})();
