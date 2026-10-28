/* 角色夥伴（decor.js）
   角色圖是用「世志大亂鬥」的真實 3D 模型逐格渲染成的透明背景動畫圖（assets/chars/<角色>.webp，造型是 <角色>_<編號>.webp，
   每張 8 欄 × 4 列：待機 / 跑步 / 歡呼 / 難過），頭像圖集 assets/chars/avatars.webp 取自大亂鬥選角畫面的頭像。
   答題結果的加分提示（#popL 裡的 .pop）一出現：角色站在提示旁邊歡呼／難過，影片框出現綠色衝擊波／紅色震動；提示消失角色就離開。
   首頁右上角「角色夥伴」可以設定：開關、答題光效、固定角色或每場自動換、造型。
   只負責顯示，不碰猜歌的遊戲邏輯，靠觀察 DOM 知道什麼時候該有反應。網址加 ?decor=0 可把角色和光效都關掉（記在這台裝置），?decor=1 開回來。 */
(() => {
"use strict";
const DIR = "assets/chars/";
const DATA = {"cols":12,"rows":6,"chars":[{"k":"waffle","name":"秉寶","en":"Waffle","tag":"魔性笑聲・棒壘球・鋼琴・鬆餅","skins":[{"name":"原版","atlas":0},{"name":"生日帽","atlas":1},{"name":"豪情一中人","atlas":2},{"name":"長方形鬆餅裝","atlas":3},{"name":"刮鬍泡夯哥","atlas":4}]},{"k":"tommy","name":"偷米","en":"Tommy","tag":"排球・打針・失戀吉他・瞬間老化","skins":[{"name":"原版","atlas":5},{"name":"生日帽","atlas":6},{"name":"豪情一中人","atlas":7},{"name":"樂隊制服","atlas":8},{"name":"迷彩","atlas":9}]},{"k":"karl","name":"白狗","en":"Karl","tag":"樂天大笑・物理・跑步・活著真好","skins":[{"name":"原版","atlas":10},{"name":"黃色玩偶服","atlas":11},{"name":"生日帽","atlas":12}]},{"k":"seafood","name":"雲嵐","en":"Seafood Master","tag":"海鮮狂熱・日文系・目標N1","skins":[{"name":"原版","atlas":13},{"name":"生日帽","atlas":14},{"name":"海神波賽頓","atlas":15}]},{"k":"bear","name":"提姆熊","en":"Tim Bear","tag":"暴言・奶奶的金孫・蜂蜜・醫學系","skins":[{"name":"原版","atlas":16},{"name":"生日帽","atlas":17},{"name":"豪情一中人","atlas":18},{"name":"休閒T恤","atlas":19},{"name":"墨鏡T恤","atlas":20}]},{"k":"serene","name":"睿睿","en":"Serene","tag":"酒國女神・政治系・揪團王","skins":[{"name":"原版","atlas":21},{"name":"淺藍沐浴球","atlas":22},{"name":"生日帽","atlas":23}]},{"k":"kiafes","name":"芭樂","en":"Kiafes","tag":"芭樂愛好者・美術老師・諧音梗王","skins":[{"name":"原版","atlas":24},{"name":"白襯衫背包","atlas":25},{"name":"生日帽","atlas":26}]},{"k":"newton","name":"成自然","en":"Newton","tag":"健身・電機・半導體・存股","skins":[{"name":"原版","atlas":27},{"name":"冬季紅外套","atlas":28},{"name":"生日帽","atlas":29},{"name":"柚子裝","atlas":30}]},{"k":"kattisbbb","name":"凱蒂","en":"Kattis","tag":"排球・美宣・高智商","skins":[{"name":"原版","atlas":31},{"name":"針織外套","atlas":32},{"name":"生日帽","atlas":33}]},{"k":"jackson","name":"宇","en":"Yu","tag":"悶騷・唱跳・Scuba・奇怪Reels","skins":[{"name":"原版","atlas":34},{"name":"金髮","atlas":35},{"name":"豪情一中人","atlas":36},{"name":"生日帽","atlas":37}]},{"k":"janice","name":"女王","en":"Queen Janice","tag":"冷靜毒舌・麻將霸氣・國企實習","skins":[{"name":"原版","atlas":38},{"name":"白針織上衣","atlas":39},{"name":"生日帽","atlas":40}]},{"k":"masterogway","name":"樂","en":"Master Ogway","tag":"天龍人・土木系・樂化傳染","skins":[{"name":"原版","atlas":41},{"name":"牛仔襯衫","atlas":42}]},{"k":"kelsey","name":"Ten","en":"Ten","tag":"很會笑・BeReal・教案魔人・哲學系","skins":[{"name":"原版","atlas":43},{"name":"咖啡色上衣","atlas":44},{"name":"白長袖＋米褲","atlas":45},{"name":"黑羽絨外套","atlas":46},{"name":"生日帽","atlas":47}]},{"k":"wxinyy","name":"心瑩","en":"Xinying","tag":"泡泡老師・公衛系・幼幼班保母","skins":[{"name":"原版","atlas":48},{"name":"黑T高領","atlas":49},{"name":"生日帽","atlas":50}]},{"k":"jennie","name":"珍妮","en":"Jennie","tag":"主唱・很會笑・唱跳・早餐大胃王","skins":[{"name":"原版","atlas":51},{"name":"MALIBU 帽T","atlas":52},{"name":"生日帽","atlas":53}]},{"k":"pudding","name":"布丁","en":"Pudding","tag":"布丁頭・髮根黑回來・焦糖控","skins":[{"name":"原版","atlas":54},{"name":"小可愛背心","atlas":55},{"name":"生日帽","atlas":56}]},{"k":"xuan","name":"璿","en":"Xuan","tag":"很玄・水晶球占卜・運氣全靠擲筊","skins":[{"name":"原版","atlas":57},{"name":"高中工作人員","atlas":58},{"name":"生日帽","atlas":59}]},{"k":"ichung","name":"憶中","en":"I-Chung","tag":"機械系教授・壘球強打・脫口秀","skins":[{"name":"原版","atlas":60},{"name":"漁夫帽白T","atlas":61},{"name":"灰藍 Polo","atlas":62},{"name":"生日帽","atlas":63}]}]};                                   // {cols, rows, chars:[{k,name,en,tag,skins:[{name,atlas}]}]}
const LIST = DATA.chars, BY = Object.fromEntries(LIST.map((c) => [c.k, c]));
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ANIM = { idle: { row: 0, n: 6, fps: 5 }, cheer: { row: 2, n: 4, fps: 8 }, sob: { row: 3, n: 4, fps: 6 } };
const COLORS = ["#6cc5d6", "#8cc63f", "#ffb23f", "#ffffff", "#ff8fa3"];
const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- 設定（存在這台裝置） ---------- */
const DEF = { on: true, fx: true, mode: "fixed", kind: "", skin: 0, rndSkin: false };
let cfg = Object.assign({}, DEF);
try {
  const raw = localStorage.getItem("dc.cfg");
  if (raw) Object.assign(cfg, JSON.parse(raw));
  else {                                                 // 從舊版的設定接過來
    if (localStorage.getItem("dc.off") === "1") cfg.on = false;
    const k = localStorage.getItem("dc.kind"); if (k && BY[k]) cfg.kind = k;
  }
  const q = new URLSearchParams(location.search).get("decor");
  if (q === "0") cfg.on = cfg.fx = false; if (q === "1") cfg.on = cfg.fx = true;
} catch (e) {}
if (!BY[cfg.kind]) cfg.kind = pickOne(LIST).k;
if (!(cfg.skin >= 0 && cfg.skin < BY[cfg.kind].skins.length)) cfg.skin = 0;
const save = () => { try { localStorage.setItem("dc.cfg", JSON.stringify(cfg)); } catch (e) {} };
save();

/* ---------- 目前要出場的角色與造型 ---------- */
let cur = { kind: cfg.kind, skin: cfg.skin };
function resolve(fresh) {
  if (cfg.mode === "fixed") { cur = { kind: cfg.kind, skin: cfg.skin }; return; }
  if (!fresh && cur.rotated) return;                     // 每場自動換：只有「新的一場」才重抽
  const c = pickOne(LIST.filter((x) => x.k !== cur.kind));
  cur = { kind: c.k, skin: cfg.rndSkin ? Math.floor(Math.random() * c.skins.length) : 0, rotated: true };
}
const sheet = (k, s) => `${DIR}${k}${s ? "_" + s : ""}.webp`;
const avatar = (el, atlas, size) => {
  const st = el.style; st.width = st.height = size + "px"; st.backgroundImage = `url(${DIR}avatars.webp)`;
  st.backgroundSize = `${DATA.cols * size}px ${DATA.rows * size}px`; st.backgroundPosition = `${-(atlas % DATA.cols) * size}px ${-Math.floor(atlas / DATA.cols) * size}px`;
};

/* ---------- sprite：一格 144×180，共用一個計時迴圈 ---------- */
const sprites = new Set(); let raf = 0, last = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = (t - last) / 1000; last = t;
  if (dt > .5 || document.hidden) return;
  sprites.forEach((s) => { const A = ANIM[s.anim]; s.acc += dt; if (s.acc >= 1 / A.fps) { s.acc %= 1 / A.fps; s.f = (s.f + 1) % A.n; paint(s); } });
}
function mkSprite(el) { const s = { el, anim: "idle", f: 0, acc: 0 }; sprites.add(s); paint(s); if (!raf && !REDUCE) { last = performance.now(); raf = requestAnimationFrame(loop); } return s; }
function paint(s) { const A = ANIM[s.anim]; s.el.style.backgroundPosition = `${s.f / 7 * 100}% ${A.row / 3 * 100}%`; }
function play(s, name) { if (s.anim === name) return; s.anim = name; s.f = 0; s.acc = 0; paint(s); }
function setSheet(s, k, sk) { s.el.style.backgroundImage = `url(${sheet(k, sk)})`; }

/* ---------- 夥伴：站在舞台裡、加分提示旁邊 ---------- */
let crew = null, spr = null, heat = 0, calmT = 0, sayT = 0, lastReact = 0, fxT = 0;
function build() {
  const stage = $("#stage"); if (!stage) return;
  const root = document.createElement("div");
  root.id = "dcCrew"; root.className = "dc-crew"; root.dataset.state = "idle"; root.dataset.heat = "0"; root.hidden = true;
  root.innerHTML = `<div class="dc-aura"></div><div class="dc-name"><b></b><small></small></div><div class="dc-fx"></div><div class="dc-body"><div class="dc-sp" aria-hidden="true"></div></div><div class="dc-shadow"></div>`;
  stage.appendChild(root);
  spr = mkSprite($(".dc-sp", root));
  crew = { root, fx: $(".dc-fx", root), stage };
  root.addEventListener("click", (e) => { e.stopPropagation(); say(); mood("cheer", 1200); burst("cheer", 8); });
  applyCur();
}
function applyCur() {
  const c = BY[cur.kind]; if (!c) return;
  if (spr) setSheet(spr, cur.kind, cur.skin);
  if (crew) { $(".dc-name b", crew.root).textContent = c.name; $(".dc-name small", crew.root).textContent = cur.skin ? c.skins[cur.skin].name : c.tag; }
  new Image().src = sheet(cur.kind, cur.skin);
  const av = $("#dcOpenAv"); if (av) avatar(av, c.skins[cur.skin].atlas, 28);
}
function say() { crew.root.classList.add("say"); clearTimeout(sayT); sayT = setTimeout(() => crew.root.classList.remove("say"), 2600); }
function mood(state, ms) {
  crew.root.dataset.state = state; play(spr, state);
  clearTimeout(calmT);
  if (state !== "idle") calmT = setTimeout(() => { crew.root.dataset.state = "idle"; play(spr, "idle"); }, ms);
}
function burst(type, n) {
  if (REDUCE || !crew) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    if (type === "cheer") {
      const a = rnd(-Math.PI * .95, -Math.PI * .05), d = rnd(60, 170);
      p.className = "dc-p star";
      p.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${rnd(-200, 200)}deg;--s:${rnd(14, 26)}px;--c:${pickOne(COLORS)};--t:${rnd(.8, 1.4)}s`;
    } else {
      p.className = "dc-p drop";
      p.style.cssText = `--dx:${rnd(-40, 40)}px;--dy:${rnd(90, 170)}px;--c:#8fd0ff;--t:${rnd(.9, 1.5)}s;animation-delay:${rnd(0, .5)}s`;
    }
    p.addEventListener("animationend", () => p.remove(), { once: true });
    crew.fx.appendChild(p);
  }
}
/* 大小和位置：電腦版站在加分提示左邊（提示往右挪出空位）、墊高避開左下角按鈕列；手機站在右下角 */
function layout() {
  const st = crew.stage, W = st.clientWidth, H = st.clientHeight;
  const LIFT = 56, GAP = 14, M = 12;
  let sc = Math.min(H * .8 / 180, 1.9), lift = 0, left;
  const pop = $("#popL .pop:not(.out)");
  if (innerWidth > 860) sc = Math.min(sc, (H - LIFT - 6) / 180);
  const cw = 144 * sc, need = M + cw + GAP + (pop ? pop.offsetWidth : 0) + M;
  if (pop && innerWidth > 860 && need <= W) left = M, lift = LIFT, pop.style.left = (M + cw + GAP) + "px";
  else { sc = Math.min(sc, H * .5 / 180, .75); left = W - 144 * sc + 10; }
  const r = crew.root.style; r.setProperty("--sc", sc.toFixed(3)); r.left = left + "px"; r.bottom = (lift + 8 - 9 * sc) + "px";
}
function show() {
  clearTimeout(crew.hideT); crew.root.classList.remove("out");
  if (crew.root.hidden) { crew.root.hidden = false; crew.root.classList.remove("in"); void crew.root.offsetWidth; crew.root.classList.add("in"); }
  layout();
}
function hide(now) {
  if (!crew || crew.root.hidden) return;
  crew.root.classList.add("out"); clearTimeout(calmT);
  clearTimeout(crew.hideT); crew.hideT = setTimeout(() => { crew.root.hidden = true; crew.root.classList.remove("out", "in", "say"); }, now ? 0 : 260);
}
function heatSet(h) { heat = h; if (crew) crew.root.dataset.heat = h; }

/* ---------- 影片框回饋：答對＝螢光綠＋向外擴散的衝擊波，答錯＝紅色＋輕微震動 ---------- */
function stageFx(ok) {
  const st = $("#stage"); if (!st || !cfg.fx) return;
  st.classList.remove("dc-ok", "dc-bad"); void st.offsetWidth; st.classList.add(ok ? "dc-ok" : "dc-bad");
  clearTimeout(fxT); fxT = setTimeout(() => st.classList.remove("dc-ok", "dc-bad"), 1300);
  const fl = document.createElement("i"); fl.className = "dc-flash " + (ok ? "ok" : "bad");
  fl.addEventListener("animationend", () => fl.remove(), { once: true }); st.appendChild(fl);
  if (ok && !REDUCE) [0, 150, 300].forEach((d) => {
    const r = document.createElement("i"); r.className = "dc-ring"; r.style.animationDelay = d + "ms";
    r.addEventListener("animationend", () => r.remove(), { once: true }); st.appendChild(r);
  });
}

function react(kind, combo) {
  const now = Date.now(); if (now - lastReact < 700) return; lastReact = now;
  stageFx(kind === "cheer");
  if (!cfg.on || !crew) return;
  show();
  if (kind === "cheer") { heatSet(combo >= 5 ? 2 : combo >= 3 ? 1 : 0); mood("cheer", 2400); burst("cheer", 12 + Math.min(combo, 8) * 2); }
  else { heatSet(0); mood("sob", 2800); burst("sob", 10); }
}

/* ---------- 觀察遊戲畫面（不改遊戲程式） ---------- */
function watch() {
  const pop = $("#popL");
  if (pop) new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (!(n instanceof Element) || !n.classList.contains("pop")) continue;
      if (n.classList.contains("no")) react("sob", 0);
      else { const t = /x(\d+)/.exec((n.querySelector(".big i") || {}).textContent || ""); react("cheer", t ? +t[1] : 1); }
    }
    if (!pop.querySelector(".pop:not(.out)")) hide();            // 提示離開，角色也離開
  }).observe(pop, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  const game = $("#game"); let wasHidden = game ? game.hidden : true;
  if (game) new MutationObserver(() => {
    heatSet(0); hide(true);
    if (wasHidden && !game.hidden && cfg.mode === "rotate") { resolve(true); applyCur(); }   // 每場開始換一位
    wasHidden = game.hidden;
  }).observe(game, { attributes: true, attributeFilter: ["hidden", "class"] });
  addEventListener("resize", () => { if (crew && !crew.root.hidden) layout(); });
}

/* ---------- 設定面板 ---------- */
let modal = null, prev = null, prevAnim = "cheer", opener = null;
function setCfg(patch) {
  Object.assign(cfg, patch); save();
  resolve(["mode", "kind", "skin", "rndSkin"].some((k) => k in patch)); applyCur();
  if (!cfg.on) hide(true);
  if (modal) refresh();
}
function buildOpen() {
  const bar = $("#topbar"), me = $("#meBtn"); if (!bar) return;
  const b = document.createElement("button"); b.type = "button"; b.id = "dcOpen"; b.className = "dc-open"; b.setAttribute("aria-label", "角色夥伴設定");
  b.innerHTML = `<i class="dc-av" id="dcOpenAv"></i><span>角色夥伴</span>`;
  bar.insertBefore(b, me || null);
  b.addEventListener("click", () => openModal(b));
  applyCur();
}
function buildModal() {
  modal = document.createElement("div"); modal.className = "dc-modal"; modal.id = "dcModal"; modal.hidden = true;
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "角色夥伴設定");
  modal.innerHTML = `<div class="dc-sheet">
    <div class="dc-head"><h3>角色夥伴</h3><button type="button" class="dc-x" aria-label="關閉">✕</button></div>
    <div class="dc-prev"><div class="dc-prev-sp"></div><div class="dc-prev-info"><b></b><small></small><button type="button" class="dc-mini" id="dcPrevBtn">看他難過</button></div></div>
    <div class="dc-row"><div><b>顯示角色夥伴</b><small>答題結果出來時，站在加分提示旁邊做反應</small></div><button type="button" class="dc-sw" role="switch" data-k="on" aria-label="顯示角色夥伴"></button></div>
    <div class="dc-row"><div><b>答題光效</b><small>答對：影片框螢光綠＋向外擴散的衝擊波。答錯：紅色＋輕微震動</small></div><button type="button" class="dc-sw" role="switch" data-k="fx" aria-label="答題光效"></button></div>
    <div class="dc-sec">選角方式</div>
    <div class="dc-seg" role="group"><button type="button" data-mode="fixed">固定角色</button><button type="button" data-mode="rotate">每場自動換</button></div>
    <div class="dc-row dc-rnd"><div><b>造型也一起隨機</b><small>每場換角色時，造型也從全部造型裡抽</small></div><button type="button" class="dc-sw" role="switch" data-k="rndSkin" aria-label="造型也一起隨機"></button></div>
    <div class="dc-sec">角色 <small>點選角色會切換成「固定角色」</small></div>
    <div class="dc-grid" role="group" aria-label="選擇角色"></div>
    <div class="dc-sec">造型</div>
    <div class="dc-skins" role="group" aria-label="選擇造型"></div>
  </div>`;
  document.body.appendChild(modal);
  prev = mkSprite($(".dc-prev-sp", modal)); play(prev, "cheer");
  const grid = $(".dc-grid", modal);
  LIST.forEach((c) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "dc-ch"; b.dataset.k = c.k; b.setAttribute("aria-label", c.name);
    b.innerHTML = `<i class="dc-av"></i><span>${c.name}</span>`; avatar($(".dc-av", b), c.skins[0].atlas, 52);
    b.onclick = () => setCfg({ mode: "fixed", kind: c.k, skin: 0 });
    grid.appendChild(b);
  });
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".dc-x")) closeModal(); });
  modal.addEventListener("keydown", (e) => e.stopPropagation());
  modal.addEventListener("keyup", (e) => e.stopPropagation());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) { e.stopPropagation(); closeModal(); } }, true);
  $$(".dc-sw", modal).forEach((b) => b.onclick = () => setCfg({ [b.dataset.k]: !cfg[b.dataset.k] }));
  $$(".dc-seg button", modal).forEach((b) => b.onclick = () => setCfg({ mode: b.dataset.mode }));
  $("#dcPrevBtn", modal).onclick = () => { prevAnim = prevAnim === "cheer" ? "sob" : "cheer"; refreshPrev(); };
}
function $$(s, r = document) { return [...r.querySelectorAll(s)]; }
function refreshPrev() {
  const k = cfg.mode === "fixed" ? cfg.kind : cur.kind, s = cfg.mode === "fixed" ? cfg.skin : cur.skin, c = BY[k];
  setSheet(prev, k, s); play(prev, prevAnim);
  $(".dc-prev-info b", modal).textContent = c.name;
  $(".dc-prev-info small", modal).textContent = (s ? c.skins[s].name : "原版") + (cfg.mode === "rotate" ? "（這場的角色，每場會換）" : "");
  $("#dcPrevBtn", modal).textContent = prevAnim === "cheer" ? "看他難過" : "看他歡呼";
}
function refresh() {
  $$(".dc-sw", modal).forEach((b) => b.setAttribute("aria-checked", String(!!cfg[b.dataset.k])));
  $$(".dc-seg button", modal).forEach((b) => b.setAttribute("aria-pressed", String(cfg.mode === b.dataset.mode)));
  $(".dc-rnd", modal).hidden = cfg.mode !== "rotate";
  $$(".dc-ch", modal).forEach((b) => b.setAttribute("aria-pressed", String(cfg.mode === "fixed" && b.dataset.k === cfg.kind)));
  const box = $(".dc-skins", modal), c = BY[cfg.kind];
  box.classList.toggle("dim", cfg.mode !== "fixed");
  if (box.dataset.k !== cfg.kind) {                      // 換角色才重建造型列，不然鍵盤焦點會跑掉
    box.dataset.k = cfg.kind; box.innerHTML = "";
    c.skins.forEach((sk, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "dc-sk"; b.dataset.i = i;
      b.innerHTML = `<i class="dc-av"></i><span>${sk.name}</span>`; avatar($(".dc-av", b), sk.atlas, 44);
      b.onclick = () => setCfg({ mode: "fixed", skin: i });
      box.appendChild(b);
    });
  }
  $$(".dc-sk", box).forEach((b) => b.setAttribute("aria-pressed", String(cfg.mode === "fixed" && cfg.skin === +b.dataset.i)));
  refreshPrev();
}
function openModal(from) {
  if (!modal) buildModal();
  opener = from || null; refresh(); modal.hidden = false; document.documentElement.classList.add("dc-lock");
  const x = $(".dc-x", modal); if (x) x.focus();
}
function closeModal() { if (!modal) return; modal.hidden = true; document.documentElement.classList.remove("dc-lock"); if (opener) opener.focus(); }

function start() {
  resolve(true); build(); buildOpen(); watch();
}
window.WVSDecor = { react, open: () => openModal(), cfg: () => Object.assign({}, cfg), set: setCfg, cur: () => Object.assign({}, cur) };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
