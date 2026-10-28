/* 讀 songs.txt，幫每首歌找 YouTube 影片（遊戲用），順便到 Apple Music 查年份和封面，寫成 songs-data.js。
 *
 * 這支程式在 GitHub Actions 上執行（伺服器端，不受瀏覽器限制）。
 * 已經查過的歌會沿用 songs-data.js 裡的結果，只查新加的歌。
 *
 *   node build-songs.js            只查新歌
 *   node build-songs.js --force    全部重查
 *
 * songs.txt 每一行可以寫：
 *   歌名 | 歌手                         自動去 YouTube 找影片
 *   歌名 | 歌手 | 年份                  年份抓錯時自己寫
 *   歌名 | 歌手 | https://youtu.be/xxx  指定要用的影片
 *   歌名 | 歌手 | @1:05                 指定從第幾秒開始播
 *   https://youtu.be/xxx                只貼影片，歌名歌手從影片標題猜
 *   https://www.youtube.com/playlist?list=xxx   整個播放清單展開（最多約 100 首）
 * 歌單標題可以加標籤：[華語金曲 | 華語, 懷舊]
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "songs.txt");
const OUT = path.join(ROOT, "songs-data.js");
const FORCE = process.argv.includes("--force");
const DELAY = +(process.env.SONG_DELAY || 2500);                    // Apple 大約每分鐘只給查 20 次
const YT_DELAY = +(process.env.YT_DELAY || 1200);
const COUNTRIES = ["TW", "US", "JP"];    // 台灣區找不到時，依序改查美國、日本

/* ---------- 讀歌單 ---------- */
const YT_ID = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/|^yt:)([\w-]{11})(?![\w-])/;
const YT_LIST = /youtube\.com\/.*[?&]list=([\w-]+)/;
function parseSongs(text) {
  const lists = [];
  let cur = null;
  const ensure = () => { if (!cur) { cur = { name: "我的歌單", tags: [], songs: [] }; lists.push(cur); } };
  text.split(/\r?\n/).forEach((raw, n) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const head = line.match(/^\[(.+)\]$/);
    if (head) {
      const [name, tags = ""] = head[1].split("|").map(s => s.trim());
      cur = { name, tags: tags.split(/[,，、]/).map(s => s.trim()).filter(Boolean), songs: [] };
      lists.push(cur); return;
    }
    ensure();
    const pl = line.match(YT_LIST);
    if (pl && !YT_ID.test(line)) { cur.songs.push({ playlist: pl[1], line: n + 1 }); return; }
    let year = null, v = null, start = null;
    const rest = [];
    line.split("|").map(s => s.trim()).forEach((p, i) => {
      const id = p.match(YT_ID);
      if (id) { v = id[1]; return; }
      const st = p.match(/^@\s*(?:(\d+):)?(\d+)$/);
      if (st) { start = (+(st[1] || 0)) * 60 + +st[2]; return; }
      if (i >= 2 && /^\d{4}$/.test(p)) { year = +p; return; }
      if (p) rest.push(p);
    });
    const title = rest[0] || "", artist = rest[1] || "";
    if (title || v) cur.songs.push({ title, artist, year, v, start, line: n + 1 });
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

/* ---------- YouTube ---------- */
const YT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
  "Cookie": "CONSENT=YES+1; SOCS=CAI"
};
let ytLast = 0;
async function ytThrottle() {
  const wait = ytLast + YT_DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  ytLast = Date.now();
}
async function ytPage(url, attempt = 1) {
  await ytThrottle();
  let res;
  try { res = await fetch(url, { headers: YT_HEADERS }); } catch (e) { res = { ok: false, status: e.message }; }
  if (!res.ok) {
    if (attempt <= 2) { await sleep(10000 * attempt); return ytPage(url, attempt + 1); }
    throw new Error(`YouTube 回應 ${res.status}`);
  }
  const html = await res.text();
  const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/) ||
            html.match(/ytInitialData"\]\s*=\s*(\{[\s\S]+?\});/);
  if (!m) throw new Error("讀不到 YouTube 頁面資料");
  return JSON.parse(m[1]);
}
const txt = t => !t ? "" : typeof t === "string" ? t : t.simpleText || t.content || (t.runs || []).map(r => r.text).join("");
const secs = s => s ? String(s).split(":").reduce((a, b) => a * 60 + (+b || 0), 0) : 0;
function collectVideos(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { node.forEach(n => collectVideos(n, out)); return out; }
  for (const [k, v] of Object.entries(node)) {
    if (/^(videoRenderer|playlistVideoRenderer|compactVideoRenderer)$/.test(k) && v && v.videoId) {
      const lt = txt(v.lengthText);
      out.push({
        v: v.videoId, vt: txt(v.title),
        ch: txt(v.ownerText || v.shortBylineText || v.longBylineText),
        d: v.lengthSeconds ? +v.lengthSeconds : secs(lt),
        live: !lt && !v.lengthSeconds
      });
    } else if (k === "lockupViewModel" && v && v.contentId && /VIDEO/.test(v.contentType || "")) {
      const meta = v.metadata && v.metadata.lockupMetadataViewModel || {};
      out.push({ v: v.contentId, vt: txt(meta.title), ch: "", d: 0, live: false });
    } else collectVideos(v, out);
  }
  return out;
}
const normV = s => String(s || "").replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  .toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const YT_BAD = /live|現場|演唱會|concert|cover|翻唱|karaoke|伴奏|卡拉|instrumental|純音樂|鋼琴|piano|remix|reaction|hour|小時|循環|loop|教學|tutorial|8d|sped ?up|slowed|nightcore|彈唱|舞蹈|dance practice|shorts/i;
/* 不是原版的來源：電視台／綜藝頻道、搬運號、歌詞號、KTV 伴唱，還有標題上寫著節目或舞台版的 */
const REPOST_CH = /芒果|mango|湖南衛視|湖南卫视|浙江衛視|浙江卫视|東方衛視|东方卫视|江蘇衛視|江苏卫视|北京衛視|北京卫视|衛視|卫视|央視|央视|cctv|中國好聲音|中国好声音|好聲音|我是歌手|聲生不息|天籟之戰|綜藝|综艺|電視|电视|tv$|抖音|tiktok|ktv|卡拉|伴奏|搬運|搬运|bilibili|嗶哩|歌詞|歌词|lyrics?|翻唱|cover|音樂分享|熱門歌曲|熱門音樂|金曲串燒|經典老歌|懷舊|老歌|playlist|歌單/i;
const REPOST_VT = /我是歌手|聲生不息|声生不息|蒙面唱將|蒙面歌王|中國好聲音|中国好声音|天籟之戰|歌手當打|歌手2\d{3}|披荊斬棘|乘風破浪|乘风破浪|跨年|晚會|晚会|春晚|舞台純享|舞台纯享|純享版|纯享版|綜藝|综艺|reaction|合唱版|對唱版|串燒|串烧|\bdj\b|dj版|抖音|鈴聲|铃声|動態歌詞|动态歌词|歌詞版|歌词版|lyrics? video|\blyrics?\b|\d+\s*(?:首|曲)|合輯|合集|精選|精选|full album|完整專輯/i;
const isRepost = r => REPOST_CH.test(r.ch || "") || REPOST_VT.test(r.vt || "");
function ytScore(song, r) {
  const T = normV(r.vt), C = normV(r.ch), st = normV(song.title), sa = normV(song.artist);
  let s = 0;
  if (st && T.includes(st)) s += 4;
  if (sa && (T.includes(sa) || C.includes(sa))) s += 3;
  if (/official|官方|\bmv\b|music video|ミュージックビデオ|뮤직비디오|完整版/i.test(r.vt)) s += 1;
  if (/vevo|official|官方|唱片|records|music/i.test(r.ch)) s += 1;
  if (YT_BAD.test(r.vt) && !YT_BAD.test(song.title)) s -= 4;
  /* 盡量抓原版：歌手自己的頻道、唱片公司、YouTube 自動產生的「- Topic」加分；電視台、搬運號、綜藝舞台版扣分 */
  if (sa && C.includes(sa)) s += 2;
  if (/- topic$/i.test(r.ch || "")) s += 2;
  if (REPOST_CH.test(r.ch || "") && !(sa && C.includes(sa))) s -= 3;
  if (REPOST_VT.test(r.vt || "") && !REPOST_VT.test(song.title)) s -= 3;
  if (r.d && (r.d < 60 || r.d > 600)) s -= 5;
  if (r.live) s -= 5;
  return s;
}
/* 影片能不能嵌入：oEmbed 對禁止嵌入的影片會回 401 */
async function ytMeta(v) {
  await ytThrottle();
  try {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=" +
      encodeURIComponent("https://www.youtube.com/watch?v=" + v), { headers: YT_HEADERS });
    if (res.status === 401 || res.status === 403) return { embeddable: false };
    if (!res.ok) return null;
    const d = await res.json();
    return { embeddable: true, vt: d.title || "", ch: d.author_name || "" };
  } catch { return null; }
}
async function ytSearch(song) {
  const q = `${song.title} ${song.artist}`.trim();
  const data = await ytPage("https://www.youtube.com/results?hl=zh-TW&gl=TW&search_query=" + encodeURIComponent(q));
  const seen = new Set();
  const cands = collectVideos(data).filter(r => !seen.has(r.v) && seen.add(r.v))
    .map(r => ({ r, s: ytScore(song, r) })).filter(x => x.s >= 4).sort((a, b) => b.s - a.s);
  for (const { r, s } of cands.slice(0, 4)) {
    const meta = await ytMeta(r.v);
    if (meta && !meta.embeddable) continue;
    return { v: r.v, vt: r.vt, ch: r.ch, d: r.d || 0, yc: s >= 8 ? "high" : s >= 6 ? "medium" : "low" };
  }
  return null;
}
/* 從影片標題猜歌名和歌手：「歌手《歌名》」「歌手 - 歌名 (Official MV)」 */
function guessSong(vt, ch) {
  const s = String(vt || "").replace(/[\(\[（【][^\)\]）】]*[\)\]）】]/g, " ").replace(/\s+/g, " ").trim();
  const chName = String(ch || "").replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const q = String(vt || "").match(/[《「『](.+?)[》」』]/);
  if (q) return { title: q[1].trim(), artist: String(vt).split(/[《「『【]/)[0].replace(/[\s\-–—|｜:：]+$/, "").trim() || chName };
  const parts = s.split(/\s+[-–—|｜]\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts[1].replace(/\b(official|music|video|mv|lyrics?|audio|hd|4k)\b/gi, "").trim() || parts[1].trim() };
  return { title: s || vt, artist: chName };
}
async function expandPlaylist(id) {
  const data = await ytPage("https://www.youtube.com/playlist?hl=zh-TW&list=" + encodeURIComponent(id));
  const seen = new Set();
  return collectVideos(data).filter(r => r.v && !seen.has(r.v) && seen.add(r.v) && !/^\[(deleted|private)/i.test(r.vt));
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
const CACHE_FIELDS = ["t", "a", "y", "u", "art", "al", "c", "cc", "v", "vt", "ch", "d", "yc", "an"];
const pickCache = h => Object.fromEntries(CACHE_FIELDS.filter(f => h[f] !== undefined).map(f => [f, h[f]]));

/* ---------- 主程式 ---------- */
(async () => {
  const lists = parseSongs(fs.readFileSync(SRC, "utf8"));
  const cache = FORCE ? new Map() : loadCache();
  const missing = [], low = [], fresh = [];
  let ytDown = 0;
  const total = lists.reduce((n, l) => n + l.songs.length, 0);
  let i = 0;

  for (const list of lists) {
    console.log(`\n[${list.name}]`);
    const out = [], used = new Set();
    for (const song of list.songs) {
      i++;
      /* 整個播放清單 */
      if (song.playlist) {
        process.stdout.write(`  (${i}/${total}) 展開播放清單 ${song.playlist} … `);
        let items = [];
        try { items = await expandPlaylist(song.playlist); }
        catch (e) { console.log("失敗：" + e.message); missing.push({ title: "播放清單 " + song.playlist, artist: "", line: song.line, list: list.name, why: e.message }); continue; }
        console.log(`${items.length} 首`);
        for (const r of items) {
          if (used.has(r.v)) continue;
          const k = "yt:" + r.v;
          const hit = { ...(cache.get(k) || {}), v: r.v, vt: r.vt || (cache.get(k) || {}).vt, ch: r.ch || (cache.get(k) || {}).ch, d: r.d || (cache.get(k) || {}).d || 0, k };
          const g = guessSong(hit.vt, hit.ch);
          cache.set(k, hit); used.add(r.v);
          out.push({ ...hit, title: g.title, artist: g.artist });
        }
        continue;
      }

      const k = song.title ? keyOf(song) : "yt:" + song.v;
      const old = cache.get(k);
      const hit = { ...(old || {}) };
      let changed = false;
      const label = song.title ? `${song.title} - ${song.artist}` : song.v;

      /* YouTube 影片 */
      if (song.v && hit.v !== song.v) {
        hit.v = song.v; hit.yc = "manual"; changed = true;
        const meta = await ytMeta(song.v);
        if (meta) { hit.vt = meta.vt; hit.ch = meta.ch; if (!meta.embeddable) hit.noembed = true; }
      }
      /* 以前抓到的如果是電視台／搬運版，重新找一次原版；找不到更好的就維持原樣 */
      if (!song.v && song.title && hit.v && hit.yc !== "manual" && isRepost(hit)) {
        process.stdout.write(`  (${i}/${total}) 換原版 ${label}（現在是 ${hit.ch || hit.vt}）… `);
        try {
          const r = await ytSearch(song);
          if (r && r.v !== hit.v && !isRepost(r)) { Object.assign(hit, r); changed = true; delete hit.noembed; console.log(`${r.vt}（${r.ch}）`); }
          else console.log("沒有更好的，維持原樣");
        } catch (e) { ytDown++; console.log("失敗：" + e.message); }
      }
      if (!hit.v && song.title) {
        process.stdout.write(`  (${i}/${total}) YouTube 找 ${label} … `);
        try {
          const r = await ytSearch(song);
          if (r) { Object.assign(hit, r); changed = true; console.log(`${r.vt}（${r.yc}）`); }
          else console.log("找不到");
        } catch (e) { ytDown++; console.log("失敗：" + e.message); }
      }

      /* Apple Music：年份和封面（找不到也沒關係） */
      if (song.title && !hit.u && !hit.an) {
        process.stdout.write(`  (${i}/${total}) Apple 查 ${label} … `);
        try {
          const a = await lookup(song);
          if (a) { Object.assign(hit, a); console.log(`${a.y}`); } else { hit.an = 1; console.log("找不到"); }
          changed = true;
        } catch (e) { console.log("失敗：" + e.message); }
      }

      if (!hit.v) {
        missing.push({ ...song, list: list.name, why: song.v ? "影片讀不到" : "YouTube 找不到合適的影片" });
        if (changed) cache.set(k, { ...pickCache(hit), k });
        continue;
      }
      if (hit.noembed) missing.push({ ...song, list: list.name, why: "這支影片不允許嵌入其他網站播放，請換一支" });
      const clean = { ...pickCache(hit), k };
      cache.set(k, clean);
      if (changed) fresh.push(clean);
      if (used.has(clean.v)) continue;
      used.add(clean.v);

      const g = song.title ? null : guessSong(clean.vt, clean.ch);
      const entry = { ...clean };
      entry.title = song.title || g.title;       // 遊戲顯示 songs.txt 裡寫的歌名歌手，比較乾淨
      entry.artist = song.artist || (g ? g.artist : clean.a || "");
      if (song.year) entry.y = song.year;
      if (song.start != null) entry.s = song.start;
      if (clean.yc === "low") low.push({ ...song, list: list.name, got: clean.vt, v: clean.v });
      out.push(entry);
    }
    list.data = out;
  }

  const data = {
    generated: new Date().toISOString(),
    lists: lists.map(l => ({ id: "b-" + norm(l.name), name: l.name, tags: l.tags, songs: l.data }))
  };
  const header = "/* 這個檔案由 build-songs.js 自動產生，請改 songs.txt，不要直接改這裡。 */\n";
  fs.writeFileSync(OUT, header + "window.SONG_DATA = " + JSON.stringify(data, null, 1) + ";\n");

  /* 報告：顯示在 GitHub Actions 的執行結果頁 */
  const ready = lists.reduce((n, l) => n + l.data.length, 0);
  const lines = [`## 歌單更新結果`, ``,
    `共 ${ready} 首可以玩，這次新查 ${fresh.length} 首，有問題 ${missing.length} 首，影片可能抓錯 ${low.length} 首。`, ``];
  if (ytDown) lines.push(`> ⚠️ 有 ${ytDown} 次連不上 YouTube，下次執行會自動再試。`, ``);
  if (missing.length) {
    lines.push(`### 有問題的歌（不會出現在遊戲裡）`, ``, `| 歌單 | songs.txt 第幾行 | 歌名 | 歌手 | 原因 |`, `|---|---|---|---|---|`);
    missing.forEach(m => lines.push(`| ${m.list} | ${m.line} | ${m.title} | ${m.artist} | ${m.why} |`));
    lines.push(``, `可以在那一行後面加上 \`| https://youtu.be/影片ID\` 指定影片。`, ``);
  }
  if (low.length) {
    lines.push(`### 影片可能抓錯（請點開看看）`, ``, `| 歌單 | 第幾行 | 你寫的 | 抓到的影片 |`, `|---|---|---|---|`);
    low.forEach(m => lines.push(`| ${m.list} | ${m.line} | ${m.title} / ${m.artist} | [${m.got}](https://youtu.be/${m.v}) |`));
  }
  const report = lines.join("\n");
  console.log("\n" + report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
})().catch(e => { console.error(e); process.exit(1); });
