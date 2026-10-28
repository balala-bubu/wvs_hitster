/* 角色夥伴裝飾（decor.js）
   角色圖是用「世志大亂鬥」的真實 3D 模型逐格渲染成的透明背景動畫圖（assets/chars/*.webp，每張 8 欄 × 4 列，
   列 = 待機 / 跑步 / 歡呼 / 難過），這裡只負責顯示與特效，完全不碰猜歌的遊戲邏輯：
   靠觀察 DOM（#popL 的答題結果、#game / #result 的顯示）來知道什麼時候該有反應。
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
const ANIM = { idle: { row: 0, n: 6, fps: 5 }, run: { row: 1, n: 6, fps: 12 }, cheer: { row: 2, n: 4, fps: 8 }, sob: { row: 3, n: 4, fps: 6 } };
const COLORS = ["#6cc5d6", "#8cc63f", "#ffb23f", "#ffffff", "#ff8fa3"];
const $ = (s, r = document) => r.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------- sprite：一格 144×180 的動畫圖，全部共用一個計時迴圈 ---------- */
const sprites = new Set(); let raf = 0, last = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = (t - last) / 1000; last = t;
  if (dt > .5 || document.hidden) return;
  sprites.forEach((s) => s.step(dt));
}
function Sprite(kind, scale) {
  const el = document.createElement("div");
  el.className = "dc-sp"; el.setAttribute("aria-hidden", "true");
  el.style.setProperty("--sc", scale);
  this.el = el; this.anim = "idle"; this.f = 0; this.acc = 0;
  this.setKind(kind); this.paint();
  sprites.add(this); if (!raf && !REDUCE) { last = performance.now(); raf = requestAnimationFrame(loop); }
}
Sprite.prototype.setKind = function (kind) { this.kind = kind; this.el.style.backgroundImage = `url(${DIR}${kind}.webp)`; };
Sprite.prototype.play = function (name) { if (this.anim === name) return; this.anim = name; this.f = 0; this.acc = 0; this.paint(); };
Sprite.prototype.paint = function () { const A = ANIM[this.anim]; this.el.style.backgroundPosition = `${this.f / 7 * 100}% ${A.row / 3 * 100}%`; };
Sprite.prototype.step = function (dt) {
  const A = ANIM[this.anim]; this.acc += dt;
  if (this.acc >= 1 / A.fps) { this.acc %= 1 / A.fps; this.f = (this.f + 1) % A.n; this.paint(); }
};
Sprite.prototype.destroy = function () { sprites.delete(this); this.el.remove(); if (!sprites.size) { cancelAnimationFrame(raf); raf = 0; } };

/* ---------- 特效粒子 ---------- */
function burst(host, type, n) {
  if (REDUCE) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    if (type === "cheer") {
      const a = rnd(-Math.PI * .95, -Math.PI * .05), d = rnd(50, 130);
      p.className = "dc-p star";
      p.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 10}px;--r:${rnd(-200, 200)}deg;--s:${rnd(12, 22)}px;--c:${pickOne(COLORS)};--t:${rnd(.8, 1.35)}s`;
    } else {
      p.className = "dc-p drop";
      p.style.cssText = `--dx:${rnd(-34, 34)}px;--dy:${rnd(70, 130)}px;--c:#8fd0ff;--t:${rnd(.9, 1.5)}s;animation-delay:${rnd(0, .5)}s`;
    }
    p.addEventListener("animationend", () => p.remove(), { once: true });
    host.appendChild(p);
  }
}

/* ---------- 夥伴（遊戲中站在畫面下方） ---------- */
let idx = 0;
try { const s = localStorage.getItem("dc.kind"); const i = CAST.findIndex((c) => c[0] === s); idx = i >= 0 ? i : Math.floor(Math.random() * CAST.length); } catch (e) { idx = Math.floor(Math.random() * CAST.length); }
let crew = null, heat = 0, calmT = 0, sayT = 0, lastReact = 0;

function buildCrew() {
  const root = document.createElement("div");
  root.id = "dcCrew"; root.className = "dc-crew"; root.dataset.state = "idle"; root.hidden = true;
  root.innerHTML = `<div class="dc-aura"></div><div class="dc-name"><b></b><small></small></div><div class="dc-fx"></div><div class="dc-body"></div><div class="dc-shadow"></div>`;
  const sp = new Sprite(CAST[idx][0], .72);
  $(".dc-body", root).appendChild(sp.el);
  document.body.appendChild(root);
  root.addEventListener("click", cycle);
  crew = { root, sp, fx: $(".dc-fx", root) };
  label();
}
function label() { const c = CAST[idx]; $(".dc-name b", crew.root).textContent = c[1]; $(".dc-name small", crew.root).textContent = c[2]; }
function say() { crew.root.classList.add("say"); clearTimeout(sayT); sayT = setTimeout(() => crew.root.classList.remove("say"), 2600); }
function cycle() {
  if (crew.root.classList.contains("peek") && !crew.root.classList.contains("up")) return;
  idx = (idx + 1) % CAST.length;
  try { localStorage.setItem("dc.kind", CAST[idx][0]); } catch (e) {}
  crew.sp.setKind(CAST[idx][0]); label(); say();
  mood("cheer", 1100); burst(crew.fx, "cheer", 10);
}
function mood(state, ms) {
  crew.root.dataset.state = state; crew.sp.play(state === "idle" ? "idle" : state);
  clearTimeout(calmT);
  if (state !== "idle") calmT = setTimeout(() => { crew.root.dataset.state = "idle"; crew.sp.play("idle"); crew.root.classList.remove("up"); }, ms);
}
function persistent() { const g = $("#game"); return !!g && !g.hidden && !g.classList.contains("sing") && innerWidth >= 1100; }
function layoutCrew() {
  if (!crew) return;
  const g = $("#game"), inGame = !!g && !g.hidden;
  crew.root.hidden = !inGame;
  const peek = inGame && !persistent();
  crew.root.classList.toggle("peek", peek);
  if (!peek) crew.root.classList.remove("up");
}
function heatSet(h) { heat = h; if (crew) crew.root.dataset.heat = h; }

function react(kind, combo) {
  const now = Date.now(); if (now - lastReact < 700) return; lastReact = now;
  if (!crew) return;
  layoutCrew(); if (crew.root.hidden) return;
  if (crew.root.classList.contains("peek")) crew.root.classList.add("up");
  if (kind === "cheer") {
    heatSet(combo >= 5 ? 2 : combo >= 3 ? 1 : 0);
    mood("cheer", 2400); burst(crew.fx, "cheer", 12 + Math.min(combo, 8) * 2);
    if (combo >= 5) lap(CAST[idx][0]);
  } else { heatSet(0); mood("sob", 2800); burst(crew.fx, "sob", 9); }
}

/* ---------- 跑過畫面的角色（連擊 5+ 的獎勵、大廳的遊行） ---------- */
function lap(kind, opt = {}) {
  if (REDUCE) return;
  const dir = opt.dir || (Math.random() < .5 ? 1 : -1), sc = opt.scale || .6, dur = opt.dur || 3.2;
  const w = document.createElement("div");
  w.className = "dc-run" + (dir < 0 ? " rev" : ""); w.style.setProperty("--d", dur + "s");
  const sp = new Sprite(kind, sc); sp.play("run"); w.appendChild(sp.el);
  const sh = document.createElement("i"); sh.className = "dc-runshadow"; w.appendChild(sh);
  w.addEventListener("animationend", () => { sp.destroy(); w.remove(); }, { once: true });
  document.body.appendChild(w);
}
let paradeT = 0;
function paradeLoop() {
  clearTimeout(paradeT);
  paradeT = setTimeout(() => {
    const lb = $("#lobby");
    if (lb && !lb.hidden && !document.hidden) {
      const n = Math.random() < .35 ? 3 : 1, dir = Math.random() < .5 ? 1 : -1, pool = CAST.map((c) => c[0]).sort(() => Math.random() - .5);
      for (let i = 0; i < n; i++) setTimeout(() => lap(pool[i], { dir, scale: .55, dur: 10 }), i * 1100);
    }
    paradeLoop();
  }, rnd(9000, 16000));
}

/* ---------- 結算畫面：角色站在結算卡上方；上方放不下（結算卡常常是整頁高）就站在卡片左右兩側 ---------- */
let podium = null;
function clearPodium() { if (podium) { podium.sprites.forEach((s) => s.destroy()); clearInterval(podium.timer); podium.els.forEach((e) => e.remove()); podium = null; } }
function showPodium() {
  clearPodium();
  const card = $("#result .rcard"); if (!card) return;
  const r = card.getBoundingClientRect();
  let good = true;
  const bs = [...document.querySelectorAll("#result .rgrid b")];
  const m = bs[1] && /(\d+)%/.exec(bs[1].textContent); if (m) good = +m[1] >= 50;
  const mine = CAST[idx][0], others = CAST.map((c) => c[0]).filter((k) => k !== mine).sort(() => Math.random() - .5);
  const stands = [];                                                   // [css, [[kind, scale], ...]]
  const topCell = Math.min(.8, (r.top - 6) / 180), leftW = r.left - 10, rightW = innerWidth - r.right - 10, sideCell = Math.min(.95, Math.min(leftW, rightW) / 144);
  if (topCell >= .38) stands.push([`left:${r.left}px;width:${r.width}px;top:${r.top - 180 * topCell + 8}px`, [[others[0], topCell * .84], [mine, topCell], [others[1], topCell * .84]]]);
  else if (sideCell >= .5) {
    stands.push([`left:0;width:${r.left}px;bottom:0`, [[mine, sideCell]]]);
    stands.push([`left:${r.right}px;width:${innerWidth - r.right}px;bottom:0`, [[others[0], sideCell]]]);
  } else return;                                                       // 小螢幕沒有空位就不放
  const els = [], list = [];
  stands.forEach(([css, ks]) => {
    const el = document.createElement("div"); el.className = "dc-podium"; el.style.cssText = css;
    ks.forEach(([k, sc]) => { const sp = new Sprite(k, sc); sp.play(good ? "cheer" : "sob"); el.appendChild(sp.el); list.push(sp); });
    document.body.appendChild(el); els.push(el);
  });
  podium = { els, sprites: list, timer: 0 };
  const fire = () => { if (!podium) return; podium.sprites.forEach((sp) => burst(sp.el, good ? "cheer" : "sob", good ? 7 : 4)); };
  fire(); let k = 0; podium.timer = setInterval(() => { if (++k > 5) return clearInterval(podium && podium.timer); fire(); }, 1800);
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
  }).observe(pop, { childList: true });
  const game = $("#game"), res = $("#result"), lobby = $("#lobby");
  if (game) new MutationObserver(() => { heatSet(0); layoutCrew(); if (crew && !game.hidden) { mood("idle"); } clearPodium(); }).observe(game, { attributes: true, attributeFilter: ["hidden", "class"] });
  if (res) new MutationObserver(() => { if (res.hidden) clearPodium(); else setTimeout(showPodium, 450); }).observe(res, { attributes: true, attributeFilter: ["hidden"] });
  if (lobby) new MutationObserver(() => { if (!lobby.hidden) paradeLoop(); }).observe(lobby, { attributes: true, attributeFilter: ["hidden"] });
  addEventListener("resize", () => { layoutCrew(); if (podium && res && !res.hidden) showPodium(); });
}

function start() {
  buildCrew(); watch(); layoutCrew(); paradeLoop();
  const lb = $("#lobby"); if (lb && !lb.hidden) setTimeout(() => lap(CAST[idx][0], { dir: 1, scale: .55, dur: 9 }), 2500);
  // 提前載入我的夥伴那張圖，進遊戲時才不會空一下
  new Image().src = DIR + CAST[idx][0] + ".webp";
}
window.WVSDecor = { react, cycle, lap: (k) => lap(k || CAST[idx][0]), showPodium, cast: CAST };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
