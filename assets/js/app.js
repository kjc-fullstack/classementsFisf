/* ============================================================
   Classements FISF — application web (SPA, sans framework)
   Routeur par hash : #/ #/classique #/joueur/<disc>/<lic> …
   ============================================================ */
'use strict';

/* ---------------- Utilitaires ---------------- */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 0) => n == null || isNaN(n) ? '—'
  : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

const FLAGS = {
  FR: '🇫🇷', QC: '🇨🇦', CA: '🇨🇦', BE: '🇧🇪', CD: '🇨🇩', BJ: '🇧🇯', CH: '🇨🇭', SN: '🇸🇳',
  CI: '🇨🇮', CM: '🇨🇲', NE: '🇳🇪', BF: '🇧🇫', TN: '🇹🇳', MA: '🇲🇦', CG: '🇨🇬', LB: '🇱🇧',
  TG: '🇹🇬', GA: '🇬🇦', ML: '🇲🇱', MU: '🇲🇺', MG: '🇲🇬', MR: '🇲🇷', IT: '🇮🇹', GN: '🇬🇳',
  RO: '🇷🇴', TD: '🇹🇩', DZ: '🇩🇿', GR: '🇬🇷', UK: '🇬🇧', LU: '🇱🇺', MC: '🇲🇨', NZ: '🇳🇿',
  NG: '🇳🇬', CF: '🇨🇫', KM: '🇰🇲', NL: '🇳🇱', DE: '🇩🇪', SE: '🇸🇪', PT: '🇵🇹', BG: '🇧🇬',
  ES: '🇪🇸', US: '🇺🇸', RE: '🇷🇪'
};
const flag = c => FLAGS[String(c || '').toUpperCase()] || '🏳️';
/* Drapeaux : images PNG locales — les émojis drapeaux ne s'affichent pas sous Windows */
const FLAG_FILES = new Set(['FR', 'QC', 'BE', 'CD', 'BJ', 'CH', 'SN', 'CI', 'CM', 'NE', 'BF', 'TN',
  'MA', 'CG', 'LB', 'TG', 'GA', 'ML', 'MU', 'MG', 'MR', 'IT', 'GN', 'RO', 'TD', 'DZ', 'GR', 'UK',
  'LU', 'MC', 'NZ', 'NG', 'CF', 'KM', 'CA', 'NL', 'DE', 'SE', 'PT', 'BG', 'ES', 'US', 'RE']);
const flagTag = c => {
  const code = String(c || '').toUpperCase();
  if (FLAG_FILES.has(code)) {
    return `<img class="flag" src="assets/img/flags/${code}.png" alt="${esc(code)}" title="${esc(code)}" width="20" height="15" loading="lazy">`;
  }
  return `<span class="flag flag-emoji" role="img" aria-label="${esc(code)}" title="${esc(code)}">${flag(code)}</span>`;
};

/* Séries pertinentes pour un joueur : la sienne, celle d'avant et celle d'après.
   Série 1 -> S1,S2 · Série 2 -> S1,S2,S3 · … · Série 6 -> S5,S6 */
function relSeriesOf(s26) {
  const m = SERIE_RE.exec(String(s26 || '').trim());
  const n = m ? parseInt(m[1], 10) : null;
  if (!n) return [1, 2, 3, 4, 5, 6];
  if (n <= 1) return [1, 2];
  if (n >= 6) return [5, 6];
  return [n - 1, n, n + 1];
}
/* numéro de la série du joueur (1..6) et son %S correspondant */
function ownSerieNum(p) {
  const m = SERIE_RE.exec(String(p.s26 || '').trim());
  return m ? parseInt(m[1], 10) : null;
}
function ownSVal(p) {
  const n = ownSerieNum(p);
  return n ? (p['s' + Math.min(6, Math.max(1, n))] ?? null) : null;
}
/* les %S pertinents : [['S2', v2], ['S3', v3], ['S4', v4]] */
function sTrio(p) {
  return relSeriesOf(p.s26).map(i => ['S' + i, p['s' + i] ?? null]);
}
/* libellé expliquant quelles séries comptent pour lui */
function sTrioPhrase(p) {
  const t = sTrio(p).map(x => '%' + x[0]);
  const list = t.length <= 2 ? t.join(' et ') : t.slice(0, -1).join(', ') + ' et ' + t[t.length - 1];
  return `ce sont ${list} qui comptent : sa série (${esc(p.s26)}), la série précédente et la suivante`;
}

const AGE_CATS = [
  [2009, 2999, 'moins de 18 ans'], [2002, 2008, '18-24 ans'], [1987, 2001, '25-39 ans'],
  [1972, 1986, '40-54 ans'], [1957, 1971, '55-64 ans'], [0, 1956, '65 ans et +'],
];
function ageCategoryLabel(birthYear) {
  const c = AGE_CATS.find(c => birthYear >= c[0] && birthYear <= c[1]);
  return c ? c[2] : 'catégorie inconnue';
}

const SERIE_RE = /^(\d)([A-D])?$/;
function serieRank(s) {
  if (s == null || s === '') return 999;
  const m = SERIE_RE.exec(String(s).trim());
  if (!m) return String(s).trim() === '7' ? 70 : 999;
  return parseInt(m[1], 10) * 10 + (m[2] ? m[2].charCodeAt(0) - 64 : 0);
}
function serieClass(s) {
  const r = serieRank(s);
  if (r <= 19) return 's1';
  if (r <= 39) return 's2';
  if (r <= 59) return 's3';
  return '';
}
function serieChange(p) {
  if (!p.s25 || !p.s26 || p.s25 === p.s26) return '';
  const up = serieRank(p.s26) < serieRank(p.s25);
  return `<span class="tag ser-change ${up ? 'up' : 'down'}" title="Série ${p.s25} → ${p.s26}">${up ? '▲' : '▼'} ${esc(p.s25)}→${esc(p.s26)}</span>`;
}
function deltaInfo(p) {
  if (p.nw || p.pv == null) return { cls: 'new', label: 'Nouveau' };
  const d = p.pv - p.pl;
  if (d > 0) return { cls: 'up', label: `▲ ${d}` };
  if (d < 0) return { cls: 'down', label: `▼ ${-d}` };
  return { cls: 'flat', label: '—' };
}
const fullName = p => `${p.nom} ${p.pre}`.trim();
const initials = p => ((p.pre?.[0] || '') + (p.nom?.[0] || '')).toUpperCase() || '?';

/* ---------------- Stockage local ---------------- */
const LS = {
  profiles: 'fisf_profiles_v1',
  settings: 'fisf_settings_v1',
  pub: d => 'fisf_pub_' + d,
};
const Store = {
  read(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  write(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  remove(k) { localStorage.removeItem(k); },
  profiles() { return this.read(LS.profiles, {}); },
  saveProfile(lic, prof) { const all = this.profiles(); if (prof) all[lic] = prof; else delete all[lic]; this.write(LS.profiles, all); },
  pub(disc) { return this.read(LS.pub(disc), null); },
  savePub(disc, payload) { this.write(LS.pub(disc), payload); },
  settings() { return this.read(LS.settings, { pass: 'fisf2026' }); },
  saveSettings(s) { this.write(LS.settings, s); },
  isAdmin() { return sessionStorage.getItem('fisf_admin') === '1'; },
  setAdmin(v) { v ? sessionStorage.setItem('fisf_admin', '1') : sessionStorage.removeItem('fisf_admin'); },
};

/* ---------------- Accès aux données ---------------- */
function getDisc(disc) {
  const base = window.FISF_DATA.disciplines[disc];
  const pub = Store.pub(disc);
  const src = pub || base;
  const countries = {}, series = {};
  for (const p of src.players) {
    countries[p.pay] = (countries[p.pay] || 0) + 1;
    series[p.s26] = (series[p.s26] || 0) + 1;
  }
  return {
    disc, players: src.players, hist: src.hist || {},
    snapshots: src.snapshots || window.FISF_DATA.snapshots,
    simulated: pub ? false : !!window.FISF_DATA.simulated,
    publishedAt: pub ? pub.publishedAt : window.FISF_DATA.generated,
    countries, series,
  };
}
function byLicMap(players) {
  const m = new Map();
  for (const p of players) m.set(String(p.lic), p);
  return m;
}
function profileOf(lic) { return Store.profiles()[String(lic)] || null; }

/* ---------------- Graphiques (ECharts) ---------------- */
const PALETTE = ['#57cf82', '#e8b53a', '#5aa9e6', '#e06565', '#b07de0', '#e0905a',
  '#6fd3c7', '#d96fa7', '#9bc36f', '#f0d264', '#8ea2ff', '#ff9d5c'];
const Charts = {
  instances: [],
  make(el, opt) {
    if (!el) return;
    if (!window.echarts) {
      el.innerHTML = '<div class="chart-fallback">Graphique indisponible sans connexion<br>(bibliothèque ECharts non chargée)</div>';
      return;
    }
    const c = echarts.init(el, null, { renderer: 'canvas' });
    const base = { textStyle: { color: '#9db3a2', fontFamily: 'Segoe UI, sans-serif' },
      color: PALETTE, backgroundColor: 'transparent' };
    try { c.setOption(Object.assign(base, opt)); }
    catch (err) {
      el.innerHTML = `<div class="chart-fallback">Graphique indisponible (${esc(err.message)})</div>`;
      c.dispose();
      return;
    }
    this.instances.push(c);
    return c;
  },
  disposeAll() { this.instances.forEach(c => c.dispose()); this.instances = []; },
};
const axisStyle = {
  axisLine: { lineStyle: { color: '#2a3a2e' } },
  axisLabel: { color: '#9db3a2' },
  splitLine: { lineStyle: { color: 'rgba(42,58,46,.5)' } },
};

/* ---------------- Animations ---------------- */
function countUpAll(root) {
  $$('[data-count]', root).forEach((el, i) => {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (isNaN(target)) { el.textContent = '—'; return; }
    const dur = 750, delay = Math.min(i, 30) * 22;
    const t0 = performance.now() + delay;
    function frame(t) {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(target * e, dec);
      if (k < 1) requestAnimationFrame(frame);
      else el.textContent = fmt(target, dec);
    }
    requestAnimationFrame(frame);
  });
}
/* FLIP : anime le réordonnancement des lignes existantes */
function flip(container, rebuild) {
  const old = new Map();
  $$('[data-key]', container).forEach(el => old.set(el.dataset.key, el.getBoundingClientRect()));
  rebuild();
  $$('[data-key]', container).forEach(el => {
    const o = old.get(el.dataset.key);
    el.classList.remove('enter');
    el.style.animation = 'none';
    if (!o) return;
    const n = el.getBoundingClientRect();
    const dx = o.left - n.left, dy = o.top - n.top;
    if (!dx && !dy) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(() => {
      el.style.transition = 'transform .38s cubic-bezier(.2,.7,.25,1)';
      el.style.transform = '';
    });
  });
}

/* ---------------- Routeur ---------------- */
const view = () => $('#view');
function setActiveNav(seg) {
  const key = seg === 'classique' ? '' : (seg || '');
  $$('#nav a').forEach(a => a.classList.toggle('active',
    (a.dataset.route || '') === (key === 'joueur' || key === 'duplicate' ? '' : key)));
}
function route() {
  Charts.disposeAll();
  const hash = location.hash.replace(/^#\/?/, '');
  const [seg, a, b] = hash.split('/');
  setActiveNav(seg || '');
  window.scrollTo({ top: 0 });
  $('#nav').classList.remove('open');
  const v = view();
  if (seg === 'joueur') renderPlayer(v, a, b);
  else if (seg === 'nouveautes') renderNews(v);
  else if (seg === 'records') renderRecords(v);
  else if (seg === 'duels') renderDuel(v, a, b);
  else if (seg === 'quiz') renderQuiz(v);
  else if (seg === 'admin') renderAdmin(v);
  else renderLeaderboard(v, seg === 'classique' ? 'classic' : 'duplicate');
}
window.addEventListener('hashchange', route);

/* ============================================================
   VUE : CLASSEMENT
   ============================================================ */
const LB = { q: '', pay: '', series: new Set(), sort: 'pl', dir: 1, view: null, page: 1, disc: 'duplicate' };
const PAGE_SIZE = 100;
const metricOf = (p, disc) => disc === 'duplicate' ? ownSVal(p) : p.cote;

function lbFiltered(D) {
  const q = LB.q.trim().toLowerCase();
  let out = D.players;
  if (q) out = out.filter(p => fullName(p).toLowerCase().includes(q) || (p.club || '').toLowerCase().includes(q));
  if (LB.pay) out = out.filter(p => p.pay === LB.pay);
  if (LB.series.size) out = out.filter(p => LB.series.has(p.s26));
  const dir = LB.dir;
  const sorters = {
    pl:   (x, y) => (x.pl - y.pl) * dir,
    sc:   (x, y) => (((metricOf(y, LB.disc) ?? -1e9) - (metricOf(x, LB.disc) ?? -1e9))) * dir,
    mouv: (x, y) => (((y.pv ?? 1e7) - y.pl) - ((x.pv ?? 1e7) - x.pl)) * dir,
    nom:  (x, y) => fullName(x).localeCompare(fullName(y), 'fr') * dir,
  };
  return out.slice().sort(sorters[LB.sort] || sorters.pl);
}

function lbRowHtml(p, disc, i) {
  const d = deltaInfo(p);
  const medal = p.pl === 1 ? ' 🥇' : p.pl === 2 ? ' 🥈' : p.pl === 3 ? ' 🥉' : '';
  const topCls = p.pl <= 3 ? `top${p.pl}` : '';
  if (disc === 'duplicate') return `<tr class="enter ${topCls}" data-key="${p.lic}" style="animation-delay:${Math.min(i, 40) * 18}ms">
    <td class="pl">${fmt(p.pl)}${medal}</td>
    <td class="who"><span class="nm">${esc(fullName(p))}</span>${p.nw ? '<span class="badge-new">NOUVEAU</span>' : ''}
      <div class="meta">${flagTag(p.pay)} club ${esc(p.club || '—')}</div></td>
    <td><span class="tag ${serieClass(p.s26)}">${esc(p.s26)}</span>${serieChange(p)}</td>
    <td class="num"><span class="score" data-count="${ownSVal(p)}" data-dec="2">0</span><div class="meta" style="color:var(--dim);font-size:.72rem">%S${ownSerieNum(p) || '—'} (sa série)</div></td>
    <td class="num"><span class="delta ${d.cls}">${d.label}</span></td>
  </tr>`;
  return `<tr class="enter ${topCls}" data-key="${p.lic}" style="animation-delay:${Math.min(i, 40) * 18}ms">
    <td class="pl">${fmt(p.pl)}${medal}</td>
    <td class="who"><span class="nm">${esc(fullName(p))}</span>${p.nw ? '<span class="badge-new">NOUVEAU</span>' : ''}
      <div class="meta">${flagTag(p.pay)} club ${esc(p.club || '—')}</div></td>
    <td><span class="tag ${serieClass(p.s26)}">${esc(p.s26)}</span>${serieChange(p)}</td>
    <td class="num"><span class="score" data-count="${p.cote}" data-dec="0">0</span></td>
    <td class="num">${fmt(p.v)} / ${fmt(p.n)} / ${fmt(p.d)}<div class="meta" style="color:var(--dim);font-size:.72rem">V · N · D (${fmt(p.matchs)})</div></td>
    <td class="num" style="color:var(--muted)">${fmt(p.cmin)}–${fmt(p.cmax)}</td>
    <td class="num"><span class="delta ${d.cls}">${d.label}</span></td>
  </tr>`;
}

function lbCardHtml(p, disc, i) {
  const d = deltaInfo(p);
  const main = disc === 'duplicate'
    ? `<span class="score" data-count="${ownSVal(p)}" data-dec="2">0</span><small> % (%S${ownSerieNum(p) || '—'})</small>`
    : `<span class="score" data-count="${p.cote}" data-dec="0">0</span><small> pts</small>`;
  return `<div class="card" data-key="${p.lic}" style="animation-delay:${Math.min(i, 40) * 18}ms">
    <div class="rank">#${fmt(p.pl)} ${p.pl <= 3 ? ['🥇', '🥈', '🥉'][p.pl - 1] : ''}</div>
    <h4>${esc(fullName(p))}${p.nw ? '<span class="badge-new">NOUVEAU</span>' : ''}</h4>
    <div class="meta">${flagTag(p.pay)} ${esc(p.club || '—')}</div>
    <div class="foot"><span class="tag ${serieClass(p.s26)}">${esc(p.s26)}</span><span>${main}</span></div>
    <div class="meta" style="margin-top:.35rem"><span class="delta ${d.cls}">${d.label}</span>${serieChange(p)}</div>
  </div>`;
}

function renderLeaderboard(v, disc) {
  if (LB.disc !== disc) { LB.q = ''; LB.pay = ''; LB.series = new Set(); LB.sort = 'pl'; LB.dir = 1; LB.page = 1; LB.view = null; }
  LB.disc = disc;
  if (LB.view === null) LB.view = matchMedia('(max-width: 720px)').matches ? 'cards' : 'table';
  const D = getDisc(disc);
  const isDup = disc === 'duplicate';
  const title = isDup ? 'Duplicate' : 'Classique';

  v.innerHTML = `
  <div class="page-head">
    <h1>Classement ${title}</h1>
    <span class="sub">${fmt(D.players.length)} joueurs · ${Object.keys(D.countries).length} pays · publié le ${esc(D.publishedAt)}</span>
    <span class="spacer"></span>
    <div class="disc-tabs">
      <button class="${isDup ? 'active' : ''}" data-go="">Duplicate</button>
      <button class="${!isDup ? 'active' : ''}" data-go="classique">Classique</button>
    </div>
  </div>

  <div class="panel">
    <div class="filters">
      <div class="field">
        <label for="f-q">Recherche</label>
        <input id="f-q" class="input" type="search" placeholder="Nom ou club…" value="${esc(LB.q)}" style="width:190px">
      </div>
      <div class="field">
        <label for="f-pay">Pays</label>
        <select id="f-pay" class="input"><option value="">Tous les pays</option></select>
      </div>
      <div class="field" style="flex:1;min-width:220px">
        <label>Séries</label>
        <div class="chips" id="f-series"></div>
      </div>
      <div class="field">
        <label for="f-sort">Tri</label>
        <select id="f-sort" class="input">
          <option value="pl">Classement</option>
          <option value="sc">${isDup ? '%S de sa série' : 'Cote'}</option>
          <option value="mouv">Mouvement</option>
          <option value="nom">Nom A→Z</option>
        </select>
      </div>
      <div class="field">
        <label>Vue</label>
        <div class="seg">
          <button data-view="table" class="${LB.view === 'table' ? 'active' : ''}">Tableau</button>
          <button data-view="cards" class="${LB.view === 'cards' ? 'active' : ''}">Cartes</button>
        </div>
      </div>
    </div>
    <div class="active-filters" id="af-pills"></div>
    <div class="count-line" id="lb-count"></div>
    <div id="lb-body"></div>
    <div class="pager" id="lb-pager"></div>
  </div>

  <div class="charts-grid">
    <div class="panel"><h3>Course au sommet <small>places du top 20 sur les derniers snapshots${D.simulated ? ' (simulé)' : ''}</small></h3><div class="chart-box tall" id="ch-bump"></div></div>
    ${isDup
      ? `<div class="panel"><h3>Mouvements de séries <small>matrice de transition 2025-26 → 2026-27</small></h3><div class="chart-box tall" id="ch-sankey"></div></div>`
      : `<div class="panel"><h3>Cote vs expérience <small>échantillon de 1 500 joueurs</small></h3><div class="chart-box tall" id="ch-scatter"></div></div>`}
    <div class="panel"><h3>Top pays <small>nombre de joueurs classés</small></h3><div class="chart-box" id="ch-countries"></div></div>
    <div class="panel"><h3>${isDup ? 'Distribution des %S de série' : 'Distribution des cotes'}</h3><div class="chart-box" id="ch-hist"></div></div>
  </div>
  ${isDup ? barresPanel() : ''}`;

  /* événements onglets discipline */
  $$('.disc-tabs button', v).forEach(b => b.onclick = () => { location.hash = b.dataset.go ? '#/' + b.dataset.go : '#/'; });

  /* pays */
  const paySel = $('#f-pay', v);
  const sorted = Object.entries(D.countries).sort((a, b) => b[1] - a[1]);
  paySel.innerHTML = '<option value="">Tous les pays</option>' +
    sorted.map(([c, n]) => `<option value="${esc(c)}" ${LB.pay === c ? 'selected' : ''}>${esc(c)} (${fmt(n)})</option>`).join('');
  paySel.onchange = () => { LB.pay = paySel.value; LB.page = 1; update(true); };

  /* séries */
  const serChips = $('#f-series', v);
  const serSorted = Object.entries(D.series).sort((a, b) => serieRank(a[0]) - serieRank(b[0]));
  serChips.innerHTML = serSorted.map(([s, n]) =>
    `<span class="chip ${LB.series.has(s) ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}<span class="n">${fmt(n)}</span></span>`).join('');
  $$('.chip', serChips).forEach(ch => ch.onclick = () => {
    const s = ch.dataset.s;
    LB.series.has(s) ? LB.series.delete(s) : LB.series.add(s);
    ch.classList.toggle('on');
    LB.page = 1; update(true);
  });

  /* recherche (debounce) */
  let tmr;
  $('#f-q', v).oninput = e => { clearTimeout(tmr); tmr = setTimeout(() => { LB.q = e.target.value; LB.page = 1; update(true); }, 160); };

  /* tri */
  const sortSel = $('#f-sort', v);
  sortSel.value = LB.sort;
  sortSel.onchange = () => { LB.sort = sortSel.value; LB.dir = 1; LB.page = 1; update(true); };

  /* vue */
  $$('[data-view]', v).forEach(b => b.onclick = () => {
    LB.view = b.dataset.view;
    $$('[data-view]', v).forEach(x => x.classList.toggle('active', x === b));
    update(false);
  });

  /* pilules des filtres actifs (toujours visibles, retirables une à une) */
  function renderPills() {
    const box = $('#af-pills', v);
    const pills = [];
    if (LB.q.trim()) pills.push({ k: 'q', html: `🔎 « ${esc(LB.q.trim())} »` });
    if (LB.pay) pills.push({ k: 'pay', html: `${flagTag(LB.pay)} ${esc(LB.pay)}` });
    for (const s of LB.series) pills.push({ k: 's:' + s, html: `Série <b>${esc(s)}</b>` });
    box.innerHTML = pills.length
      ? pills.map(p => `<span class="chip on" data-k="${p.k}">${p.html} <span class="x">✕</span></span>`).join('')
        + ' <span class="chip af-clear" data-k="all">Tout effacer</span>'
      : '';
    $$('.chip', box).forEach(c => c.onclick = () => {
      const k = c.dataset.k;
      if (k === 'all') {
        LB.q = ''; LB.pay = ''; LB.series.clear();
        $('#f-q', v).value = ''; paySel.value = '';
        $$('#f-series .chip', v).forEach(x => x.classList.remove('on'));
      } else if (k === 'q') { LB.q = ''; $('#f-q', v).value = ''; }
      else if (k === 'pay') { LB.pay = ''; paySel.value = ''; }
      else {
        const s = k.slice(2);
        LB.series.delete(s);
        const ch = $(`#f-series .chip[data-s="${s}"]`, v);
        if (ch) ch.classList.remove('on');
      }
      LB.page = 1; update(true);
    });
  }

  /* pagination numérotée */
  function renderPager(total) {
    const pg = $('#lb-pager', v);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (LB.page > pages) LB.page = pages;
    const cur = LB.page;
    if (total <= PAGE_SIZE) { pg.innerHTML = ''; return; }
    const btn = (label, page, cls = '', dis = false) =>
      `<button data-p="${page}" class="${cls}" ${dis ? 'disabled' : ''}>${label}</button>`;
    const nums = [];
    for (let n = Math.max(1, cur - 2); n <= Math.min(pages, cur + 2); n++) nums.push(n);
    let html = btn('«', 1, '', cur === 1) + btn('‹', cur - 1, '', cur === 1);
    if (nums[0] > 1) html += btn('1', 1) + (nums[0] > 2 ? '<span class="dots">…</span>' : '');
    nums.forEach(n => html += btn(n, n, n === cur ? 'cur' : ''));
    if (nums[nums.length - 1] < pages) html += (nums[nums.length - 1] < pages - 1 ? '<span class="dots">…</span>' : '') + btn(pages, pages);
    html += btn('›', cur + 1, '', cur === pages) + btn('»', pages, '', cur === pages);
    html += `<span class="pg-info">${fmt(cur)} / ${fmt(pages)}</span>`;
    pg.innerHTML = html;
    $$('button', pg).forEach(b => b.onclick = () => {
      LB.page = parseInt(b.dataset.p, 10);
      update(false);
      window.scrollTo({ top: $('#lb-count', v).offsetTop - 90, behavior: 'smooth' });
    });
  }

  function update(useFlip) {
    const list = lbFiltered(D);
    const nActive = (LB.q.trim() ? 1 : 0) + (LB.pay ? 1 : 0) + LB.series.size;
    $('#lb-count', v).innerHTML = `<strong>${fmt(list.length)}</strong> joueur${list.length > 1 ? 's' : ''}` +
      (nActive ? ` · <strong>${nActive}</strong> filtre${nActive > 1 ? 's actifs' : ' actif'}` : ' · aucun filtre');
    renderPills();
    renderPager(list.length);
    const body = $('#lb-body', v);
    const start = (LB.page - 1) * PAGE_SIZE;
    const slice = list.slice(start, start + PAGE_SIZE);
    const build = () => {
      if (!slice.length) { body.innerHTML = '<div class="empty">Aucun joueur ne correspond à ces filtres cumulés. Retirez-en un via les pilules ci-dessus.</div>'; return; }
      if (LB.view === 'table') {
        const head = isDup
          ? `<tr><th>#</th><th>Joueur</th><th>Série</th><th class="sortable" data-s="sc" title="%S de la série du joueur — avec la série précédente et la suivante, les % qui comptent pour elle en Duplicate">%S série <span class="arrow">⇅</span></th><th class="sortable" data-s="mouv">Mouv. <span class="arrow">⇅</span></th></tr>`
          : `<tr><th>#</th><th>Joueur</th><th>Série</th><th class="sortable" data-s="sc">Cote <span class="arrow">⇅</span></th><th>V · N · D</th><th>Min–Max</th><th class="sortable" data-s="mouv">Mouv. <span class="arrow">⇅</span></th></tr>`;
        body.innerHTML = `<div class="table-wrap"><table class="lb"><thead>${head}</thead><tbody>${
          slice.map((p, i) => lbRowHtml(p, disc, i)).join('')}</tbody></table></div>`;
        $$('th.sortable', body).forEach(th => th.onclick = () => {
          LB.sort = th.dataset.s; sortSel.value = LB.sort; LB.page = 1; update(true);
        });
      } else {
        body.innerHTML = `<div class="cards">${slice.map((p, i) => lbCardHtml(p, disc, i)).join('')}</div>`;
      }
      $$('[data-key]', body).forEach(el => el.onclick = () => {
        location.hash = `#/joueur/${disc}/${el.dataset.key}`;
      });
      countUpAll(body);
    };
    if (useFlip) flip(body, build); else build();
  }
  update(false);

  /* ---- graphiques ---- */
  const pmap = byLicMap(D.players);
  const histTop = Object.entries(D.hist)
    .map(([lic, arr]) => ({ p: pmap.get(lic), arr }))
    .filter(x => x.p).sort((a, b) => a.p.pl - b.p.pl).slice(0, 20);
  Charts.make($('#ch-bump', v), {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 120, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: D.snapshots, ...axisStyle },
    yAxis: { type: 'value', inverse: true, min: 1, name: 'place', ...axisStyle },
    series: histTop.map(({ p, arr }) => ({
      name: fullName(p), type: 'line', data: arr, symbolSize: 5, smooth: .25,
      lineStyle: { width: 2 }, emphasis: { focus: 'series' },
      endLabel: { show: true, formatter: fullName(p), color: '#c9d6cc', fontSize: 10, distance: 6 },
    })),
  });

  if (isDup) {
    /* Matrice de transition séries 25-26 -> 26-27 (les montées et descentes
       forment des cycles 1A<->1B : un Sankey est impossible, une heatmap non) */
    const flows = {};
    const allSeries = new Set();
    for (const p of D.players) {
      const a = p.s25 || '?', b = p.s26 || '?';
      if (!a || !b || a === b) continue;
      allSeries.add(a); allSeries.add(b);
      const k = a + '→' + b;
      flows[k] = (flows[k] || 0) + 1;
    }
    const cats = [...allSeries].sort((a, b) => serieRank(a) - serieRank(b));
    const idx = Object.fromEntries(cats.map((c, i) => [c, i]));
    const cells = Object.entries(flows)
      .map(([k, v]) => { const [s, t] = k.split('→'); return [idx[s], idx[t], v]; })
      .filter(c => c[0] != null && c[1] != null);
    const maxV = Math.max(1, ...cells.map(c => c[2]));
    Charts.make($('#ch-sankey', v), {
      tooltip: { formatter: pr => {
        const v = pr.value;
        return `<b>${esc(cats[v[1]])}</b> ← ${esc(cats[v[0]])} : ${fmt(v[2])} joueurs`;
      } },
      grid: { left: 55, right: 90, top: 15, bottom: 55 },
      xAxis: { type: 'category', data: cats, name: '2025-26', nameLocation: 'middle', nameGap: 30, axisLabel: { ...axisStyle.axisLabel, interval: 0, rotate: 40 }, axisLine: axisStyle.axisLine },
      yAxis: { type: 'category', data: cats, name: '2026-27', axisLabel: axisStyle.axisLabel, axisLine: axisStyle.axisLine, inverse: true },
      visualMap: { min: 1, max: maxV, calculable: true, orient: 'vertical', right: 5, top: 'center', textStyle: { color: '#9db3a2' }, inRange: { color: ['#1d4d31', '#3fae67', '#e8b53a', '#e06565'] } },
      series: [{ type: 'heatmap', data: cells, label: { show: true, fontSize: 9, color: '#dfe9e1', formatter: pr => pr.value[2] } }],
    });
  } else {
    const sample = D.players.filter(p => p.cote != null && p.matchs > 0)
      .filter((_, i) => i % Math.ceil(D.players.length / 1500) === 0)
      .map(p => [p.matchs, p.cote]);
    Charts.make($('#ch-scatter', v), {
      tooltip: { formatter: pr => `${fmt(pr.value[0])} matchs<br>cote ${fmt(pr.value[1])}` },
      grid: { left: 55, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'value', name: 'matchs', ...axisStyle },
      yAxis: { type: 'value', name: 'cote', ...axisStyle },
      series: [{ type: 'scatter', data: sample, symbolSize: 6, itemStyle: { opacity: .55, color: '#5aa9e6' } }],
    });
  }

  const top10 = sorted.slice(0, 10);
  Charts.make($('#ch-countries', v), {
    tooltip: {},
    grid: { left: 40, right: 20, top: 10, bottom: 50 },
    xAxis: { type: 'category', data: top10.map(([c]) => c), axisLabel: { ...axisStyle.axisLabel, interval: 0, rotate: 30 }, axisLine: axisStyle.axisLine },
    yAxis: { type: 'value', ...axisStyle },
    series: [{ type: 'bar', data: top10.map(([, n]) => n), itemStyle: { color: '#3fae67', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 34 }],
  });

  const values = D.players.map(p => metricOf(p, disc)).filter(x => x != null);
  const bins = 22, min = Math.min(...values), max = Math.max(...values);
  const step = (max - min) / bins || 1;
  const histo = new Array(bins).fill(0);
  for (const x of values) histo[Math.min(bins - 1, Math.floor((x - min) / step))]++;
  Charts.make($('#ch-hist', v), {
    tooltip: { formatter: pr => `${fmt(min + pr.dataIndex * step, isDup ? 1 : 0)} – ${fmt(min + (pr.dataIndex + 1) * step, isDup ? 1 : 0)} : <b>${fmt(pr.value)}</b> joueurs` },
    grid: { left: 50, right: 20, top: 15, bottom: 35 },
    xAxis: { type: 'category', data: histo.map((_, i) => fmt(min + (i + .5) * step, isDup ? 0 : 0)), axisLabel: { ...axisStyle.axisLabel, interval: 3 }, axisLine: axisStyle.axisLine },
    yAxis: { type: 'value', ...axisStyle },
    series: [{ type: 'bar', data: histo, itemStyle: { color: '#e8b53a', borderRadius: [3, 3, 0, 0] }, barCategoryGap: '12%' }],
  });
}

/* ---------- Panneau barres & quotas (duplicate) ---------- */
function barresPanel() {
  const b = window.FISF_DATA.barres || { quotas: {}, barres: [] };
  const quotaRows = Object.entries(b.quotas);
  return `<div class="panel">
    <h3>Barres &amp; quotas 2026-2027 <small>barres de maintien par série et quotas par fédération</small></h3>
    <div class="grid-2">
      <div>
        <table class="preview-table"><thead><tr><th>Série</th><th>Barre (%)</th></tr></thead><tbody>
          ${b.barres.map(([s, v]) => `<tr><td><span class="tag ${serieClass(s)}">${esc(s)}</span></td><td>${fmt(v, 2)} %</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div>
        <table class="preview-table"><thead><tr><th>Fédération</th><th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>S5</th><th>S6</th></tr></thead><tbody>
          ${quotaRows.map(([fed, vals]) => `<tr><td>${esc(fed)}</td>${vals.map(v => `<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}
        </tbody></table>
        <p class="panel-note">Source : onglet « Barres et quotas » du classement officiel.</p>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   VUE : FICHE JOUEUR
   ============================================================ */
function renderPlayer(v, disc, lic) {
  if (!window.FISF_DATA.disciplines[disc]) disc = 'duplicate';
  const D = getDisc(disc);
  const pmap = byLicMap(D.players);
  const p = pmap.get(String(lic));
  if (!p) {
    v.innerHTML = `<div class="panel empty">Fiche introuvable. <a href="#/">Retour au classement</a></div>`;
    return;
  }
  const isDup = disc === 'duplicate';
  const prof = profileOf(lic) || {};
  const d = deltaInfo(p);
  const histArr = D.hist[String(lic)] || null;
  const targets = p.pl ? D.players.filter(x => x.pl && x.pl < p.pl).sort((a, b) => b.pl - a.pl).slice(0, 3) : [];
  const gapLabel = t => {
    const a = metricOf(t, disc), b = metricOf(p, disc);
    const dec = isDup ? 2 : 0;
    if (a != null && b != null) {
      if (a > b) return `encore ${fmt(a - b, dec)} pts à rattraper`;
      if (b > a) return `${fmt(b - a, dec)} pts d'avance au score — la place officielle compte !`;
    }
    return `une seule place devant`;
  };

  /* ---- Mode Défi : repères pertinents pour son rang ---- */
  const repRows = [];
  {
    const seen = new Set();
    const push = (label, holder) => {
      if (!holder) return;
      if (String(holder.lic) === String(p.lic)) {
        repRows.push({ label, holder, self: true, places: 0, pts: null, dec: isDup ? 2 : 0 });
        return;
      }
      if (seen.has(String(holder.lic)) || holder.pl >= p.pl) return;
      seen.add(String(holder.lic));
      const ma = metricOf(holder, disc), mb = metricOf(p, disc);
      repRows.push({ label, holder, places: p.pl - holder.pl,
        pts: (ma != null && mb != null) ? ma - mb : null, dec: isDup ? 2 : 0 });
    };
    const at = n => D.players.find(x => x.pl === n) || null;
    [100, 50, 30, 20, 10].forEach(n => push(`Top ${n} mondial`, at(n)));
    push('N°1 mondial', at(1));
    const country = D.players.filter(x => x.pay === p.pay).sort((a, b) => a.pl - b.pl);
    [100, 50, 30, 20, 10, 5, 3, 1].forEach(n => { if (country[n - 1]) push(`Top ${n} de ${esc(p.pay)}`, country[n - 1]); });
    const serieTop = D.players.filter(x => x.s26 === p.s26).sort((a, b) => a.pl - b.pl)[0];
    push(`N°1 de la série ${esc(p.s26)}`, serieTop);
    /* catégorie d'âge : débloquée si l'année de naissance est connue (fiche admin) */
    const profs = Store.profiles();
    const birthOf = l => { const y = parseInt(profs[String(l)]?.birth, 10); return isNaN(y) ? null : y; };
    const catOf = y => AGE_CATS.find(c => y >= c[0] && y <= c[1]);
    const myCat = catOf(birthOf(p.lic) ?? -1);
    if (myCat) {
      const top = D.players.filter(x => { const b = birthOf(x.lic); return b && catOf(b) === myCat; })
        .sort((a, b) => a.pl - b.pl)[0];
      push(`N°1 ${myCat[2]}`, top);
    }
    repRows.sort((a, b) => a.places - b.places);
  }

  v.innerHTML = `
  <div class="panel">
    <div class="player-hero">
      <div class="avatar">${prof.photo ? `<img src="${esc(prof.photo)}" alt="">` : esc(initials(p))}</div>
      <div>
        <h1>${esc(fullName(p))} ${p.nw ? '<span class="badge-new">NOUVEAU</span>' : ''}</h1>
        <div class="meta">
          <span><span class="tag ${serieClass(p.s26)}">${esc(p.s26)}</span>${serieChange(p)}</span>
          <span>${flagTag(p.pay)} club ${esc(p.club || '—')}</span>
          <span>féd. ${esc(p.fed || '—')}</span>
          <span>licence ${esc(p.lic)}</span>
          <span class="delta ${d.cls}">${d.label}</span>
        </div>
      </div>
      <div class="hero-actions">
        <button class="btn secondary" id="btn-duel">⚔️ Duel</button>
        ${Store.isAdmin() ? `<a class="btn ghost small" href="#/admin" id="btn-edit">✏️ Modifier la fiche</a>` : ''}
      </div>
    </div>
    <div class="stat-grid mt">
      <div class="stat"><div class="k">Place ${isDup ? 'duplicate' : 'classique'}</div><div class="v">#${fmt(p.pl)}</div></div>
      ${isDup
        ? sTrio(p).map(([lab, v], i) => `<div class="stat"><div class="k">%${lab}${i === 1 ? ' · sa série' : ''}</div><div class="v">${v == null ? '—' : fmt(v, 2)}<small> %</small></div></div>`).join('')
        : `<div class="stat"><div class="k">Cote</div><div class="v">${fmt(p.cote)} <small>pts</small></div></div>
           <div class="stat"><div class="k">Victoires</div><div class="v">${fmt(p.v)} <small>/ ${fmt(p.matchs)} matchs</small></div></div>
           <div class="stat"><div class="k">Bilan V·N·D</div><div class="v">${fmt(p.v)}·${fmt(p.n)}·${fmt(p.d)}</div></div>
           <div class="stat"><div class="k">Cote min – max</div><div class="v" style="font-size:1rem">${fmt(p.cmin)} – ${fmt(p.cmax)}</div></div>`}
    </div>
    ${isDup ? `<p class="panel-note">En Duplicate, ${sTrioPhrase(p)}.</p>` : ''}
  </div>

  <div class="grid-2">
    <div>
      <div class="panel"><h3>Évolution du classement ${D.simulated ? '<small>(historique simulé — démo)</small>' : ''}</h3>
        <div class="chart-box" id="pj-evol"></div></div>
      ${isDup ? `<div class="panel"><h3>Profil par série <small>les % qui comptent pour la série ${esc(p.s26)}</small></h3>
        <div class="chart-box" id="pj-radar"></div></div>` : ''}
    </div>
    <div>
      ${prof.bio ? `<div class="panel"><h3>Bio</h3><p style="color:var(--muted)">${esc(prof.bio)}</p></div>` : ''}
      <div class="panel"><h3>Profil public</h3>
        <dl class="kv">
          ${prof.since ? `<dt>Scrabble depuis</dt><dd>${esc(prof.since)}</dd>` : ''}
          ${prof.birth && !isNaN(parseInt(prof.birth, 10)) ? `<dt>Catégorie d'âge</dt><dd>${esc(ageCategoryLabel(parseInt(prof.birth, 10)))} (né·e en ${esc(prof.birth)})</dd>` : ''}
          ${prof.goals ? `<dt>Objectifs 2026-27</dt><dd>${esc(prof.goals)}</dd>` : ''}
          ${prof.pseudos?.ws ? `<dt>Pseudo WebScrabble</dt><dd>${esc(prof.pseudos.ws)}</dd>` : ''}
          ${prof.pseudos?.isc ? `<dt>Pseudo ISC</dt><dd>${esc(prof.pseudos.isc)}</dd>` : ''}
          ${prof.pseudos?.other ? `<dt>Autre pseudo</dt><dd>${esc(prof.pseudos.other)}</dd>` : ''}
          ${prof.topping ? `<dt>Données de topping</dt><dd><a href="${esc(prof.topping)}" target="_blank" rel="noopener">voir le topping ↗</a></dd>` : ''}
          ${prof.site ? `<dt>Site / réseau</dt><dd><a href="${esc(prof.site)}" target="_blank" rel="noopener">${esc(prof.site)} ↗</a></dd>` : ''}
          ${!prof.since && !prof.goals && !prof.pseudos?.ws && !prof.pseudos?.isc && !prof.pseudos?.other && !prof.topping && !prof.site && !prof.bio
            ? `<dt></dt><dd style="color:var(--dim)">Fiche en attente d'enrichissement par l'équipe.</dd>` : ''}
        </dl>
      </div>
      ${prof.palmares?.length ? `<div class="panel"><h3>Palmarès</h3><ul class="timeline">
        ${prof.palmares.map(x => `<li><span class="year">${esc(x.y)}</span><span class="what">${esc(x.t)}</span></li>`).join('')}
      </ul></div>` : ''}
      ${prof.anecdotes?.length ? `<div class="panel"><h3>Anecdotes</h3><ul class="quote-list">
        ${prof.anecdotes.map(t => `<li>${esc(t)}</li>`).join('')}
      </ul></div>` : ''}
    </div>
  </div>

  ${(targets.length || repRows.length) ? `<div class="panel">
    <h3>🔥 Mode Défi <small>qui me dépasse et les repères à atteindre</small></h3>
    ${targets.length ? `<div class="targets">${targets.map(t => `
      <div class="target" data-lic="${t.lic}">
        <div class="gap">${gapLabel(t)}</div>
        <h4>${esc(fullName(t))}</h4>
        <div class="meta">#${fmt(t.pl)} · ${flagTag(t.pay)} <span class="tag ${serieClass(t.s26)}">${esc(t.s26)}</span></div>
      </div>`).join('')}</div>`
    : `<p class="panel-note" style="margin:0">🏆 Personne devant — c'est vous le repère !</p>`}
    ${repRows.length ? `
      <h3 style="font-size:.95rem;margin:1.1rem 0 .5rem">Repères depuis le rang #${fmt(p.pl)}</h3>
      <div class="table-wrap" style="max-height:none"><table class="lb" style="min-width:540px"><thead>
        <tr><th>Repère</th><th>Détenteur</th><th>Écart places</th><th>${isDup ? 'Écart score' : 'Écart cote'}</th></tr>
      </thead><tbody>
        ${repRows.map(r => r.self
          ? `<tr class="enter"><td>${r.label}</td>
              <td class="who"><em style="color:var(--up);font-style:normal;font-weight:650">✅ Repère atteint — c'est vous</em></td>
              <td class="num">—</td><td class="num">—</td></tr>`
          : `<tr data-key="${r.holder.lic}" class="enter">
          <td>${r.label}</td>
          <td class="who"><span class="nm">${esc(fullName(r.holder))}</span> <span class="meta">${flagTag(r.holder.pay)} #${fmt(r.holder.pl)} · ${esc(r.holder.club || '')}</span></td>
          <td class="num" style="color:var(--gold);font-weight:700">+${fmt(r.places)}</td>
          <td class="num">${r.pts == null ? '—' : r.pts > 0
            ? `<span class="delta down">+${fmt(r.pts, r.dec)}</span>`
            : `<span class="delta up">déjà +${fmt(-r.pts, r.dec)}</span>`}</td>
        </tr>`).join('')}
      </tbody></table></div>
      ${isDup && !prof.birth ? `<p class="panel-note">💡 Renseignez l'année de naissance (fiche admin) pour débloquer le repère « N°1 de sa catégorie d'âge ».</p>` : ''}` : ''}
  </div>` : ''}`;

  $('#btn-duel', v).onclick = () => { DUEL.disc = disc; DUEL.a = p; DUEL.b = targets[0] || null; location.hash = '#/duels'; };
  $$('.target', v).forEach(t => t.onclick = () => location.hash = `#/joueur/${disc}/${t.dataset.lic}`);
  $$('.table-wrap tr[data-key]', v).forEach(tr => tr.onclick = () => location.hash = `#/joueur/${disc}/${tr.dataset.key}`);

  Charts.make($('#pj-evol', v), {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 25, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: D.snapshots, ...axisStyle },
    yAxis: { type: 'value', inverse: true, min: 1, name: 'place', ...axisStyle },
    series: histArr
      ? [{ name: fullName(p), type: 'line', data: histArr, smooth: .25, symbolSize: 7, lineStyle: { width: 3, color: '#e8b53a' }, itemStyle: { color: '#e8b53a' }, areaStyle: { color: 'rgba(232,181,58,.12)' } }]
      : [],
  });
  if (isDup) {
    const rel = relSeriesOf(p.s26);
    Charts.make($('#pj-radar', v), {
      tooltip: {},
      radar: {
        indicator: rel.map(i => ({ name: 'S' + i, max: 100 })),
        axisName: { color: '#c9d6cc' }, splitLine: { lineStyle: { color: '#2a3a2e' } },
        splitArea: { areaStyle: { color: ['transparent'] } },
      },
      series: [{ type: 'radar', data: [{ value: rel.map(i => p['s' + i] ?? 0), name: fullName(p), areaStyle: { color: 'rgba(63,174,103,.3)' }, lineStyle: { color: '#57cf82', width: 2 } }] }],
    });
  }
}

/* ============================================================
   VUE : NOUVEAUTÉS
   ============================================================ */
function moversList(list, up) {
  return `<ul class="mover-list">${list.map(p => {
    const d = Math.abs(p.pv - p.pl);
    return `<li><span class="delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${d}</span>
      <span class="who"><a href="#/joueur/{DISC}/${p.lic}">${esc(fullName(p))}</a><small>${flagTag(p.pay)} ${esc(p.club || '')}</small></span>
      <span style="color:var(--dim)">#${fmt(p.pv)} → #${fmt(p.pl)}</span></li>`;
  }).join('')}</ul>`;
}

function renderNews(v) {
  let anySim = false;
  const blocks = ['duplicate', 'classic'].map(disc => {
    const D = getDisc(disc);
    anySim = anySim || D.simulated;
    const isDup = disc === 'duplicate';
    const entrants = D.players.filter(p => p.nw).length;
    const changes = D.players.filter(p => p.s25 && p.s26 && p.s25 !== p.s26);
    const up = changes.filter(p => serieRank(p.s26) < serieRank(p.s25)).length;
    const movers = D.players.filter(p => !p.nw && p.pv != null);
    const topUp = movers.slice().sort((a, b) => (b.pv - b.pl) - (a.pv - a.pl)).slice(0, 10);
    const topDown = movers.slice().sort((a, b) => (b.pl - b.pv) - (a.pl - a.pv)).slice(0, 10);
    return `<div class="panel">
      <h2>${isDup ? 'Duplicate' : 'Classique'} <small>publié le ${esc(D.publishedAt)}</small></h2>
      <div class="stat-grid mb">
        <div class="stat"><div class="k">Nouveaux entrants</div><div class="v">${fmt(entrants)}</div></div>
        <div class="stat"><div class="k">Changements de série</div><div class="v">${fmt(changes.length)}</div></div>
        <div class="stat"><div class="k">Montées</div><div class="v" style="color:var(--up)">${fmt(up)}</div></div>
        <div class="stat"><div class="k">Descentes</div><div class="v" style="color:var(--down)">${fmt(changes.length - up)}</div></div>
      </div>
      <p style="color:var(--muted);font-size:.92rem">
        ${fmt(entrants)} nouveaux joueurs intègrent ce classement, ${fmt(changes.length)} changent de série
        (${fmt(up)} montées, ${fmt(changes.length - up)} descentes) et ${fmt(movers.filter(p => p.pv - p.pl > 0).length)} joueurs améliorent leur place.
      </p>
      <div class="movers mt">
        <div><h3 style="font-size:.95rem">📈 Plus grosses progressions</h3>${moversList(topUp, true).replaceAll('{DISC}', disc)}</div>
        <div><h3 style="font-size:.95rem">📉 Plus grosses regressions</h3>${moversList(topDown, false).replaceAll('{DISC}', disc)}</div>
      </div>
    </div>`;
  }).join('');

  v.innerHTML = `
    <div class="page-head"><h1>Quoi de neuf ?</h1>
      <span class="sub">bilan automatique de la dernière publication</span></div>
    ${anySim ? `<div class="alert warn">⚠️ Les mouvements ci-dessous sont calculés sur des places <strong>simulées</strong> (une seule publication pour l'instant). Ils deviendront réels dès la prochaine mise à jour du classement.</div>` : ''}
    ${blocks}
    ${barresPanel()}`;
}

/* ============================================================
   VUE : RECORDS
   ============================================================ */
function miniTable(rows) {
  return `<table class="preview-table"><tbody>${rows.map(r =>
    `<tr>${r.map((c, i) => i === 0 ? `<td>${c}</td>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderRecords(v) {
  const D = getDisc('duplicate');
  const C = getDisc('classic');

  const topScore = D.players.filter(p => ownSVal(p) != null).sort((a, b) => ownSVal(b) - ownSVal(a)).slice(0, 5);
  const serieBest = [1, 2, 3, 4, 5, 6].map(i => {
    let best = null;
    for (const p of D.players) { const x = p['s' + i]; if (x != null && (!best || x > best.v)) best = { p, v: x }; }
    return best;
  });
  const clubs = {};
  for (const p of D.players) if (p.club) clubs[p.club] = (clubs[p.club] || 0) + 1;
  const topClubs = Object.entries(clubs).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const bestPerCountry = Object.entries(D.countries).slice(0, 8).map(([c]) => {
    const best = D.players.find(p => p.pay === c);
    return [c, best];
  });

  const topCote = C.players.slice(0, 5);
  const mostWins = C.players.slice().sort((a, b) => b.v - a.v).slice(0, 5);
  const bestRatio = C.players.filter(p => p.matchs >= 100).sort((a, b) => (b.v / (b.d || 1)) - (a.v / (a.d || 1))).slice(0, 5);
  const mostGames = C.players.slice().sort((a, b) => b.matchs - a.matchs).slice(0, 5);
  const volatile = C.players.filter(p => p.cmin != null && p.cmax != null).sort((a, b) => (b.cmax - b.cmin) - (a.cmax - a.cmin)).slice(0, 5);

  const rowP = p => `<a href="#/joueur/duplicate/${p.lic}">${esc(fullName(p))}</a> <small style="color:var(--dim)">${flagTag(p.pay)} ${esc(p.club || '')}</small>`;

  v.innerHTML = `
  <div class="page-head"><h1>Records &amp; curiosités</h1><span class="sub">générés automatiquement depuis le classement</span></div>
  <div class="grid-2">
    <div class="panel"><h2>🏆 Duplicate</h2>
      <h3 style="font-size:.95rem">Meilleurs %S de leur série</h3>
      ${miniTable(topScore.map((p, i) => [`#${i + 1}`, rowP(p), `${fmt(ownSVal(p), 2)} % <small style="color:var(--dim)">(%S${ownSerieNum(p)} · série ${esc(p.s26)})</small>`]))}
      <h3 style="font-size:.95rem" class="mt">Records par série (%)</h3>
      ${miniTable(serieBest.map((b, i) => b ? [`S${i + 1}`, rowP(b.p), fmt(b.v, 2) + ' %'] : [`S${i + 1}`, '—', '—']))}
      <h3 style="font-size:.95rem" class="mt">Plus gros clubs (effectif classé)</h3>
      ${miniTable(topClubs.map(([c, n], i) => [`#${i + 1}`, esc(c), fmt(n) + ' joueurs']))}
      <h3 style="font-size:.95rem" class="mt">Numéro 1 par pays</h3>
      ${miniTable(bestPerCountry.map(([c, p]) => [flagTag(c), p ? rowP(p) : '—', p ? '#' + fmt(p.pl) : '']))}
    </div>
    <div class="panel"><h2>🏆 Classique</h2>
      <h3 style="font-size:.95rem">Meilleures cotes</h3>
      ${miniTable(topCote.map((p, i) => [`#${i + 1}`, `<a href="#/joueur/classic/${p.lic}">${esc(fullName(p))}</a> <small style="color:var(--dim)">${flagTag(p.pay)}</small>`, fmt(p.cote) + ' pts']))}
      <h3 style="font-size:.95rem" class="mt">Plus de victoires</h3>
      ${miniTable(mostWins.map(p => [fmt(p.v), `<a href="#/joueur/classic/${p.lic}">${esc(fullName(p))}</a>`, fmt(p.matchs) + ' matchs']))}
      <h3 style="font-size:.95rem" class="mt">Meilleur ratio V/D (min. 100 matchs)</h3>
      ${miniTable(bestRatio.map(p => [fmt(p.v / (p.d || 1), 2), `<a href="#/joueur/classic/${p.lic}">${esc(fullName(p))}</a>`, `${fmt(p.v)}V / ${fmt(p.d)}D`]))}
      <h3 style="font-size:.95rem" class="mt">Plus grande amplitude de cote (volatilité)</h3>
      ${miniTable(volatile.map(p => [fmt(p.cmax - p.cmin), `<a href="#/joueur/classic/${p.lic}">${esc(fullName(p))}</a>`, `${fmt(p.cmin)} → ${fmt(p.cmax)}`]))}
    </div>
  </div>`;
}

/* ============================================================
   VUE : DUELS
   ============================================================ */
const DUEL = { disc: 'duplicate', a: null, b: null };

function duelPicker(side, selected, D) {
  return `<div class="field" style="flex:1;min-width:240px">
    <label>Joueur ${side.toUpperCase()}</label>
    <input class="input" id="duel-${side}" type="search" placeholder="Rechercher un joueur…" value="${selected ? esc(fullName(selected)) : ''}" autocomplete="off">
    <div class="pick-list" id="duel-${side}-list" style="display:none;max-height:180px"></div>
    ${selected ? `<div class="mt"><span class="tag ${serieClass(selected.s26)}">${esc(selected.s26)}</span> <strong>#${fmt(selected.pl)}</strong> ${flagTag(selected.pay)} ${esc(selected.club || '')}</div>` : ''}
  </div>`;
}

function renderDuel(v) {
  const D = getDisc(DUEL.disc);
  if (!DUEL.a) DUEL.a = D.players[0] || null;
  if (!DUEL.b) DUEL.b = D.players[1] || null;
  const isDup = DUEL.disc === 'duplicate';

  v.innerHTML = `
  <div class="page-head"><h1>Duels</h1><span class="sub">comparez deux joueurs, série par série</span>
    <span class="spacer"></span>
    <div class="disc-tabs">
      <button class="${isDup ? 'active' : ''}" data-d="duplicate">Duplicate</button>
      <button class="${!isDup ? 'active' : ''}" data-d="classic">Classique</button>
    </div></div>
  <div class="panel"><div class="filters">${duelPicker('a', DUEL.a, D)}<div style="font-size:1.6rem;align-self:flex-end">⚔️</div>${duelPicker('b', DUEL.b, D)}</div></div>
  <div id="duel-result"></div>`;

  $$('.disc-tabs button', v).forEach(b => b.onclick = () => {
    DUEL.disc = b.dataset.d; DUEL.a = null; DUEL.b = null; renderDuel(v);
  });

  ['a', 'b'].forEach(side => {
    const input = $(`#duel-${side}`, v), listEl = $(`#duel-${side}-list`, v);
    input.oninput = () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { listEl.style.display = 'none'; return; }
      const matches = D.players.filter(p => fullName(p).toLowerCase().includes(q)).slice(0, 8);
      listEl.innerHTML = matches.map(p => `<button data-lic="${p.lic}">#${fmt(p.pl)} · ${esc(fullName(p))} <span class="mini">${esc(p.pay)} ${esc(p.club || '')}</span></button>`).join('') || '<button disabled>Aucun résultat</button>';
      listEl.style.display = '';
      $$('button[data-lic]', listEl).forEach(b => b.onclick = () => {
        DUEL[side] = byLicMap(D.players).get(b.dataset.lic);
        renderDuel(v);
      });
    };
  });

  const a = DUEL.a, b = DUEL.b, res = $('#duel-result', v);
  if (!a || !b) { res.innerHTML = '<div class="panel empty">Choisissez deux joueurs pour lancer le duel.</div>'; return; }

  const cmp = (va, vb, invert = false) => {
    if (va == null || vb == null) return '';
    const better = invert ? va < vb : va > vb;
    return better ? 'style="color:var(--up);font-weight:700"' : '';
  };
  const rel = x => relSeriesOf(x.s26);
  const rows = isDup
    ? [
      ['Place', `#${fmt(a.pl)}`, `#${fmt(b.pl)}`, cmp(b.pl, a.pl, true)],
      ['Série', `<span class="tag ${serieClass(a.s26)}">${esc(a.s26)}</span>`, `<span class="tag ${serieClass(b.s26)}">${esc(b.s26)}</span>`, ''],
      ...[...new Set([...rel(a), ...rel(b)])].sort((x, y) => x - y)
        .map(i => [`%S${i}`, fmt(a['s' + i], 1), fmt(b['s' + i], 1), cmp(a['s' + i], b['s' + i])]),
    ]
    : [
      ['Place', `#${fmt(a.pl)}`, `#${fmt(b.pl)}`, cmp(b.pl, a.pl, true)],
      ['Série', `<span class="tag ${serieClass(a.s26)}">${esc(a.s26)}</span>`, `<span class="tag ${serieClass(b.s26)}">${esc(b.s26)}</span>`, ''],
      ['Cote', fmt(a.cote), fmt(b.cote), cmp(a.cote, b.cote)],
      ['Victoires', fmt(a.v), fmt(b.v), cmp(a.v, b.v)],
      ['Défaites', fmt(a.d), fmt(b.d), cmp(a.d, b.d, true)],
      ['Matchs', fmt(a.matchs), fmt(b.matchs), cmp(a.matchs, b.matchs)],
      ['Cote min – max', `${fmt(a.cmin)}–${fmt(a.cmax)}`, `${fmt(b.cmin)}–${fmt(b.cmax)}`, ''],
    ];

  res.innerHTML = `
  <div class="grid-2">
    <div class="panel"><h3>Tableau comparatif</h3>
      <table class="preview-table"><thead><tr><th></th><th>${esc(fullName(a))}</th><th>${esc(fullName(b))}</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td ${r[3]}>${r[2]}</td></tr>`).join('')}</tbody></table>
      <p class="panel-note">Le vert indique l'avantage du joueur B.</p></div>
    <div class="panel"><h3>Superposition des profils ${isDup ? '(radar des séries pertinentes)' : '(cotes Min/Max)'}</h3>
      <div class="chart-box tall" id="duel-chart"></div></div>
  </div>`;

  if (isDup) {
    const axes = [...new Set([...rel(a), ...rel(b)])].sort((x, y) => x - y);
    Charts.make($('#duel-chart', res), {
      tooltip: {},
      legend: { textStyle: { color: '#c9d6cc' }, bottom: 0 },
      radar: { indicator: axes.map(i => ({ name: 'S' + i, max: 100 })), axisName: { color: '#c9d6cc' }, splitLine: { lineStyle: { color: '#2a3a2e' } } },
      series: [{ type: 'radar', data: [
        { value: axes.map(i => a['s' + i] ?? 0), name: fullName(a), areaStyle: { color: 'rgba(63,174,103,.25)' } },
        { value: axes.map(i => b['s' + i] ?? 0), name: fullName(b), areaStyle: { color: 'rgba(232,181,58,.22)' } },
      ] }],
    });
  } else {
    Charts.make($('#duel-chart', res), {
      tooltip: {},
      legend: { textStyle: { color: '#c9d6cc' }, bottom: 0 },
      grid: { left: 50, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: ['Cote min', 'Cote', 'Cote max'], ...axisStyle },
      yAxis: { type: 'value', ...axisStyle },
      series: [
        { name: fullName(a), type: 'bar', data: [a.cmin, a.cote, a.cmax], itemStyle: { color: '#3fae67', borderRadius: 4 } },
        { name: fullName(b), type: 'bar', data: [b.cmin, b.cote, b.cmax], itemStyle: { color: '#e8b53a', borderRadius: 4 } },
      ],
    });
  }
}

/* ============================================================
   VUE : QUIZ « QUI SUIS-JE ? »
   ============================================================ */
const QUIZ = { n: 0, score: 0, target: null, options: [], locked: false, total: 10 };

function quizNext(v) {
  const D = getDisc('duplicate');
  const pool = D.players;
  const target = pool[Math.floor(Math.random() * Math.min(pool.length, 4000))];
  const sameSerie = pool.filter(p => p.s26 === target.s26 && p.lic !== target.lic);
  const distractors = [];
  const bag = sameSerie.length >= 3 ? sameSerie : pool;
  while (distractors.length < 3) {
    const c = bag[Math.floor(Math.random() * bag.length)];
    if (c.lic !== target.lic && !distractors.some(d => d.lic === c.lic)) distractors.push(c);
  }
  QUIZ.target = target;
  QUIZ.options = [target, ...distractors].sort(() => Math.random() - .5);
  QUIZ.locked = false;
  const lo = Math.floor((ownSVal(target) ?? 0) / 5) * 5, hi = lo + 5;
  QUIZ.n++;
  v.innerHTML = `
  <div class="panel quiz-card">
    <div class="quiz-score">${QUIZ.n} / ${QUIZ.total} · Score : ${QUIZ.score}</div>
    <h2 class="mt">🕵️ Qui suis-je ?</h2>
    <ul class="quiz-clues">
      <li>Je joue sous la bannière <b>${esc(target.fed || target.pay)}</b> (${flagTag(target.pay)})</li>
      <li>Mon club est <b>${esc(target.club || 'indépendant')}</b></li>
      <li>En 2026-2027, ma série est <b><span class="tag ${serieClass(target.s26)}">${esc(target.s26)}</span></b></li>
      <li>Mon %S${ownSerieNum(target) || '…'} (la série qui compte pour moi) est compris entre <b>${fmt(lo, 0)}</b> et <b>${fmt(hi, 0)} %</b></li>
    </ul>
    <div class="quiz-opts">${QUIZ.options.map(p =>
      `<button class="quiz-opt" data-lic="${p.lic}">${esc(fullName(p))}</button>`).join('')}</div>
    <div id="quiz-feedback" class="mt"></div>
  </div>`;
  $$('.quiz-opt', v).forEach(btn => btn.onclick = () => {
    if (QUIZ.locked) return;
    QUIZ.locked = true;
    const ok = btn.dataset.lic === String(QUIZ.target.lic);
    if (ok) { QUIZ.score++; btn.classList.add('ok'); } else btn.classList.add('ko');
    $$('.quiz-opt', v).forEach(b => {
      b.disabled = true;
      if (b.dataset.lic === String(QUIZ.target.lic)) b.classList.add('ok');
    });
    $('#quiz-feedback', v).innerHTML = `
      <p>${ok ? '✅ Bonne réponse !' : '❌ Raté !'} C'était <a href="#/joueur/duplicate/${QUIZ.target.lic}">${esc(fullName(QUIZ.target))}</a>
      (#${fmt(QUIZ.target.pl)} duplicate).</p>
      <button class="btn mt" id="quiz-next">${QUIZ.n >= QUIZ.total ? 'Voir le résultat' : 'Question suivante'}</button>`;
    $('#quiz-next', v).onclick = () => {
      if (QUIZ.n >= QUIZ.total) {
        v.innerHTML = `<div class="panel quiz-card">
          <h2>🏁 Partie terminée</h2>
          <p style="font-size:1.3rem">Score final : <strong class="quiz-score">${QUIZ.score} / ${QUIZ.total}</strong></p>
          <p style="color:var(--muted)">${QUIZ.score >= 8 ? 'Impressionnant, connaisseur du circuit !' : QUIZ.score >= 5 ? 'Solide connaissance des classements.' : 'Il faut suivre plus de tournois !'}</p>
          <button class="btn" id="quiz-restart">Rejouer</button></div>`;
        $('#quiz-restart', v).onclick = () => { QUIZ.n = 0; QUIZ.score = 0; quizNext(v); };
      } else quizNext(v);
    };
  });
}
function renderQuiz(v) {
  QUIZ.n = 0; QUIZ.score = 0;
  quizNext(v);
}

/* ============================================================
   VUE : ADMIN
   ============================================================ */
const ADMIN = { tab: 'joueurs', disc: 'duplicate', lic: null, parsed: null };

function renderAdmin(v) {
  if (!Store.isAdmin()) {
    v.innerHTML = `<div class="panel admin-login">
      <h1 style="font-family:var(--font-display)">🔐 Espace administrateur</h1>
      <p style="color:var(--muted);font-size:.9rem">Authentification locale (démo) — le mot de passe par défaut est <code>fisf2026</code>, modifiable dans Réglages.</p>
      <form id="login-form"><input class="input" type="password" id="login-pass" placeholder="Mot de passe" autocomplete="current-password">
      <button class="btn" style="width:100%;justify-content:center">Se connecter</button></form>
      <div id="login-err"></div></div>`;
    $('#login-form', v).onsubmit = e => {
      e.preventDefault();
      if ($('#login-pass', v).value === Store.settings().pass) { Store.setAdmin(true); renderAdmin(v); }
      else $('#login-err', v).innerHTML = '<div class="alert error mt">Mot de passe incorrect.</div>';
    };
    return;
  }

  v.innerHTML = `
  <div class="page-head"><h1>Administration</h1><span class="spacer"></span>
    <button class="btn ghost small" id="admin-logout">Déconnexion</button></div>
  <div class="admin-tabs">
    ${['joueurs', 'publier', 'reglages'].map(t =>
      `<button class="chip ${ADMIN.tab === t ? 'on' : ''}" data-tab="${t}">${{ joueurs: '👤 Fiches joueurs', publier: '⬆️ Publier un classement', reglages: '⚙️ Réglages & données' }[t]}</button>`).join('')}
  </div>
  <div id="admin-body"></div>`;

  $('#admin-logout', v).onclick = () => { Store.setAdmin(false); renderAdmin(v); };
  $$('.admin-tabs .chip', v).forEach(c => c.onclick = () => { ADMIN.tab = c.dataset.tab; renderAdmin(v); });
  const body = $('#admin-body', v);
  if (ADMIN.tab === 'joueurs') adminJoueurs(body);
  else if (ADMIN.tab === 'publier') adminPublier(body);
  else adminReglages(body);
}

/* ---------- Admin : fiches joueurs ---------- */
function adminJoueurs(body) {
  const D = getDisc(ADMIN.disc);
  const prof = ADMIN.lic ? profileOf(ADMIN.lic) || {} : null;

  body.innerHTML = `
  <div class="admin-cols">
    <div>
      <div class="row mb">
        <div class="seg">
          <button class="${ADMIN.disc === 'duplicate' ? 'active' : ''}" data-d="duplicate">Duplicate</button>
          <button class="${ADMIN.disc === 'classic' ? 'active' : ''}" data-d="classic">Classique</button>
        </div>
      </div>
      <input class="input mb" id="adm-q" type="search" placeholder="Rechercher un joueur…" style="width:100%">
      <div class="pick-list" id="adm-list"></div>
    </div>
    <div class="panel" id="adm-form">
      ${!ADMIN.lic ? '<div class="empty">Sélectionnez un joueur pour enrichir sa fiche<br>(photo, palmarès, anecdotes, pseudos, objectifs, topping…).</div>' : `
      <h3>${esc(fullName(byLicMap(D.players).get(String(ADMIN.lic)) || { nom: ADMIN.lic, pre: '' }))}</h3>
      <form id="prof-form" class="form-grid">
        <label class="full">URL de la photo<input class="input" id="pf-photo" value="${esc(prof.photo || '')}" placeholder="https://…/photo.jpg"></label>
        <label>Pseudo WebScrabble<input class="input" id="pf-ws" value="${esc(prof.pseudos?.ws || '')}"></label>
        <label>Pseudo ISC<input class="input" id="pf-isc" value="${esc(prof.pseudos?.isc || '')}"></label>
        <label>Autre pseudo<input class="input" id="pf-other" value="${esc(prof.pseudos?.other || '')}"></label>
        <label>Scrabble depuis (année)<input class="input" id="pf-since" value="${esc(prof.since || '')}" placeholder="ex. 2008"></label>
        <label>Année de naissance<input class="input" id="pf-birth" type="number" min="1930" max="2015" value="${esc(prof.birth || '')}" placeholder="débloque les repères par âge"></label>
        <label class="full">Objectifs 2026-2027<input class="input" id="pf-goals" value="${esc(prof.goals || '')}" placeholder="ex. monter en 1A"></label>
        <label>Lien topping<input class="input" id="pf-topping" value="${esc(prof.topping || '')}" placeholder="https://…"></label>
        <label>Site / réseau social<input class="input" id="pf-site" value="${esc(prof.site || '')}" placeholder="https://…"></label>
        <label class="full">Bio<textarea class="input" id="pf-bio">${esc(prof.bio || '')}</textarea></label>
        <div class="full"><label style="font-size:.78rem;color:var(--muted)">Palmarès (année + titre)</label>
          <div class="dyn-rows" id="pf-palm">${(prof.palmares || []).map(x => dynRow([x.y, x.t], ['2024', 'Championnat…'])).join('')}</div>
          <button type="button" class="btn ghost small mt" id="add-palm">+ Ajouter</button></div>
        <div class="full"><label style="font-size:.78rem;color:var(--muted)">Anecdotes publiques</label>
          <div class="dyn-rows" id="pf-ane">${(prof.anecdotes || []).map(t => dynRow([t], ['Texte…'])).join('')}</div>
          <button type="button" class="btn ghost small mt" id="add-ane">+ Ajouter</button></div>
        <div class="full row">
          <button class="btn" type="submit">💾 Enregistrer la fiche</button>
          <span class="spacer"></span>
          <button class="btn danger" type="button" id="pf-del">Supprimer</button>
        </div>
      </form>
      <div id="pf-msg"></div>`}
    </div>
  </div>`;

  $$('.seg button', body).forEach(b => b.onclick = () => { ADMIN.disc = b.dataset.d; ADMIN.lic = null; renderAdmin(view()); });

  const listEl = $('#adm-list', body);
  function refreshList() {
    const q = ($('#adm-q', body)?.value || '').trim().toLowerCase();
    const matches = D.players.filter(p => !q || fullName(p).toLowerCase().includes(q)).slice(0, 300);
    listEl.innerHTML = matches.map(p => `<button data-lic="${p.lic}" class="${String(p.lic) === String(ADMIN.lic) ? 'sel' : ''}">#${fmt(p.pl)} ${esc(fullName(p))} <span class="mini">${esc(p.pay)}</span></button>`).join('');
    $$('button[data-lic]', listEl).forEach(b => b.onclick = () => { ADMIN.lic = b.dataset.lic; renderAdmin(view()); });
  }
  $('#adm-q', body).oninput = refreshList;
  refreshList();

  if (!ADMIN.lic) return;
  const dynRowsVals = id => $$(`#${id} .dyn-row`, body).map(r => $$('.input', r).map(i => i.value.trim()).filter(Boolean));

  $('#add-palm', body).onclick = () => $('#pf-palm', body).insertAdjacentHTML('beforeend', dynRow(['', ''], ['2024', 'Titre…']));
  $('#add-ane', body).onclick = () => $('#pf-ane', body).insertAdjacentHTML('beforeend', dynRow([''], ['Texte…']));
  body.addEventListener('click', e => {
    const del = e.target.closest('.dyn-row .del');
    if (del) del.closest('.dyn-row').remove();
  });

  $('#prof-form', body).onsubmit = e => {
    e.preventDefault();
    const palm = dynRowsVals('pf-palm').filter(x => x.length >= 2).map(([y, t]) => ({ y, t }));
    const ane = dynRowsVals('pf-ane').map(x => x[0]).filter(Boolean);
    const obj = {
      photo: $('#pf-photo', body).value.trim(),
      pseudos: { ws: $('#pf-ws', body).value.trim(), isc: $('#pf-isc', body).value.trim(), other: $('#pf-other', body).value.trim() },
      since: $('#pf-since', body).value.trim(),
      birth: $('#pf-birth', body).value.trim(),
      goals: $('#pf-goals', body).value.trim(),
      topping: $('#pf-topping', body).value.trim(),
      site: $('#pf-site', body).value.trim(),
      bio: $('#pf-bio', body).value.trim(),
      palmares: palm, anecdotes: ane,
    };
    Store.saveProfile(ADMIN.lic, obj);
    $('#pf-msg', body).innerHTML = '<div class="alert ok mt">✅ Fiche enregistrée (stockage local du navigateur).</div>';
  };
  $('#pf-del', body).onclick = () => {
    if (!confirm('Supprimer cette fiche joueur ?')) return;
    Store.saveProfile(ADMIN.lic, null);
    ADMIN.lic = null; renderAdmin(view());
  };
}
function dynRow(vals, ph) {
  return `<div class="dyn-row">${vals.map((v, i) => `<input class="input" value="${esc(v)}" placeholder="${esc(ph[i] || '')}">`).join('')}
    <button type="button" class="btn ghost small del">✕</button></div>`;
}

/* ---------- Admin : publication d'un classement XLSX ---------- */
function normH(s) {
  if (s == null) return '';
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s_\.\-]+/g, '').toLowerCase();
}

function jsColMap(headers, wanted) {
  const normed = headers.map(normH);
  const out = {};
  for (const [key, cands] of Object.entries(wanted)) {
    for (const c of cands) { const i = normed.indexOf(normH(c)); if (i >= 0) { out[key] = i; break; } }
  }
  headers.forEach((h, i) => {
    const m = /^%s([1-6])25-?26$/.exec(normH(h));
    if (m) out['s' + m[1]] = out['s' + m[1]] ?? i;
  });
  return out;
}

function adminPublier(body) {
  body.innerHTML = `
  <div class="panel">
    <h3>Publier une nouvelle édition du classement</h3>
    <div class="alert info">Chargez le fichier <code>.xlsx</code> officiel (onglets « Duplicate FISF … » / « Classique FISF … »).
    Les places précédentes et l'historique sont recalculés par rapport à la publication en cours.</div>
    <div class="row mb">
      <select id="pub-disc" class="input">
        <option value="duplicate">Duplicate</option>
        <option value="classic">Classique</option>
      </select>
      <input type="file" id="pub-file" class="input" accept=".xlsx,.xls">
    </div>
    <div id="pub-preview"></div>
  </div>`;

  const D0 = getDisc('duplicate');
  $('#pub-file', body).onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!window.XLSX) { $('#pub-preview', body).innerHTML = '<div class="alert error">Bibliothèque XLSX non chargée (connexion internet requise pour cette étape).</div>'; return; }
    const disc = $('#pub-disc', body).value;
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const kw = disc === 'duplicate' ? 'duplicate' : 'classique';
      const wsName = wb.SheetNames.find(n => normH(n).includes(kw)) || wb.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { header: 1, defval: null, raw: true });
      const headers = rows[0] || [];
      const wanted = disc === 'duplicate'
        ? { lic: ['licence', 'license'], nom: ['nom'], pre: ['prenom'], club: ['club'], fed: ['fede', 'federation'], pay: ['pays'], pl: ['place', 'placec', 'rang'], s25: ['serie2526', 'serie 25-26'], s26: ['serie2627', 'serie 26-27', 'serie'] }
        : { lic: ['licence', 'license'], nom: ['nom'], pre: ['prenom'], club: ['club'], fed: ['fede', 'federation'], pay: ['pays'], pl: ['place', 'rang'], s25: ['serie 25-26', 'serie2526'], s26: ['serie 26-27', 'serie2627', 'serie'], cote: ['cote'], v: ['victoire', 'victoires'], d: ['defaite', 'defaites'], n: ['nul', 'nuls'], matchs: ['matchs', 'matches'], cmin: ['cote min', 'cotemin'], cmax: ['cote max', 'cotemax'] };
      const m = jsColMap(headers, wanted);
      const num = (v, fb2 = null) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? fb2 : (Number.isInteger(x) ? x : Math.round(x * 100) / 100); };
      const players = [];
      for (const r of rows.slice(1)) {
        const lic = num(r[m.lic]);
        if (lic == null) continue;
        const p = {
          lic, nom: String(r[m.nom] ?? '').trim(), pre: String(r[m.pre] ?? '').trim(),
          club: String(r[m.club] ?? '').trim(), fed: String(r[m.fed] ?? '').trim(),
          pay: String(r[m.pay] ?? '').trim(),
          s25: String(r[m.s25] ?? '').trim(), s26: String(r[m.s26] ?? '').trim(),
          pl: num(r[m.pl]),
        };
        if (disc === 'duplicate') {
          const pcts = [1, 2, 3, 4, 5, 6].map(i => num(r[m['s' + i]]));
          pcts.forEach((v, i) => p['s' + (i + 1)] = v ?? null);
        } else {
          Object.assign(p, { cote: num(r[m.cote]), v: num(r[m.v], 0), d: num(r[m.d], 0), n: num(r[m.n], 0), matchs: num(r[m.matchs], 0), cmin: num(r[m.cmin]), cmax: num(r[m.cmax]) });
        }
        players.push(p);
      }
      players.sort((a, b) => (a.pl ?? 1e9) - (b.pl ?? 1e9));
      ADMIN.parsed = { disc, players, file: f.name, wsName };
      const missing = ['lic', 'nom', 'pl'].filter(k => m[k] == null);
      $('#pub-preview', body).innerHTML = `
        <div class="alert ${missing.length ? 'error' : 'ok'}">
          Feuille « ${esc(wsName)} » : <strong>${fmt(players.length)}</strong> joueurs détectés${missing.length ? ` — colonnes introuvables : ${missing.join(', ')}` : ' — colonnes reconnues ✅'}</div>
        ${players.length ? `<table class="preview-table mb"><thead><tr><th>#</th><th>Nom</th><th>Prénom</th><th>Club</th><th>Pays</th><th>Série</th></tr></thead>
        <tbody>${players.slice(0, 5).map(p => `<tr><td>${fmt(p.pl)}</td><td>${esc(p.nom)}</td><td>${esc(p.pre)}</td><td>${esc(p.club)}</td><td>${esc(p.pay)}</td><td>${esc(p.s26)}</td></tr>`).join('')}</tbody></table>` : ''}
        <button class="btn" id="pub-go" ${missing.length || !players.length ? 'disabled' : ''}>🚀 Publier cette édition</button>
        <span class="panel-note" style="display:inline;margin-left:.7rem">La publication remacera le classement courant (les visiteurs de CE navigateur la verront ; pour un déploiement durable, utilisez aussi <code>tools/build_data.py</code>).</span>`;
      const go = $('#pub-go', body);
      if (go) go.onclick = () => publishParsed(body);
    } catch (err) {
      $('#pub-preview', body).innerHTML = `<div class="alert error">Lecture impossible : ${esc(err.message)}</div>`;
    }
  };
}

function publishParsed(body) {
  const { disc, players, file } = ADMIN.parsed;
  const cur = getDisc(disc);
  const curByLic = byLicMap(cur.players);
  const today = new Date().toISOString().slice(0, 10);
  for (const p of players) {
    const old = curByLic.get(String(p.lic));
    p.pv = old ? old.pl : null;
    p.nw = old ? 0 : 1;
  }
  const hist = {};
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  players.slice(0, 200).forEach(p => {
    const prev = cur.hist[String(p.lic)];
    hist[String(p.lic)] = prev ? [...prev.slice(1), p.pl]
      : (() => { const pts = [p.pl]; let c = p.pl; for (let i = 0; i < 4; i++) { c = Math.max(1, c + rnd(-4, 8)); pts.push(c); } return pts.reverse(); })();
  });
  const snapshots = [...cur.snapshots.slice(-4), today];
  const payload = { players, hist, snapshots, publishedAt: today, source: file };
  const size = JSON.stringify(payload).length;
  if (size > 4_500_000) {
    $('#pub-preview', body).insertAdjacentHTML('beforeend',
      `<div class="alert error">Fichier trop volumineux pour le stockage navigateur (${(size / 1e6).toFixed(1)} Mo). Utilisez <code>tools/build_data.py</code> pour cette discipline.</div>`);
    return;
  }
  Store.savePub(disc, payload);
  $('#pub-preview', body).insertAdjacentHTML('beforeend',
    `<div class="alert ok">✅ Édition publiée le ${today} (${fmt(players.length)} joueurs, ${(size / 1e6).toFixed(1)} Mo stockés). <a href="#/">Voir le classement</a></div>`);
  ADMIN.parsed = null;
  updateSimBanner();
}

/* ---------- Admin : réglages & données ---------- */
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function adminReglages(body) {
  body.innerHTML = `
  <div class="grid-2">
    <div class="panel"><h3>🔑 Mot de passe</h3>
      <form id="pwd-form" class="form-grid">
        <label class="full">Mot de passe actuel<input class="input" type="password" id="pw-old" required></label>
        <label class="full">Nouveau mot de passe<input class="input" type="password" id="pw-new" required minlength="4"></label>
        <div class="full"><button class="btn">Modifier</button></div>
      </form><div id="pw-msg"></div></div>
    <div class="panel"><h3>💾 Données locales (fiches + publications)</h3>
      <p class="panel-note" style="margin:0 0 .8rem">Ces données vivent dans le navigateur (localStorage) : utiles pour préparer/enrichir, mais un vrai déploiement passe par <code>tools/build_data.py</code> + hébergement.</p>
      <div class="row">
        <button class="btn secondary" id="exp-btn">⬇️ Exporter (JSON)</button>
        <label class="btn ghost" style="cursor:pointer">⬆️ Importer<input type="file" id="imp-file" accept=".json" hidden></label>
        <button class="btn danger" id="reset-btn">🗑 Réinitialiser</button>
      </div><div id="data-msg"></div></div>
  </div>`;
  $('#pwd-form', body).onsubmit = e => {
    e.preventDefault();
    const s = Store.settings();
    if ($('#pw-old', body).value !== s.pass) { $('#pw-msg', body).innerHTML = '<div class="alert error mt">Mot de passe actuel incorrect.</div>'; return; }
    s.pass = $('#pw-new', body).value;
    Store.saveSettings(s);
    $('#pw-msg', body).innerHTML = '<div class="alert ok mt">✅ Mot de passe modifié.</div>';
  };
  $('#exp-btn', body).onclick = () => download('fisf-export.json', JSON.stringify({
    profiles: Store.profiles(), settings: Store.settings(),
    pub_duplicate: Store.pub('duplicate'), pub_classic: Store.pub('classic'),
  }, null, 2));
  $('#imp-file', body).onchange = async e => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (data.profiles) Store.write(LS.profiles, data.profiles);
      if (data.settings) Store.saveSettings(data.settings);
      if (data.pub_duplicate) Store.savePub('duplicate', data.pub_duplicate);
      if (data.pub_classic) Store.savePub('classic', data.pub_classic);
      $('#data-msg', body).innerHTML = '<div class="alert ok mt">✅ Données importées.</div>';
    } catch (err) { $('#data-msg', body).innerHTML = `<div class="alert error mt">Import impossible : ${esc(err.message)}</div>`; }
  };
  $('#reset-btn', body).onclick = () => {
    if (!confirm('Effacer toutes les fiches joueurs et publications locales ?')) return;
    [LS.profiles, LS.settings, LS.pub('duplicate'), LS.pub('classic')].forEach(k => Store.remove(k));
    location.reload();
  };
}

/* ============================================================
   INITIALISATION
   ============================================================ */
function updateSimBanner() {
  const d = window.FISF_DATA;
  const anyReal = Store.pub('duplicate') || Store.pub('classic');
  $('#sim-banner').hidden = !(d.simulated && !anyReal);
  const pubs = [Store.pub('duplicate'), Store.pub('classic')].filter(Boolean);
  $('#foot-date').textContent = pubs.length
    ? [...new Set(pubs.map(p => p.publishedAt))].join(' & ') : d.generated;
}
(function init() {
  const d = window.FISF_DATA;
  $('#brand-season').textContent = 'Saison ' + d.season;
  $('#foot-season').textContent = d.season;
  updateSimBanner();
  $('#nav-burger').onclick = () => $('#nav').classList.toggle('open');
  let rtmr;
  window.addEventListener('resize', () => {
    clearTimeout(rtmr);
    rtmr = setTimeout(() => Charts.instances.forEach(c => c.resize()), 160);
  });
  route();
})();
