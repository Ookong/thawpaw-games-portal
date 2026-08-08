/**
 * 👥 TPG Friends Panel — friends.js
 * Floating friends button + popup panel for all games
 * Requires: cloud-sync style backend at TPG HQ
 */

(function() {
  var POLL_INTERVAL = 15000; // 15s poll for invites
  var pollTimer = null;
  var panelOpen = false;

  // Get current player from localStorage (works across portal + games)
  function getPlayer() {
    try {
      var id = localStorage.getItem('thawpawActiveId');
      if (!id) return null;
      var players = JSON.parse(localStorage.getItem('thawpawPlayers') || '{}');
      if (!players[id]) return null;
      return { id: id, nickname: players[id].nickname };
    } catch(e) { return null; }
  }

  var BACKEND = 'https://tpg-hq.thawflow.com';

  function api(path, method, body) {
    var url = BACKEND + '/' + path;
    var opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    var ctrl = new AbortController();
    opts.signal = ctrl.signal;
    var timer = setTimeout(function() { ctrl.abort(); }, 8000);
    return fetch(url, opts).then(function(r) { clearTimeout(timer); return r.json(); }).catch(function(e) { clearTimeout(timer); return { ok: false, error: e.message }; });
  }

  function ensureButton() {
    if (document.getElementById('tpg-friends-fab')) return;
    var btn = document.createElement('div');
    btn.id = 'tpg-friends-fab';
    btn.style.cssText = 'position:fixed;bottom:16px;right:16px;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#48c6ef);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;z-index:9998;box-shadow:0 4px 16px rgba(108,99,255,.4);transition:transform .2s;user-select:none;';
    btn.innerHTML = '👥';
    btn.title = '好友';
    btn.addEventListener('click', togglePanel);

    // Notification badge
    var badge = document.createElement('div');
    badge.id = 'tpg-friends-badge';
    badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ff4757;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:none;align-items:center;justify-content:center;padding:0 4px;';
    btn.appendChild(badge);
    document.body.appendChild(btn);
  }

  function ensurePanel() {
    if (document.getElementById('tpg-friends-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'tpg-friends-panel';
    panel.style.cssText = 'position:fixed;bottom:72px;left:16px;width:360px;max-width:calc(100vw - 32px);max-height:70vh;background:#1a1a2e;border:1px solid #333;border-radius:16px;z-index:9999;display:none;flex-direction:column;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.5);font-family:system-ui,sans-serif;';
    panel.innerHTML = '' +
      '<div style="padding:14px 16px;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-weight:700;font-size:15px;color:#fff;">👥 好友</span>' +
        '<div style="display:flex;gap:8px;">' +
          '<button id="tpg-fab-add" style="background:#6c63ff;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">+ 加好友</button>' +
          '<span id="tpg-fab-close" style="cursor:pointer;color:#888;font-size:18px;">✕</span>' +
        '</div>' +
      '</div>' +
      '<div id="tpg-fab-reqs" style="padding:8px 16px;display:none;border-bottom:1px solid #333;"></div>' +
      '<div id="tpg-fab-invites" style="padding:8px 16px;display:none;border-bottom:1px solid #333;"></div>' +
      '<div id="tpg-fab-list" style="flex:1;overflow-y:auto;padding:8px 16px;"></div>' +
      '<div id="tpg-fab-addform" style="display:none;padding:12px 16px;border-top:1px solid #333;">' +
        '<input id="tpg-fab-targetid" placeholder="输入好友 ID (8位数字)" style="width:100%;padding:8px;background:#0d0d1f;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;margin-bottom:8px;" />' +
        '<button id="tpg-fab-sendreq" style="width:100%;background:#6c63ff;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:13px;">发送好友请求</button>' +
      '</div>';
    document.body.appendChild(panel);

    document.getElementById('tpg-fab-close').addEventListener('click', function() { togglePanel(); });
    document.getElementById('tpg-fab-add').addEventListener('click', function() {
      var f = document.getElementById('tpg-fab-addform');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('tpg-fab-sendreq').addEventListener('click', sendFriendRequest);
  }

  // ── DM Chat ──
  var chatWith = null;
  var chatPollTimer = null;
  var lastChatTs = 0;

  function openChat(friendId, friendName) {
    chatWith = friendId;
    lastChatTs = 0;
    var p = getPlayer();
    if (!p) return;
    ensurePanel();
    var panel = document.getElementById('tpg-friends-panel');
    panel.innerHTML = '' +
      '<div style="padding:14px 16px;border-bottom:1px solid #333;display:flex;align-items:center;gap:8px;">' +
        '<span id="tpg-chat-back" style="cursor:pointer;font-size:20px;color:#888;">‹</span>' +
        '<span style="font-weight:700;font-size:15px;color:#fff;flex:1;">💬 ' + escapeHtml(friendName) + '</span>' +
        '<span id="tpg-fab-close2" style="cursor:pointer;color:#888;font-size:18px;">✕</span>' +
      '</div>' +
      '<div id="tpg-chat-msgs" style="flex:1;overflow-y:auto;padding:10px 16px;display:flex;flex-direction:column;gap:6px;min-height:200px;"></div>' +
      '<div style="padding:10px 16px;border-top:1px solid #333;display:flex;gap:8px;">' +
        '<input id="tpg-chat-input" placeholder="发消息…" style="flex:1;padding:8px 10px;background:#0d0d1f;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px;outline:none;" />' +
        '<button id="tpg-chat-send" style="background:#6c63ff;color:#fff;border:none;padding:0 14px;border-radius:6px;cursor:pointer;font-size:16px;">➤</button>' +
      '</div>';
    panel.style.display = 'flex';
    document.getElementById('tpg-chat-back').addEventListener('click', function() { closeChat(); });
    document.getElementById('tpg-fab-close2').addEventListener('click', function() { togglePanel(); closeChat(); });
    document.getElementById('tpg-chat-send').addEventListener('click', sendDM);
    document.getElementById('tpg-chat-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') sendDM(); });
    refreshChat();
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(refreshChat, 3000);
    setTimeout(function() { var inp = document.getElementById('tpg-chat-input'); if (inp) inp.focus(); }, 100);
  }

  function closeChat() {
    chatWith = null;
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
    // Restore panel
    var panel = document.getElementById('tpg-friends-panel');
    if (panel) panel.remove();
    ensurePanel();
    refresh();
  }

  async function refreshChat() {
    if (!chatWith) return;
    var p = getPlayer();
    if (!p) return;
    var res = await api('dm/history?id=' + p.id + '&nickname=' + encodeURIComponent(p.nickname) + '&with=' + chatWith + '&since=' + lastChatTs, 'GET');
    if (!res.ok) return;
    var msgsEl = document.getElementById('tpg-chat-msgs');
    if (!msgsEl) return;
    var atBottom = msgsEl.scrollTop + msgsEl.clientHeight >= msgsEl.scrollHeight - 50;
    for (var i = 0; i < res.messages.length; i++) {
      var m = res.messages[i];
      if (m.ts <= lastChatTs) continue;
      lastChatTs = m.ts;
      var mine = m.from === p.id;
      var div = document.createElement('div');
      div.style.cssText = mine
        ? 'align-self:flex-end;background:#6c63ff;color:#fff;padding:6px 12px;border-radius:12px 12px 2px 12px;max-width:75%;font-size:13px;word-break:break-word;'
        : 'align-self:flex-start;background:#2a2a3e;color:#ccc;padding:6px 12px;border-radius:12px 12px 12px 2px;max-width:75%;font-size:13px;word-break:break-word;';
      div.textContent = m.content;
      msgsEl.appendChild(div);
    }
    if (atBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  async function sendDM() {
    var inp = document.getElementById('tpg-chat-input');
    if (!inp) return;
    var content = inp.value.trim();
    if (!content) return;
    inp.value = '';
    var p = getPlayer();
    if (!p) return;
    // Optimistic: show my message immediately
    var msgsEl = document.getElementById('tpg-chat-msgs');
    if (msgsEl) {
      var div = document.createElement('div');
      div.style.cssText = 'align-self:flex-end;background:#6c63ff;color:#fff;padding:6px 12px;border-radius:12px 12px 2px 12px;max-width:75%;font-size:13px;word-break:break-word;';
      div.textContent = content;
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    var res = await api('dm/send', 'POST', { id: p.id, nickname: p.nickname, to: chatWith, content: content });
    if (!res.ok) {
      if (msgsEl) {
        var err = document.createElement('div');
        err.style.cssText = 'align-self:center;color:#ff7a99;font-size:11px;';
        err.textContent = '⚠️ 发送失败: ' + (res.error || '');
        msgsEl.appendChild(err);
      }
    } else {
      lastChatTs = Date.now();
    }
  }

  function togglePanel() {
    ensurePanel();
    var panel = document.getElementById('tpg-friends-panel');
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'flex' : 'none';
    if (panelOpen) refresh();
  }

  async function refresh() {
    var p = getPlayer();
    if (!p) {
      document.getElementById('tpg-fab-list').innerHTML = '<div style="color:#666;text-align:center;padding:20px;">请先登录</div>';
      return;
    }
    document.getElementById('tpg-fab-list').innerHTML = '<div style="color:#666;text-align:center;padding:12px;">加载中…</div>';
    var res = await api('friends/list?id=' + p.id + '&nickname=' + encodeURIComponent(p.nickname), 'GET');
    if (!res.ok) {
      document.getElementById('tpg-fab-list').innerHTML = '<div style="color:#ff7a99;padding:8px;">' + (res.error || '加载失败') + '</div>';
      return;
    }
    // Render requests
    var reqsEl = document.getElementById('tpg-fab-reqs');
    if (res.requests && res.requests.length > 0) {
      reqsEl.style.display = 'block';
      var html = '<div style="font-size:11px;color:#888;margin-bottom:4px;">好友请求</div>';
      for (var i = 0; i < res.requests.length; i++) {
        var r = res.requests[i];
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
          '<span style="font-size:18px;">' + r.avatar + '</span>' +
          '<span style="flex:1;font-size:13px;color:#fff;">' + escapeHtml(r.nickname) + '</span>' +
          '<span style="font-size:11px;color:#666;font-family:monospace;">' + r.id + '</span>' +
          '<button onclick="tpgFriends.accept(\'' + r.id + '\')" style="background:#4caf50;color:#fff;border:none;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;">✓</button>' +
          '</div>';
      }
      reqsEl.innerHTML = html;
    } else {
      reqsEl.style.display = 'none';
    }
    // Render friends list
    var list = res.friends || [];
    var listEl = document.getElementById('tpg-fab-list');
    if (list.length === 0) {
      listEl.innerHTML = '<div style="color:#666;text-align:center;padding:20px;font-size:13px;">还没有好友<br>点击「+ 加好友」添加</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      var progressParts = [];
      if (f.progress) {
        if (f.progress.snake) progressParts.push('🐍Lv' + f.progress.snake.level);
        if (f.progress.dungeon) progressParts.push('🕵️F' + f.progress.dungeon.floor);
        if (f.progress.moonstone) progressParts.push('🔮' + f.progress.moonstone.moonstones);
      }
      var isOnline = f.savedAt && (Date.now() - new Date(f.savedAt).getTime() < 120000);
      var dot = isOnline ? '🟢' : '⚪';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #222;">' +
        '<span style="font-size:20px;position:relative;">' + f.avatar + '<span style="position:absolute;bottom:-2px;right:-4px;font-size:10px;">' + dot + '</span></span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:13px;color:#fff;font-weight:600;">' + escapeHtml(f.nickname) + ' <span style="font-size:10px;color:'+(isOnline?'#4caf50':'#666')+';">'+(isOnline?'在线':'离线')+'</span></div>' +
          '<div style="font-size:11px;color:#666;">' + (progressParts.join(' · ') || '暂无记录') + '</div>' +
        '</div>' +
        '<button onclick="tpgFriends.invite(\'' + f.id + '\',\'' + escapeHtml(f.nickname) + '\')" style="background:#48c6ef;color:#000;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;">🎮</button>' +
        '<button onclick="tpgFriends.chat(\'' + f.id + '\',\'' + escapeHtml(f.nickname) + '\')" style="background:#4caf50;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;">💬</button>' +
        '<button onclick="tpgFriends.remove(\'' + f.id + '\')" style="background:transparent;color:#666;border:none;padding:4px 6px;font-size:14px;cursor:pointer;">🗑️</button>' +
      '</div>';
    }
    listEl.innerHTML = html;
  }

  async function sendFriendRequest() {
    var p = getPlayer();
    if (!p) return;
    var targetId = document.getElementById('tpg-fab-targetid').value.trim();
    if (!/^\d{8}$/.test(targetId)) { alert('请输入 8 位数字 ID'); return; }
    var res = await api('friends/add', 'POST', { id: p.id, nickname: p.nickname, targetId: targetId });
    if (res.ok) {
      alert('✅ 好友请求已发送！');
      document.getElementById('tpg-fab-targetid').value = '';
      document.getElementById('tpg-fab-addform').style.display = 'none';
      refresh();
    } else {
      alert('❌ ' + (res.error || '发送失败'));
    }
  }

  async function acceptFriend(targetId) {
    var p = getPlayer();
    if (!p) return;
    var res = await api('friends/accept', 'POST', { id: p.id, nickname: p.nickname, targetId: targetId });
    if (res.ok) refresh();
    else alert(res.error || '操作失败');
  }

  async function removeFriend(targetId) {
    var p = getPlayer();
    if (!p) return;
    if (!confirm('确定删除这个好友？')) return;
    var res = await api('friends/remove', 'POST', { id: p.id, nickname: p.nickname, targetId: targetId });
    if (res.ok) refresh();
  }

  function generateRoomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  var currentGame = 'snake';
  function setGame(g) { currentGame = g; }

  function invite(friendId, friendName) {
    var p = getPlayer();
    if (!p) return;
    var gameNames = { snake: '贪吃蛇', moonstone: '猫武士大冒险', dungeon: '小小探险家' };
    // Create an online room, then send invite
    api('online/room/create', 'POST', { id: p.id, nickname: p.nickname, mode: currentGame === 'snake' ? 'pk' : 'duo' }).then(function(res) {
      if (!res.ok) { alert('❌ 创建房间失败'); return; }
      var roomCode = res.roomCode;
      api('friends/invite', 'POST', { id: p.id, nickname: p.nickname, targetId: friendId, game: currentGame, roomCode: roomCode }).then(function(res2) {
        if (res2.ok) {
          alert('🎮 已邀请 ' + friendName + '！\n房间码：' + roomCode + '\n好友加入后自动开始');
          if (currentGame === 'snake' && typeof onlineState !== 'undefined') {
            onlineState.mode = 'pk';
            onlineState.matchType = 'invite';
            onlineState.roomCode = roomCode;
            onlineState.playerNum = 1;
            onlineState.opponent = null;
            document.getElementById('online-title').textContent = '⚔️ 邀请好友';
            document.getElementById('online-status').style.display = 'none';
            document.getElementById('online-room-info').style.display = 'block';
            document.getElementById('online-room-code').textContent = roomCode;
            showPage('online-match');
            if (onlineState.matchTimer) clearInterval(onlineState.matchTimer);
            onlineState.matchTimer = setInterval(onlineCheckMatch, 2000);
          }
        } else {
          alert('❌ ' + (res2.error || '邀请失败'));
        }
      });
    });
  }

  // Check for incoming invites (polling)
  async function checkInvites() {
    var p = getPlayer();
    if (!p || panelOpen) return; // don't notify while panel is open
    try {
      var res = await api('friends/invites?id=' + p.id + '&nickname=' + encodeURIComponent(p.nickname), 'GET');
      if (res.ok && res.invites && res.invites.length > 0) {
        var badge = document.getElementById('tpg-friends-badge');
        if (badge) {
          badge.style.display = 'flex';
          badge.textContent = res.invites.length;
        }
        // Show latest invite as notification
        var latest = res.invites[res.invites.length - 1];
        showInviteNotification(latest);
      } else {
        var badge = document.getElementById('tpg-friends-badge');
        if (badge) badge.style.display = 'none';
      }
    } catch(e) {}
  }

  function showInviteNotification(inv) {
    var existing = document.getElementById('tpg-invite-notif');
    if (existing) existing.remove();
    var gameNames = { snake: '🐍 贪吃蛇', moonstone: '🐱 猫武士大冒险', dungeon: '🕵️ 小小探险家' };
    var notif = document.createElement('div');
    notif.id = 'tpg-invite-notif';
    notif.style.cssText = 'position:fixed;top:16px;right:16px;background:#1e1e2e;border:1.5px solid #48c6ef;border-radius:12px;padding:14px 18px;z-index:10000;box-shadow:0 8px 32px rgba(72,198,239,.3);max-width:300px;animation:tpgPop .3s ease;';
    notif.innerHTML = '' +
      '<div style="font-size:14px;color:#fff;font-weight:600;margin-bottom:4px;">🎮 游戏邀请</div>' +
      '<div style="font-size:13px;color:#ccc;margin-bottom:8px;"><b style="color:#48c6ef;">' + escapeHtml(inv.fromName) + '</b> 邀请你一起玩 ' + (gameNames[inv.game] || inv.game) + '</div>' +
      '<div style="font-size:11px;color:#888;margin-bottom:8px;">房间码：<b style="color:#ffd700;font-family:monospace;">' + inv.roomCode + '</b></div>' +
      '<div style="display:flex;gap:8px;">' +
        '<button onclick="tpgFriends.joinGame(\'' + inv.roomCode + '\',\'' + inv.game + '\')" style="flex:1;background:#48c6ef;color:#000;border:none;padding:6px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">加入</button>' +
        '<button onclick="this.closest(\'#tpg-invite-notif\').remove()" style="background:transparent;color:#666;border:1px solid #444;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;">稍后</button>' +
      '</div>';
    document.body.appendChild(notif);
    setTimeout(function() { if (document.getElementById('tpg-invite-notif')) document.getElementById('tpg-invite-notif').remove(); }, 30000);
  }

  function joinGame(roomCode, game) {
    var notif = document.getElementById('tpg-invite-notif');
    if (notif) notif.remove();
    // Navigate to the game and enter duo mode
    var gamePaths = { snake: 'games/snake.html', moonstone: 'games/moonstone-quest.html', dungeon: 'games/dungeon.html' };
    var path = gamePaths[game];
    if (path && !window.location.pathname.includes(path.split('/')[1])) {
      localStorage.setItem('tpg_pending_invite', JSON.stringify({ roomCode: roomCode, game: game }));
      window.location.href = path;
    } else {
      // Already in the right game
      if (typeof enterDuoMode === 'function') {
        enterDuoMode(roomCode);
      }
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[<>&"']/g, function(c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // Public API
  window.tpgFriends = {
    init: function(game) {
      if (game) setGame(game);
      ensureButton();
      ensurePanel();
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(checkInvites, POLL_INTERVAL);
      checkInvites();
    },
    setGame: setGame,
    accept: acceptFriend,
    remove: removeFriend,
    invite: invite,
    chat: openChat,
    closeChat: closeChat,
    joinGame: joinGame,
    refresh: refresh
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ensureButton();
      ensurePanel();
      // Only start polling if player is logged in
      if (getPlayer()) {
        pollTimer = setInterval(checkInvites, POLL_INTERVAL);
        checkInvites();
      }
    });
  } else {
    ensureButton();
    ensurePanel();
    if (getPlayer()) {
      pollTimer = setInterval(checkInvites, POLL_INTERVAL);
      checkInvites();
    }
  }
})();
