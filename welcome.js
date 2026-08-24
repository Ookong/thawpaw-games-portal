/**
 * 🫧 TPG 欢迎气泡系统 — welcome.js（2026-08-24 Kaia 设计 v1）
 * 规则：
 *   - 气泡下面永远带小字「点击继续」
 *   - 点击气泡 → 气泡消失
 *   - 新玩家首次进站 → 屏幕正中弹出欢迎气泡
 * 调试：地址栏加 ?welcome=1 强制再看一次
 */
(function(){
  var FLAG = 'tpg_welcome_seen';

  // 通用气泡：text = 主文案，onDone = 消失后的回调（可选）
  function showBubble(text, onDone){
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:10001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.35);';
    var b = document.createElement('div');
    b.style.cssText = 'background:var(--card,#1e1e2e);border:1.5px solid var(--accent,#e94560);border-radius:16px;padding:22px 30px;max-width:320px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.5);cursor:pointer;transition:opacity .25s,transform .25s;';
    var t = document.createElement('div');
    t.style.cssText = 'font-size:16px;font-weight:700;color:var(--text,#eee);line-height:1.5;';
    t.textContent = text;
    var h = document.createElement('div');
    h.style.cssText = 'margin-top:10px;font-size:11px;opacity:.5;color:var(--text,#eee);';
    h.textContent = '点击继续';
    b.appendChild(t);
    b.appendChild(h);
    ov.appendChild(b);
    ov.addEventListener('click', function(){
      try{ localStorage.setItem(FLAG, '1'); }catch(e){}
      b.style.opacity = '0';
      b.style.transform = 'scale(.92)';
      setTimeout(function(){ ov.remove(); }, 260);
      onDone && onDone();
    });
    document.body.appendChild(ov);
  }

  // 暴露给后续气泡步骤用：tpgBubble('文案', 回调)
  window.tpgBubble = showBubble;

  // 首页自动欢迎：新玩家一次（?welcome=1 可强制预览）
  var forced = /[?&]welcome=1/.test(location.search);
  var seen = false;
  try{ seen = localStorage.getItem(FLAG) === '1'; }catch(e){}
  if (forced || !seen) {
    setTimeout(function(){
      showBubble('欢迎来到 ThawPaw Games，选一个游戏吧！');
    }, 500);
  }
})();
