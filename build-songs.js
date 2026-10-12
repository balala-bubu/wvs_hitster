/* 讀 songs.txt，到 Apple Music 查每首歌的 30 秒試聽網址、年份和封面，寫成 songs-data.js。
 *
 * 這支程式在 GitHub Actions 上執行（伺服器端，不受瀏覽器限制）。
 * 已經查過的歌會沿用 songs-data.js 裡的結果，只查新加的歌。
 *
 *   node build-songs.js            只查新歌
 *   node build-songs.js --force    全部重查
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "songs.txt");
const OUT = path.join(ROOT, "songs-data.js");
const FORCE = process.argv.includes("--force");
const DELAY = +(process.env.SONG_DELAY || 2500);                    // Apple 大約每分鐘只給查 20 次
const COUNTRIES = ["TW", "US", "JP"];    // 台灣區找不到時，依序改查美國、日本

/* ---------- 讀歌單 ---------- */
function parseSongs(text) {
  const lists = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const head = line.match(/^\[(.+)\]$/);
    if (head) { cur = { name: head[1].trim(), songs: [] }; lists.push(cur); return; }
    if (!cur) { cur = { name: "我的歌單", songs: [] }; lists.push(cur); }
    const parts = line.split("|").map(s => s.trim());
    const title = parts[0], artist = parts[1] || "";
    const year = /^\d{4}$/.test(parts[2] || "") ? +parts[2] : null;
    if (title) cur.songs.push({ title, artist, year, line: n + 1 });
  });
  return lists;
}

/* ---------- 比對 ---------- */
function norm(s) {
  return String(s || "")
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\(\[（【].*?[\)\]）】]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[\s　]/g, "")
    .replace(/[「」『』、・·,，.。!！?？\-—_'"’‘“”…:：&＆]/g, "");
}
const keyOf = s => norm(s.title) + "|" + norm(s.artist);

const BAD = /live|instrumental|karaoke|cover|remix|acoustic|伴奏|現場|演唱會|純音樂|鋼琴版|翻唱/i;
const BAD_ALBUM = /第\s*\d+\s*期|演唱會|跨年|金曲撈|我是歌手|蒙面|聲生不息|好聲音|影音全記錄|串燒|卡拉|karaoke|オルゴール|音樂盒|音乐盒|instrumental|伴奏|tribute|lullaby|piano/i;

function score(song, item) {
  const t = norm(item.trackName), a = norm(item.artistName);
  const st = norm(song.title), sa = norm(song.artist);
  let s = 0;
  if (t === st) s += 4;
  else if (t && st && (t.includes(st) || st.includes(t))) s += 2;
  if (!sa) s += 1;
  else if (a === sa) s += 3;
  else if (a && (a.includes(sa) || sa.includes(a))) s += 2;
  if (BAD.test(item.trackName)) s -= 3;
  if (BAD_ALBUM.test(item.collectionName || "")) s -= 5;
  return s;
}

/* ---------- 查 Apple ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastCall = 0;
async function search(term, country, attempt = 1) {
  const wait = lastCall + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const url = "https://itunes.apple.com/search?" +
    new URLSearchParams({ term, media: "music", entity: "song", country, limit: "15" });
  let res;
  try { res = await fetch(url, { headers: { "User-Agent": "friends-hitster/1.0" } }); }
  catch (e) { res = { ok: false, status: e.message }; }
  if (!res.ok) {
    if (attempt <= 3) {
      console.log(`    Apple 回應 ${res.status}，等 ${20 * attempt} 秒再試…`);
      await sleep(20000 * attempt);
      return search(term, country, attempt + 1);
    }
    throw new Error(`Apple 回應 ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).filter(r => r.previewUrl);
}

async function lookup(song) {
  for (const country of COUNTRIES) {
    const results = await search(`${song.title} ${song.artist}`.trim(), country);
    if (!results.length) continue;
    const scored = results.map(r => ({ r, s: score(song, r) })).sort((a, b) => b.s - a.s);
    const best = scored[0];
    if (best.s < 3) continue;
    // 同一首歌可能出現在單曲、專輯、精選輯，取最早發行的那一版當年份
    const same = scored
      .filter(x => x.s >= best.s - 1 && norm(x.r.trackName) === norm(best.r.trackName) &&
                   norm(x.r.artistName) === norm(best.r.artistName) && x.r.releaseDate)
      .sort((a, b) => a.r.releaseDate.localeCompare(b.r.releaseDate));
    const pick = (same[0] || best).r;
    const earliest = same.length ? same[0].r.releaseDate : pick.releaseDate;
    return {
      t: pick.trackName,
      a: pick.artistName,
      y: earliest ? +earliest.slice(0, 4) : null,
      u: pick.previewUrl,
      art: pick.artworkUrl100 || "",
      al: pick.collectionName || "",
      c: best.s >= 6 ? "high" : best.s >= 4 ? "medium" : "low",
      cc: country
    };
  }
  return null;
}

/* ---------- 舊結果 ---------- */
function loadCache() {
  try {
    const src = fs.readFileSync(OUT, "utf8");
    const m = src.match(/window\.SONG_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
    const data = m ? JSON.parse(m[1]) : null;
    const map = new Map();
    (data && data.lists || []).forEach(l => l.songs.forEach(s => s.k && map.set(s.k, s)));
    return map;
  } catch { return new Map(); }
}

/* ---------- 主程式 ---------- */
(async () => {
  const lists = parseSongs(fs.readFileSync(SRC, "utf8"));
  const cache = FORCE ? new Map() : loadCache();
  const missing = [], low = [], fresh = [];
  const total = lists.reduce((n, l) => n + l.songs.length, 0);
  let i = 0;

  for (const list of lists) {
    console.log(`\n[${list.name}]`);
    const out = [];
    for (const song of list.songs) {
      i++;
      const k = keyOf(song);
      let hit = cache.get(k);
      if (!hit) {
        process.stdout.write(`  (${i}/${total}) 查詢 ${song.title} - ${song.artist} … `);
        try { hit = await lookup(song); }
        catch (e) { console.log("失敗：" + e.message); missing.push({ ...song, list: list.name, why: e.message }); continue; }
        if (!hit) { console.log("找不到"); missing.push({ ...song, list: list.name, why: "Apple Music 找不到" }); continue; }
        hit.k = k;
        cache.set(k, hit);
        fresh.push(hit);
        console.log(`${hit.t} / ${hit.a} / ${hit.y}（${hit.c}）`);
      }
      const entry = { ...hit };
      entry.title = song.title;          // 遊戲顯示 songs.txt 裡寫的歌名歌手，比較乾淨
      entry.artist = song.artist || hit.a;
      if (song.year) entry.y = song.year;
      if (hit.c === "low") low.push({ ...song, list: list.name, got: `${hit.t} / ${hit.a}` });
      out.push(entry);
    }
    list.data = out;
  }

  const data = {
    generated: new Date().toISOString(),
    lists: lists.map(l => ({ id: "b-" + norm(l.name), name: l.name, songs: l.data }))
  };
  const header = "/* 這個檔案由 build-songs.js 自動產生，請改 songs.txt，不要直接改這裡。 */\n";
  fs.writeFileSync(OUT, header + "window.SONG_DATA = " + JSON.stringify(data, null, 1) + ";\n");

  /* 報告：顯示在 GitHub Actions 的執行結果頁 */
  const lines = [`## 歌單更新結果`, ``,
    `共 ${total} 首，這次新查 ${fresh.length} 首，找不到 ${missing.length} 首，可能抓錯 ${low.length} 首。`, ``];
  if (missing.length) {
    lines.push(`### 找不到的歌（不會出現在遊戲裡）`, ``, `| 歌單 | songs.txt 第幾行 | 歌名 | 歌手 | 原因 |`, `|---|---|---|---|---|`);
    missing.forEach(m => lines.push(`| ${m.list} | ${m.line} | ${m.title} | ${m.artist} | ${m.why} |`));
    lines.push(``, `可以試著換個寫法，例如用原文歌名，或歌手寫英文名。`, ``);
  }
  if (low.length) {
    lines.push(`### 可能抓錯的歌（請實際聽聽看）`, ``, `| 歌單 | 第幾行 | 你寫的 | 抓到的 |`, `|---|---|---|---|`);
    low.forEach(m => lines.push(`| ${m.list} | ${m.line} | ${m.title} / ${m.artist} | ${m.got} |`));
  }
  const report = lines.join("\n");
  console.log("\n" + report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
})().catch(e => { console.error(e); process.exit(1); });
