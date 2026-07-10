/**
 * 🐾 TPG 新手教程系统 — tutorial.js
 * 第一步：聚光灯指向"经典模式"，其余部分调暗+禁止点击
 *
 * 用法：
 *   showTutorialStep('css-selector', '🐍', '点击经典模式吃苹果！', function(){
 *     // 用户点了目标按钮后执行
 *   });
 *
 *   标记教程已完成：
 *   tutorialDone('snake_step1')  → localStorage
 *   tutorialCheck('snake_step1') → true/false
 */

// ── Spotlight Overlay ──
var _tutorialOverlay = null;
var _tutorialHighlight = null;

function ensureTutorialElements() {
  if (_tutorialOverlay) return;
  var style = document.createElement('style');
  style.textContent = [
    '.tpg-tut-overlay{position:fixed;inset:0;z-index:9999;pointer-events:none;background:rgba(0,0,0,0);transition:background .3s;}',
    '.tpg-tut-overlay.active{background:rgba(0,0,0,.72);}',
    '.tpg-tut-hole{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(0,0,0,.72);pointer-events:none;transition:all .3s ease;z-index:9998;border:2px solid rgba(255,255,255,.4);}',
    '.tpg-tut-finger{position:fixed;font-size:36px;z-index:10000;pointer-events:none;animation:tpgBounce .8s ease-in-out infinite alternate;}',
    '.tpg-tut-bubble{position:fixed;z-index:10001;background:var(--card,#1e1e2e);border:1.5px solid var(--accent,#e94560);border-radius:14px;padding:14px 20px;max-width:280px;text-align:center;font-size:14px;color:var(--text,#eee);line-height:1.5;box-shadow:0 8px 32px rgba(0,0,0,.5);pointer-events:none;}',
    '.tpg-tut-bubble .tpg-emoji{font-size:28px;display:block;margin-bottom:4px;}',
    '.tpg-tut-bubble .tpg-text{font-weight:600;}',
    '.tpg-tut-bubble .tpg-skip{display:block;margin-top:8px;font-size:11px;opacity:.5;cursor:pointer;pointer-events:auto;text-decoration:underline;}',
    '@keyframes tpgBounce{from{transform:translateY(0) rotate(-15deg);}to{transform:translateY(-12px) rotate(0deg);}}'
  ].join('\n');
  document.head.appendChild(style);
}

/**
 * 显示教程步骤：聚光灯指向目标元素
 * @param {string} selector - CSS selector for the target element
 * @param {string} emoji - Emoji to show (🐱 🐍 🕵️)
 * @param {string} text - Instruction text
 * @param {function} onInteract - Called when user clicks the target
 * @param {object} opts - { skip: true/false } whether to show skip link
 */
function showTutorialStep(selector, emoji, text, onInteract, opts) {
  opts = opts || {};
  ensureTutorialElements();

  // Remove any existing tutorial
  hideTutorialStep();

  var target = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!target) {
    console.warn('[TPG Tutorial] Target not found:', selector);
    if (onInteract) onInteract();
    return;
  }

  // Highlight the target on top of overlay
  target.style.position = target.style.position || '';
  target.style.zIndex = '9999';
  target.style.transition = 'box-shadow .3s';
  target.style.boxShadow = '0 0 0 9999px rgba(0,0,0,.72), 0 0 20px rgba(255,255,255,.3)';
  target.style.borderRadius = target.style.borderRadius || '14px';
  target.classList.add('tpg-tut-active');

  // Disable clicks on everything except target
  var overlay = document.createElement('div');
  overlay.className = 'tpg-tut-overlay';
  overlay.style.background = 'transparent'; // shadow on target handles dimming
  overlay.style.pointerEvents = 'none'; // allow clicks to pass through

  // Finger pointer
  var finger = document.createElement('div');
  finger.className = 'tpg-tut-finger';
  finger.textContent = '👆';

  // Speech bubble
  var bubble = document.createElement('div');
  bubble.className = 'tpg-tut-bubble';
  bubble.innerHTML = '<span class="tpg-emoji">' + emoji + '</span>' +
    '<span class="tpg-text">' + text + '</span>';
  if (opts.skip !== false) {
    var skip = document.createElement('span');
    skip.className = 'tpg-skip';
    skip.textContent = '跳过教程';
    skip.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      hideTutorialStep();
      if (onInteract) onInteract();
    });
    bubble.appendChild(skip);
  }

  // Position finger + bubble relative to target
  function positionElements() {
    var rect = target.getBoundingClientRect();
    // Finger: point at the center-right of target
    finger.style.left = (rect.right - 20) + 'px';
    finger.style.top = (rect.top + rect.height / 2 - 30) + 'px';

    // Bubble: above or below target depending on space
    var bubbleAbove = rect.top > 120;
    if (bubbleAbove) {
      bubble.style.left = Math.max(10, rect.left + rect.width / 2 - 140) + 'px';
      bubble.style.top = (rect.top - 100) + 'px';
    } else {
      bubble.style.left = Math.max(10, rect.left + rect.width / 2 - 140) + 'px';
      bubble.style.top = (rect.bottom + 16) + 'px';
    }
  }

  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(finger);
  document.body.appendChild(bubble);
  positionElements();
  window.addEventListener('resize', positionElements);
  window.addEventListener('scroll', positionElements);

  _tutorialOverlay = {
    overlay: overlay,
    finger: finger,
    bubble: bubble,
    target: target,
    positionFn: positionElements,
    onInteract: onInteract
  };

  // Intercept clicks on target
  var origClick = target.onclick;
  var handled = false;
  function handleTutorialClick(e) {
    if (handled) return;
    handled = true;
    hideTutorialStep();
    // Let the original click/navigation proceed — don't stop it
    setTimeout(function() {
      if (onInteract) onInteract();
    }, 100);
  }
  target.addEventListener('click', handleTutorialClick, { once: true });
  // Also handle touch — don't preventDefault so <a> links still navigate
  target.addEventListener('touchend', function(e) {
    if (handled) return;
    handled = true;
    hideTutorialStep();
    setTimeout(function() {
      if (onInteract) onInteract();
    }, 100);
  }, { once: true, passive: true });
}

function hideTutorialStep() {
  if (!_tutorialOverlay) return;
  var t = _tutorialOverlay;
  // Restore target
  if (t.target) {
    t.target.style.boxShadow = '';
    t.target.style.zIndex = '';
    t.target.classList.remove('tpg-tut-active');
  }
  // Remove elements
  if (t.overlay && t.overlay.parentNode) t.overlay.parentNode.removeChild(t.overlay);
  if (t.finger && t.finger.parentNode) t.finger.parentNode.removeChild(t.finger);
  if (t.bubble && t.bubble.parentNode) t.bubble.parentNode.removeChild(t.bubble);
  window.removeEventListener('resize', t.positionFn);
  window.removeEventListener('scroll', t.positionFn);
  _tutorialOverlay = null;
}

// ── Progress tracking via localStorage ──
function tutorialKey(game, step) {
  return 'tpg_tut_' + game + '_' + step;
}

function tutorialDone(game, step) {
  try { localStorage.setItem(tutorialKey(game, step), '1'); } catch (e) {}
}

function tutorialCheck(game, step) {
  try { return localStorage.getItem(tutorialKey(game, step)) === '1'; } catch (e) { return false; }
}

/**
 * Check if this is a brand new player (never logged in before)
 * Used to decide whether to show tutorial
 */
function isNewPlayer() {
  try {
    var seen = localStorage.getItem('tpg_tutorial_seen');
    if (!seen) {
      localStorage.setItem('tpg_tutorial_seen', '1');
      return true;
    }
    return false;
  } catch (e) { return false; }
}

/**
 * 📘 第 2 步：游戏内操作说明弹窗
 * @param {string} game - 'snake' | 'moonstone' | 'dungeon'
 * @param {function} onClose - optional callback after user dismisses
 */
function showTutorialHowTo(game, onClose) {
  ensureTutorialElements();

  var guides = {
    snake: {
      emoji: '🐍',
      title: '怎么玩贪吃蛇',
      steps: [
        '⌨️ 方向键或 WASD 控制蛇移动',
        '🍎 吃到苹果加分、变长',
        '🚫 别撞到自己！撞到就 Game Over',
        '💰 吃苹果还能赚金币'
      ]
    },
    moonstone: {
      emoji: '🐱',
      title: '怎么玩猫武士大冒险',
      steps: [
        '⌨️ 方向键移动猫武士',
        '⚔️ 走到敌人旁边按攻击键',
        '🌿 受伤了用草药回血',
        '▼ 找到楼梯往下层探索',
        '🔮 打 BOSS 赢月亮石！'
      ]
    },
    dungeon: {
      emoji: '🕵️',
      title: '怎么玩小小探险家',
      steps: [
        '⌨️ WASD 或方向键移动',
        '⚔️ 走到怪物旁边自动攻击',
        '💣 用炸弹炸一片怪物',
        '🏪 按 P 开商店买装备',
        '🗺️ 打 BOSS 赢探险经验！'
      ]
    }
  };

  var g = guides[game];
  if (!g) { if (onClose) onClose(); return; }

  // Dim background
  var overlay = document.createElement('div');
  overlay.className = 'tpg-tut-overlay active';
  overlay.style.pointerEvents = 'auto';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  // Card
  var card = document.createElement('div');
  card.style.cssText = 'background:#1e1e2e;border:1.5px solid #aaddff;border-radius:16px;padding:24px 20px;width:90%;max-width:340px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.6);animation:tpgPop .3s ease;';

  var html = '<div style="font-size:44px;margin-bottom:8px;">' + g.emoji + '</div>';
  html += '<div style="font-size:18px;font-weight:700;color:#aaddff;margin-bottom:14px;">' + g.title + '</div>';
  html += '<div style="text-align:left;font-size:14px;color:#ccc;line-height:1.8;margin-bottom:18px;">';
  for (var i = 0; i < g.steps.length; i++) {
    html += '<div style="margin-bottom:4px;">' + g.steps[i] + '</div>';
  }
  html += '</div>';
  html += '<button style="background:#e94560;color:#fff;border:none;padding:12px 32px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;width:100%;">知道了！</button>';
  card.innerHTML = html;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Add pop animation keyframe if not exists
  if (!document.getElementById('tpg-pop-keyframe')) {
    var s = document.createElement('style');
    s.id = 'tpg-pop-keyframe';
    s.textContent = '@keyframes tpgPop{from{transform:scale(.8);opacity:0;}to{transform:scale(1);opacity:1;}}';
    document.head.appendChild(s);
  }

  // Close on button click
  var btn = card.querySelector('button');
  btn.addEventListener('click', function() {
    overlay.remove();
    tutorialDone(game, 'step2');
    if (onClose) onClose();
  });
  // Also close on overlay click outside card
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
      tutorialDone(game, 'step2');
      if (onClose) onClose();
    }
  });
}
