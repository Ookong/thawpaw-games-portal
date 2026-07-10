/**
 * ❄️ Draggable Portal Button — snow-button.js
 * Floating, draggable, always on left side. Works across all TPG pages.
 */
(function(){
  var btn, dragData=null, pos={x:16,y:0};

  function savePos(){
    try{ var p={x:btn.offsetLeft,y:btn.offsetTop}; localStorage.setItem('tpg_snow_pos',JSON.stringify(p)); }catch(e){}
  }

  function loadPos(){
    try{ var p=JSON.parse(localStorage.getItem('tpg_snow_pos')); if(p){pos=p;} }catch(e){}
  }

  function ensureBtn(){
    if(document.getElementById('tpg-snow-btn')) return;
    btn=document.createElement('div');
    btn.id='tpg-snow-btn';
    btn.innerHTML='❄️';
    btn.title='拖动我！点击返回 Portal';
    btn.style.cssText='position:fixed;width:44px;height:44px;border-radius:50%;'
      +'background:linear-gradient(135deg,#74ebd5,#ACB6E5);'
      +'display:flex;align-items:center;justify-content:center;font-size:20px;cursor:grab;'
      +'z-index:99998;box-shadow:0 4px 12px rgba(116,235,213,.4);'
      +'user-select:none;-webkit-user-select:none;touch-action:none;'
      +'transition:box-shadow .2s;';
    document.body.appendChild(btn);
    loadPos();
    // Default position: left side, vertically centered
    btn.style.left=(pos.x||16)+'px';
    btn.style.top=(pos.y||(window.innerHeight-60))+'px';
    bindEvents();
  }

  function bindEvents(){
    var startFn=function(x,y,e){
      dragData={sx:x,ssy:y,ox:btn.offsetLeft,oy:btn.offsetTop,moved:false};
      btn.style.cursor='grabbing';
      e.preventDefault();
    };
    btn.addEventListener('mousedown',function(e){ startFn(e.clientX,e.clientY,e); });
    btn.addEventListener('touchstart',function(e){
      if(e.touches[0]) startFn(e.touches[0].clientX,e.touches[0].clientY,e);
    },{passive:false});

    var moveFn=function(x,y){
      if(!dragData) return;
      var dx=x-dragData.sx, dy=y-dragData.ssy;
      if(Math.abs(dx)>4||Math.abs(dy)>4) dragData.moved=true;
      var nx=dragData.ox+dx, ny=dragData.oy+dy;
      // Clamp to screen
      nx=Math.max(0,Math.min(window.innerWidth-44,nx));
      ny=Math.max(0,Math.min(window.innerHeight-44,ny));
      btn.style.left=nx+'px';
      btn.style.top=ny+'px';
    };
    document.addEventListener('mousemove',function(e){ moveFn(e.clientX,e.clientY); });
    document.addEventListener('touchmove',function(e){
      if(dragData&&e.touches[0]){ moveFn(e.touches[0].clientX,e.touches[0].clientY); e.preventDefault(); }
    },{passive:false});

    var endFn=function(){
      if(!dragData) return;
      btn.style.cursor='grab';
      if(!dragData.moved){
        // Tap/click → go to portal
        goPortal();
      }
      savePos();
      dragData=null;
    };
    document.addEventListener('mouseup',endFn);
    document.addEventListener('touchend',endFn);
    document.addEventListener('touchcancel',endFn);
  }

  function goPortal(){
    if(typeof window.goPortal==='function'&&!window.goPortal._isSnowBtn){
      // Use game's own goPortal if it saves state
      window.goPortal();
    } else {
      // Generic fallback
      var path=window.location.pathname;
      if(path.includes('/games/')) window.location.href='../index.html';
      else if(path.includes('index.html')||path==='/') return; // already on portal
      else window.location.href='../index.html';
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',ensureBtn);
  } else { ensureBtn(); }
})();
