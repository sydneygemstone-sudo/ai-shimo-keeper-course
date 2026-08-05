/* 毛球驯养手册 · slide deck 引擎 v2
   翻页:← → / 空格 / 底部按钮 / 进度点 / 触摸左右滑(iPad) / Home End;全屏 F;#N hash 记页。
   v2:所有导航入口(键盘/圆点/滑动/hash/deckGo)共用 window.deckCanGo 门禁钩子;
   被拦时经 showGate 显示可操作原因,绝不静默。 */
(function () {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!slides.length) return;
  document.documentElement.classList.add("deck-mode");
  document.body.classList.add("deck-body");

  const pg = document.getElementById("pg");
  const dots = document.getElementById("dots");
  const prevB = document.getElementById("prevB");
  const nextB = document.getElementById("nextB");
  let cur = -1;

  slides.forEach((s, i) => {
    const d = document.createElement("button");
    d.className = "dot";
    d.title = (i + 1) + (s.dataset.t ? " · " + s.dataset.t : "");
    d.onclick = () => go(i, "dot");
    dots.appendChild(d);
  });
  const dotEls = Array.from(dots.children);

  let gateEl = null, gateTimer = null;
  function showGate(msg) {
    if (!gateEl) {
      gateEl = document.createElement("div");
      gateEl.style.cssText = "position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:99;background:#3A2A20;color:#FFE9C9;font-weight:800;font-size:14.5px;padding:10px 20px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:86vw;text-align:center";
      document.body.appendChild(gateEl);
    }
    gateEl.textContent = "🔒 " + (msg || "这一页还没解锁");
    gateEl.style.display = "block";
    clearTimeout(gateTimer);
    gateTimer = setTimeout(() => { gateEl.style.display = "none"; }, 2800);
  }

  function go(i, source) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return true;
    const v = window.deckCanGo && window.deckCanGo({ from: cur, to: i, source: source || "api" });
    if (v && v.ok === false) { showGate(v.message); return false; }
    if (cur >= 0) slides[cur].classList.remove("on");
    cur = i;
    const s = slides[cur];
    s.classList.add("on");
    s.scrollTop = 0;
    pg.textContent = (cur + 1) + " / " + slides.length;
    dotEls.forEach((d, j) => {
      d.classList.toggle("cur", j === cur);
      d.classList.toggle("done", j < cur);
    });
    prevB.disabled = cur === 0;
    nextB.disabled = cur === slides.length - 1;
    history.replaceState(null, "", "#" + (cur + 1));
    return true;
  }
  window.deckGo = go;
  window.deckIndexOf = (t) => slides.findIndex((s) => s.dataset.t === t);
  prevB.onclick = () => go(cur - 1, "btn");
  nextB.onclick = () => go(cur + 1, "btn");

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(cur + 1, "key"); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(cur - 1, "key"); }
    else if (e.key === "Home") go(0, "key");
    else if (e.key === "End") go(slides.length - 1, "key");
    else if (e.key === "f" || e.key === "F") fs();
  });

  let tx = 0, ty = 0;
  document.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1), "swipe");
  }, { passive: true });

  function fs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }
  const fsB = document.getElementById("fsB");
  if (fsB) fsB.onclick = fs;

  const h = parseInt((location.hash || "").slice(1), 10);
  if (!go(isNaN(h) ? 0 : h - 1, "hash")) go(0, "hash-fallback");
})();
