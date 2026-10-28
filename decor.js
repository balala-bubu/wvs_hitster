/* 角色夥伴裝飾（decor.js）
   角色圖是用「世志大亂鬥」的真實 3D 模型逐格渲染成的透明背景動畫圖（assets/chars/*.webp，每張 8 欄 × 4 列，
   列 = 待機 / 跑步 / 歡呼 / 難過）。答題結果的加分提示（#popL 裡的 .pop）一出現，角色就站在提示旁邊做反應，
   提示消失角色就離開。只負責顯示，完全不碰猜歌的遊戲邏輯，靠觀察 DOM 知道什麼時候該有反應。
   關掉：網址加 ?decor=0（會記在這台裝置），再開：?decor=1。 */
(() => {
"use strict";
const qs = new URLSearchParams(location.search);
try { if (qs.get("decor") === "0") localStorage.setItem("dc.off", "1"); if (qs.get("decor") === "1") localStorage.removeItem("dc.off"); } catch (e) {}
let off = false; try { off = localStorage.getItem("dc.off") === "1"; } catch (e) {}
if (off) return;

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DIR = "assets/chars/";
const CAST = [["waffle", "秉寶", "魔性笑聲・棒壘球・鋼琴・鬆餅"], ["tommy", "偷米", "排球・打針・失戀吉他・瞬間老化"], ["karl", "白狗", "樂天大笑・物理・跑步・活著真好"], ["seafood", "雲嵐", "海鮮狂熱・日文系・目標N1"], ["bear", "提姆熊", "暴言・奶奶的金孫・蜂蜜・醫學系"], ["serene", "睿睿", "酒國女神・政治系・揪團王"], ["kiafes", "芭樂", "芭樂愛好者・美術老師・諧音梗王"], ["newton", "成自然", "健身・電機・半導體・存股"], ["kattisbbb", "凱蒂", "排球・美宣・高智商"], ["jackson", "宇", "悶騷・唱跳・Scuba・奇怪Reels"], ["janice", "女王", "冷靜毒舌・麻將霸氣・國企實習"], ["masterogway", "樂", "天龍人・土木系・樂化傳染"], ["kelsey", "Ten", "很會笑・BeReal・教案魔人・哲學系"], ["wxinyy", "心瑩", "泡泡老師・公衛系・幼幼班保母"], ["jennie", "珍妮", "主唱・很會笑・唱跳・早餐大胃王"], ["pudding", "布丁", "布丁頭・髮根黑回來・焦糖控"], ["xuan", "璿", "很玄・水晶球占卜・運氣全靠擲筊"], ["ichung", "憶中", "機械系教授・壘球強打・脫口秀"]];                                   // [kind, 名字, 特色]
const ANIM = { idle: { row: 0, n: 6, fps: 5 }, cheer: { row: 2, n: 4, fps: 8 }, sob: { row: 3, n: 4, fps: 6 } };
const COLORS = ["#6cc5d6", "#8cc63f", "#ffb23f", "#ffffff", "#ff8fa3"];
const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- sprite：一格 144×180 的動畫圖 ---------- */
let sprite = null, raf = 0, last = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = (t - last) / 1000; last = t;
  if (dt > .5 || document.hidden || !sprite) return;
  const A = ANIM[sprite.anim]; sprite.acc += dt;
  if (sprite.acc >= 1 / A.fps) { sprite.acc %= 1 / A.fps; sprite.f = (sprite.f + 1) % A.n; paint(); }
}
function paint() { const A = ANIM[sprite.anim]; sprite.el.style.backgroundPosition = `${sprite.f / 7 * 100}% ${A.row / 3 * 100}%`; }
function play(name) { if (sprite.anim === name) return; sprite.anim = name; sprite.f = 0; sprite.acc = 0; paint(); }
function setKind(kind) { sprite.el.style.backgroundImage = `url(${DIR}${kind}.webp)`; }

/* ---------- 特效粒子 ---------- */
function burst(type, n) {
  if (REDUCE) return;
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

/* ---------- 夥伴：站在舞台裡、加分提示旁邊 ---------- */
let idx = 0;
try { const s = localStorage.getItem("dc.kind"); const i = CAST.findIndex((c) => c[0] === s); idx = i >= 0 ? i : Math.floor(Math.random() * CAST.length); } catch (e) { idx = Math.floor(Math.random() * CAST.length); }
let crew = null, heat = 0, calmT = 0, sayT = 0, lastReact = 0;

function build() {
  const stage = $("#stage"); if (!stage) return;
  const root = document.createElement("div");
  root.id = "dcCrew"; root.className = "dc-crew"; root.dataset.state = "idle"; root.dataset.heat = "0"; root.hidden = true;
  root.innerHTML = `<div class="dc-aura"></div><div class="dc-name"><b></b><small></small></div><div class="dc-fx"></div><div class="dc-body"><div class="dc-sp" aria-hidden="true"></div></div><div class="dc-shadow"></div>`;
  stage.appendChild(root);
  sprite = { el: $(".dc-sp", root), anim: "idle", f: 0, acc: 0 };
  setKind(CAST[idx][0]); paint();
  crew = { root, fx: $(".dc-fx", root), stage };
  root.addEventListener("click", (e) => { e.stopPropagation(); cycle(); });
  label();
  if (!REDUCE) { last = performance.now(); raf = requestAnimationFrame(loop); }
}
function label() { const c = CAST[idx]; $(".dc-name b", crew.root).textContent = c[1]; $(".dc-name small", crew.root).textContent = c[2]; }
function say() { crew.root.classList.add("say"); clearTimeout(sayT); sayT = setTimeout(() => crew.root.classList.remove("say"), 2600); }
function cycle() {
  if (!crew || crew.root.hidden) return;
  idx = (idx + 1) % CAST.length;
  try { localStorage.setItem("dc.kind", CAST[idx][0]); } catch (e) {}
  setKind(CAST[idx][0]); label(); say(); mood("cheer", 1200); burst("cheer", 10);
}
function mood(state, ms) {
  crew.root.dataset.state = state; play(state);
  clearTimeout(calmT);
  if (state !== "idle") calmT = setTimeout(() => { crew.root.dataset.state = "idle"; play("idle"); }, ms);
}
/* 大小和位置：高度約舞台的 80%，站在加分提示右邊；放不下（手機、提示置中）就靠右站 */
function layout() {
  const st = crew.stage, W = st.clientWidth, H = st.clientHeight;
  const LIFT = 56;                                                     // 讓出左下角「顯示影片／縮圖」按鈕列
  let sc = Math.min(H * .8 / 180, 1.9), lift = 0, left;
  const pop = $("#popL .pop:not(.out)");
  const GAP = 14, M = 12;                                              // 角色站在加分提示左邊：提示往右挪出空位
  if (innerWidth > 860) sc = Math.min(sc, (H - LIFT - 6) / 180);
  const cw = 144 * sc, need = M + cw + GAP + (pop ? pop.offsetWidth : 0) + M;
  if (pop && innerWidth > 860 && need <= W) left = M, lift = LIFT, pop.style.left = (M + cw + GAP) + "px";
  else { sc = Math.min(sc, H * .5 / 180, .75); left = W - 144 * sc + 10; }   // 手機／空間不夠：小一點、站在右下角
  const r = crew.root.style; r.setProperty("--sc", sc.toFixed(3)); r.left = left + "px"; r.bottom = (lift + 8 - 9 * sc) + "px";
}
function show() {
  if (!crew) return;
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

function react(kind, combo) {
  const now = Date.now(); if (now - lastReact < 700) return; lastReact = now;
  if (!crew) return;
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
  const game = $("#game");
  if (game) new MutationObserver(() => { heatSet(0); hide(true); }).observe(game, { attributes: true, attributeFilter: ["hidden", "class"] });
  addEventListener("resize", () => { if (crew && !crew.root.hidden) layout(); });
}

function start() { build(); if (crew) { watch(); new Image().src = DIR + CAST[idx][0] + ".webp"; } }
window.WVSDecor = { react, cycle, cast: CAST };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
