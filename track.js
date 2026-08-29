/**
 * 🐾 Thawpaw Games — 浏览/游玩追踪 v2
 * 在每个页面引入：<script src="track.js" defer></script>
 * 自动记录：玩家 ID + 当前页面 + 事件类型
 * 调用方式：window.thawpawTrack('view') 或 window.thawpawTrack('play')
 *
 * 游戏页额外能力：
 *   - 自动上报一次 'play' 事件（记作"打开次数"）
 *   - 每 30s / 离开页面时上报 'time' 事件（累计游玩时长，秒）
 *
 * 后端：Cloudflare Worker (https://tpg-hq.thawflow.com/track)
 * URL 配置在 localStorage key 'tpgCfBackendUrl'
 */
(function () {
  var CF_BACKEND_KEY = 'tpgCfBackendUrl';
  var DEFAULT_CF_URL = 'https://tpg-hq.thawflow.com';
  var GAME_PAGES = { snake: 1, moonstone: 1, sword: 1, learning: 1 };
  var HEARTBEAT_MS = 30000;

  function getBackendBase() {
    try {
      var u = localStorage.getItem(CF_BACKEND_KEY) || DEFAULT_CF_URL;
      return u.replace(/\/+$/, '');
    } catch (e) {
      return DEFAULT_CF_URL;
    }
  }

  function getPlayerId() {
    try {
      var id = localStorage.getItem('thawpawActiveId');
      if (!id) {
        // 老代码兼容：尝试 thawpawPlayerId
        id = localStorage.getItem('thawpawPlayerId');
      }
      if (!id) {
        // 没有活动 ID，生成一个（不应该发生在新版 portal 里）
        id = String(Math.floor(10000000 + Math.random() * 90000000));
        localStorage.setItem('thawpawPlayerId', id);
      }
      return id;
    } catch (e) { return 'anonymous'; }
  }

  function getSessionId() {
    try {
      var sid = sessionStorage.getItem('thawpawSessionId');
      if (!sid) {
        sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('thawpawSessionId', sid);
      }
      return sid;
    } catch (e) { return 'sess_' + Date.now(); }
  }

  function getPageName() {
    var path = window.location.pathname;
    if (path.endsWith('/') || path.endsWith('/index.html')) return 'portal';
    if (path.indexOf('snake') >= 0) return 'snake';
    if (path.indexOf('moonstone') >= 0) return 'moonstone';
    if (path.indexOf('starclan') >= 0) return 'starclan';
    if (path.indexOf('warrior') >= 0) return 'warrior';
    if (path.indexOf('sword') >= 0) return 'sword';
    if (path.indexOf('learning') >= 0) return 'learning';
    if (path.indexOf('admin') >= 0 || path.indexOf('hq') >= 0) return 'admin';
    return path.split('/').pop() || 'unknown';
  }

  function send(evType, extra) {
    var url = getBackendBase() + '/track';
    var payload = {
      id: getPlayerId(),
      page: getPageName(),
      event: evType || 'view',
      sessionId: getSessionId()
    };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
      }
    }
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors',
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  // ── 时长统计（仅游戏页）──
  var pendingSec = 0;      // 未上报的秒数
  var lastTick = null;     // 上次活跃时间戳

  function flushTime() {
    if (lastTick == null) return;
    var now = Date.now();
    var sec = Math.floor((now - lastTick) / 1000);
    lastTick = now;
    if (sec > 300) sec = 300;        // 单次间隙 >5min 视为挂机，封顶
    if (sec <= 0) return;
    pendingSec += sec;
    if (pendingSec >= 15) {
      send('time', { seconds: pendingSec });
      pendingSec = 0;
    }
  }

  function markActive() { lastTick = Date.now(); }

  // 自动追踪 view（页面加载时）
  window.thawpawTrack = function (evType) { send(evType || 'view'); };

  function boot() {
    send('view');
    var page = getPageName();
    if (GAME_PAGES[page]) {
      send('play');                   // 打开次数
      markActive();
      setInterval(flushTime, HEARTBEAT_MS);
      ['click', 'keydown', 'touchstart'].forEach(function (ev) {
        document.addEventListener(ev, markActive, { passive: true });
      });
      window.addEventListener('pagehide', flushTime);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushTime();
        else markActive();
      });
    }
  }

  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', boot);
  }
})();
