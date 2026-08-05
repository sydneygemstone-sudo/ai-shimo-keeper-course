/* 毛球驯养手册 · slide deck 引擎
   翻页:← → / 空格 / 底部按钮 / 进度点 / 触摸左右滑(iPad) / Home End
   全屏:F 键或右上按钮。#N hash 记页,刷新不丢。 */
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
    d.onclick = () => go(i);
    dots.appendChild(d);
  });
  const dotEls = Array.from(dots.children);

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
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
  }
  window.deckGo = go;
  prevB.onclick = () => go(cur - 1);
  nextB.onclick = () => go(cur + 1);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(cur - 1); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(slides.length - 1);
    else if (e.key === "f" || e.key === "F") fs();
  });

  // 触摸滑动(iPad):水平位移 > 56px 且横向占优才翻页,不干扰页内纵向滚动与点击
  let tx = 0, ty = 0;
  document.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  function fs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  }
  const fsB = document.getElementById("fsB");
  if (fsB) fsB.onclick = fs;

  const h = parseInt((location.hash || "").slice(1), 10);
  go(isNaN(h) ? 0 : h - 1);
})();
