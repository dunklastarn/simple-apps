/*
 * common.js — shared helpers for the le apps: daily seeds, storage, stats,
 * the country guess box, distance/direction maths, modals and the shell.
 */
(function () {
  var LE = window.LE = {};

  LE.GAMES = [
    { id: 'globe',     name: 'Globe',      file: 'globe.html',     daily: true },
    { id: 'outline',   name: 'Outline',    file: 'outline.html',   daily: true },
    { id: 'words',     name: 'Words',      file: 'words.html',     daily: true },
    { id: 'flaggle',   name: 'Flag Tiles', file: 'flaggle.html',   daily: true },
    { id: 'flagcolors', name: 'Flag Colors', file: 'flagcolors.html', daily: true },
    { id: 'elementle', name: 'Elements',   file: 'elementle.html', daily: true },
    { id: 'chain',     name: 'Word Chain', file: 'chain.html',     daily: true },
    { id: 'quordle',   name: 'Quad Words', file: 'quordle.html',   daily: true },
    { id: 'bee',       name: 'Hive',       file: 'bee.html',       daily: true },
    { id: 'flagmatch', name: 'Flag Match', file: 'flagmatch.html', daily: false }
  ];

  // ---------- dates & randomness ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  LE.today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  LE.dayIndex = function () {
    var d = new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5);
  };
  LE.hash = function (s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  LE.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  LE.shuffle = function (arr, rnd) {
    rnd = rnd || Math.random;
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  // ---------- URL modes ----------
  var qs = new URLSearchParams(location.search);
  LE.free = qs.get('free') === '1';
  LE.all = qs.get('all') === '1';

  // ---------- storage ----------
  LE.get = function (k, def) {
    try { var v = localStorage.getItem('le:' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
  };
  LE.set = function (k, v) { try { localStorage.setItem('le:' + k, JSON.stringify(v)); } catch (e) {} };
  LE.dayState = function (game) { return LE.get(game + ':' + LE.today(), null); };
  LE.saveDay = function (game, st) { LE.set(game + ':' + LE.today(), st); };

  LE.stats = function (game) {
    return LE.get('stats:' + game, { played: 0, wins: 0, streak: 0, max: 0, dist: {}, last: null });
  };
  // Records a finished daily game once. n = guesses used (for the distribution).
  LE.record = function (game, won, n) {
    var s = LE.stats(game), today = LE.today();
    if (s.last === today) return s;
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yest = y.getFullYear() + '-' + pad(y.getMonth() + 1) + '-' + pad(y.getDate());
    s.played++;
    if (won) {
      s.wins++;
      s.streak = (s.lastWin === yest) ? s.streak + 1 : 1;
      s.max = Math.max(s.max, s.streak);
      s.lastWin = today;
      s.dist[n] = (s.dist[n] || 0) + 1;
    } else { s.streak = 0; }
    s.last = today;
    LE.set('stats:' + game, s);
    return s;
  };

  // ---------- countries ----------
  var C = window.COUNTRIES || [];
  LE.countries = C;
  LE.byCode = {};
  C.forEach(function (c) { LE.byCode[c.c] = c; });
  LE.norm = function (s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  };
  function words(s) { return s.split(/[\s\-'’.,()]+/).map(LE.norm).filter(Boolean); }
  var index = [];
  C.forEach(function (c) {
    index.push({ k: LE.norm(c.n), c: c, main: true, w: words(c.n) });
    c.a.forEach(function (a) { index.push({ k: LE.norm(a), c: c, main: false, w: words(a) }); });
  });
  LE.find = function (text) {
    var k = LE.norm(text);
    if (!k) return null;
    for (var i = 0; i < index.length; i++) if (index[i].main && index[i].k === k) return index[i].c;
    for (i = 0; i < index.length; i++) if (index[i].k === k) return index[i].c;
    return null;
  };
  LE.suggest = function (text, exclude, pool) {
    var k = LE.norm(text);
    if (!k) return [];
    var seen = {}, starts = [], has = [], alt = [];
    // Main names first (whole-name prefix, then any word's prefix), then other spellings.
    [true, false].forEach(function (pass) {
      index.forEach(function (e) {
        var c = e.c;
        if (e.main !== pass || seen[c.c] || (exclude && exclude[c.c]) || (pool && !pool[c.c])) return;
        var p = e.k.indexOf(k);
        if (p < 0) return;
        if (p > 0 && !e.w.some(function (w) { return w.indexOf(k) === 0; })) return;
        seen[c.c] = 1;
        if (e.main && p === 0) starts.push(c);
        else if (e.main) has.push(c);
        else alt.push(c);
      });
    });
    return starts.concat(has, alt).slice(0, 8);
  };

  // Daily countries for the three country games, chosen so no two share a country.
  LE.dailyCountry = function (game) {
    var pool = C.filter(function (c) { return c.d; }).map(function (c) { return c.c; }).sort();
    var day = LE.dayIndex(), used = {}, pick = {};
    ['globe', 'outline', 'flaggle', 'flagcolors'].forEach(function (g) {
      var order = LE.shuffle(pool.slice(), LE.rng(LE.hash('le-daily-' + g)));
      var i = ((day % order.length) + order.length) % order.length;
      while (used[order[i]]) i = (i + 1) % order.length;
      used[order[i]] = 1; pick[g] = order[i];
    });
    return LE.byCode[pick[game]];
  };
  // Free play / endless picks come from a shuffled deck saved on this device:
  // every item appears once before anything repeats, across reloads too.
  LE.rand = function () {
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); }
  };
  LE.deckNext = function (key, ids) {
    var k = 'deck:' + key, d = LE.get(k, null);
    var sig = ids.length + ':' + LE.hash(ids.slice().sort().join(','));
    if (!d || d.sig !== sig || d.i >= d.ids.length) {
      var last = d && d.ids ? d.ids.slice(Math.max(0, d.i - 8), d.i) : [];
      var ids2 = LE.shuffle(ids.slice(), LE.rand);
      // keep the last few of the old deck out of the first few of the new one
      if (last.length && ids2.length > 20) {
        var head = ids2.slice(0, 8).filter(function (x) { return last.indexOf(x) >= 0; });
        ids2 = ids2.filter(function (x) { return head.indexOf(x) < 0; });
        head.forEach(function (x) { ids2.splice(8 + Math.floor(LE.rand() * (ids2.length - 8)), 0, x); });
      }
      d = { sig: sig, ids: ids2, i: 0 };
    }
    var v = d.ids[d.i++];
    LE.set(k, d);
    return v;
  };
  LE.randomCountry = function (game, opts) {
    var ids = C.filter(function (c) { return (opts && opts.all) || c.d; }).map(function (c) { return c.c; });
    return LE.byCode[LE.deckNext(game || 'free', ids)];
  };

  // ---------- geo maths ----------
  var R = 6371, rad = Math.PI / 180;
  LE.km = function (a, b) { // a, b = [lat, lon]
    var dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  LE.bearing = function (a, b) {
    var p1 = a[0] * rad, p2 = b[0] * rad, dl = (b[1] - a[1]) * rad;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / rad + 360) % 360;
  };
  LE.ARROWS = ['⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️'];
  LE.arrowEmoji = function (deg) { return LE.ARROWS[Math.round(deg / 45) % 8]; };
  LE.fmtKm = function (km) { return Math.round(km).toLocaleString('en-US') + ' km'; };
  LE.MAXD = 20000;
  LE.proximity = function (km) { return Math.max(0, Math.round((1 - km / LE.MAXD) * 100)); };

  // ---------- UI bits ----------
  LE.el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  LE.esc = function (s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };

  var toastBox;
  LE.toast = function (msg, ms) {
    if (!toastBox) { toastBox = LE.el('div', 'toast-box'); document.body.appendChild(toastBox); }
    var t = LE.el('div', null); t.textContent = msg; toastBox.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 1600);
  };

  LE.modal = function (title, bodyHTML) {
    var back = LE.el('div', 'modal-back show');
    back.innerHTML = '<div class="modal" role="dialog"><button class="icon-btn close" aria-label="Close">' + ICON.x + '</button><h2></h2><div class="mbody"></div></div>';
    back.querySelector('h2').textContent = title;
    var body = back.querySelector('.mbody');
    if (typeof bodyHTML === 'string') body.innerHTML = bodyHTML; else if (bodyHTML) body.appendChild(bodyHTML);
    function close() { back.remove(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.close').onclick = close;
    document.body.appendChild(back);
    return { el: back, body: body, close: close };
  };

  LE.share = function (text) {
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      navigator.share({ text: text }).catch(function () {});
      return;
    }
    var done = function () { LE.toast('Copied to clipboard'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
    }
  };

  var ICON = LE.ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4"/><circle cx="12" cy="17.4" r=".6" fill="currentColor"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };

  // Top bar + Daily/Free switch. opts: {game, title, help(), stats(), settings(), noModes}
  LE.shell = function (opts) {
    var bar = LE.el('div', 'topbar');
    var sub = opts.noModes ? (opts.sub || '') : (LE.free ? 'Free play' : 'Daily · ' + LE.today());
    bar.innerHTML =
      '<a class="icon-btn" href="./" aria-label="Back">' + ICON.back + '</a>' +
      (opts.help ? '<button class="icon-btn" data-a="help" aria-label="How to play">' + ICON.help + '</button>' : '<span style="width:40px"></span>') +
      '<div class="title">' + LE.esc(opts.title) + '<small>' + LE.esc(sub) + '</small></div>' +
      (opts.settings ? '<button class="icon-btn" data-a="settings" aria-label="Settings">' + ICON.gear + '</button>' : '<span style="width:40px"></span>') +
      (opts.stats ? '<button class="icon-btn" data-a="stats" aria-label="Statistics">' + ICON.stats + '</button>' : '<span style="width:40px"></span>');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      opts[b.getAttribute('data-a')]();
    });
    document.body.insertBefore(bar, document.body.firstChild);
    var main = document.querySelector('.main');
    if (!opts.noModes && main) {
      var mb = LE.el('div', 'modebar');
      mb.innerHTML = '<div class="seg"><button data-m="d" class="' + (LE.free ? '' : 'on') + '">Daily</button><button data-m="f" class="' + (LE.free ? 'on' : '') + '">Free play</button></div>';
      mb.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var want = b.getAttribute('data-m') === 'f';
        if (want === LE.free && !want) return;
        location.replace(location.pathname + (want ? '?free=1' : (LE.all ? '?all=1' : '')));
      });
      main.insertBefore(mb, main.firstChild);
    }
    if (opts.help && !LE.get('seen:' + opts.game)) { LE.set('seen:' + opts.game, 1); setTimeout(opts.help, 250); }
  };

  LE.statsHTML = function (game, rows, unit) {
    var s = LE.stats(game);
    var h = '<div class="stats">' +
      '<div><b>' + s.played + '</b><span>Played</span></div>' +
      '<div><b>' + (s.played ? Math.round(s.wins / s.played * 100) : 0) + '</b><span>Win %</span></div>' +
      '<div><b>' + s.streak + '</b><span>Streak</span></div>' +
      '<div><b>' + s.max + '</b><span>Max streak</span></div></div>';
    if (rows === null) {
      var tot = 0, cnt = 0;
      Object.keys(s.dist).forEach(function (k) { tot += k * s.dist[k]; cnt += s.dist[k]; });
      h += '<p class="center muted" style="margin:0 0 16px">' + (cnt ? 'Average: <b style="color:var(--ink)">' + (tot / cnt).toFixed(1) + '</b> ' + (unit || 'guesses to find it') : 'No wins yet.') + '</p>';
    }
    if (rows) {
      var keys = [];
      if (typeof rows === 'number') for (var i = 1; i <= rows; i++) keys.push(String(i));
      else keys = Object.keys(s.dist).sort(function (a, b) { return a - b; });
      var max = 1; keys.forEach(function (k) { max = Math.max(max, s.dist[k] || 0); });
      var st = LE.dayState(game);
      h += '<div class="dist"><div class="muted" style="font-weight:700;font-size:.8rem;margin-bottom:6px">GUESS DISTRIBUTION</div>';
      if (!keys.length) h += '<div class="muted">No wins yet.</div>';
      keys.forEach(function (k) {
        var n = s.dist[k] || 0;
        var hi = st && st.won && String(st.n) === k;
        h += '<div class="bar"><i>' + k + '</i><span class="' + (hi ? 'hi' : '') + '" style="width:' + Math.max(7, n / max * 100) + '%">' + n + '</span></div>';
      });
      h += '</div>';
    }
    return h;
  };

  // The next unfinished daily game, for "Play all".
  LE.nextUnplayed = function (after) {
    var list = LE.GAMES.filter(function (g) { return g.daily; });
    var start = 0;
    if (after) list.forEach(function (g, i) { if (g.id === after) start = i + 1; });
    for (var i = start; i < list.length; i++) {
      var st = LE.dayState(list[i].id);
      if (!st || !st.done) return list[i];
    }
    for (i = 0; i < start; i++) {
      st = LE.dayState(list[i].id);
      if (!st || !st.done) return list[i];
    }
    return null;
  };

  // End-of-game panel: share, next (play all), new game (free play), stats.
  LE.endActions = function (game, shareText, onNew) {
    var box = LE.el('div', 'row-c');
    if (shareText) {
      var sb = LE.el('button', 'btn', 'Share'); sb.onclick = function () { LE.share(typeof shareText === 'function' ? shareText() : shareText); }; box.appendChild(sb);
    }
    if (LE.free) {
      var nb = LE.el('button', 'btn', 'New game'); nb.onclick = onNew; box.appendChild(nb);
    } else {
      var next = LE.nextUnplayed(game);
      if (LE.all) {
        if (next) {
          var a = LE.el('a', 'btn', 'Next: ' + next.name + ' →'); a.href = next.file + '?all=1'; a.style.textDecoration = 'none'; box.appendChild(a);
        } else {
          var h = LE.el('a', 'btn', 'All done — back to games'); h.href = './'; h.style.textDecoration = 'none'; box.appendChild(h);
        }
      }
      var fp = LE.el('a', 'btn ghost', 'Free play'); fp.href = location.pathname + '?free=1'; fp.style.textDecoration = 'none'; box.appendChild(fp);
    }
    return box;
  };

  // Country guess box with suggestions. opts: {onGuess(c), exclude (obj), pool (obj), placeholder, down}
  LE.guessBox = function (parent, opts) {
    var box = LE.el('div', 'guess-box');
    box.innerHTML = '<input type="text" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="go">' +
      '<div class="suggest' + (opts.down ? ' down' : '') + '"></div><button class="btn" type="button">Guess</button>';
    var input = box.querySelector('input'), sug = box.querySelector('.suggest'), btn = box.querySelector('button');
    input.placeholder = opts.placeholder || 'Country or territory';
    var items = [], sel = -1;
    function render() {
      items = LE.suggest(input.value, opts.exclude, opts.pool);
      sel = items.length ? 0 : -1;
      sug.innerHTML = '';
      items.forEach(function (c, i) {
        var d = LE.el('div', i === sel ? 'on' : ''); d.textContent = c.n;
        d.addEventListener('mousedown', function (e) { e.preventDefault(); pick(c); });
        sug.appendChild(d);
      });
      sug.style.display = items.length && input.value ? 'block' : 'none';
    }
    function pick(c) {
      input.value = ''; items = []; sel = -1; sug.innerHTML = ''; sug.style.display = 'none';
      opts.onGuess(c);
    }
    function submit() {
      if (!input.value.trim()) return;      // nothing typed: never re-submit an old suggestion
      items = LE.suggest(input.value, opts.exclude, opts.pool);
      var c = LE.find(input.value);
      if (!c && items.length === 1) c = items[0];
      if (!c && items[0] && LE.norm(items[0].n).indexOf(LE.norm(input.value)) === 0) c = items[0];
      if (!c) { if (input.value.trim()) LE.toast('Not a country in the list'); return; }
      if (opts.pool && !opts.pool[c.c]) { LE.toast('Not in this game'); return; }
      if (opts.exclude && opts.exclude[c.c]) { LE.toast('Already guessed'); input.value = ''; render(); return; }
      pick(c);
    }
    input.addEventListener('input', render);
    input.addEventListener('blur', function () { setTimeout(function () { sug.style.display = 'none'; }, 120); });
    input.addEventListener('focus', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!items.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        Array.prototype.forEach.call(sug.children, function (d, i) { d.className = i === sel ? 'on' : ''; });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!input.value.trim()) return;
        var exact = LE.find(input.value);
        if (exact) {                          // a full name typed: use it, even if a suggestion differs
          if (opts.exclude && opts.exclude[exact.c]) { LE.toast('Already guessed'); return; }
          if (opts.pool && !opts.pool[exact.c]) { LE.toast('Not in this game'); return; }
          pick(exact);
        } else if (sel >= 0 && items[sel]) pick(items[sel]);
        else submit();
      }
    });
    btn.addEventListener('click', submit);
    parent.appendChild(box);
    return { el: box, input: input, hide: function () { box.style.display = 'none'; }, show: function () { box.style.display = ''; }, refresh: render };
  };

  // Shared row for distance/direction games (Outline, Flag Tiles).
  LE.distRow = function (guess, target) {
    var row = LE.el('div', 'grow');
    if (guess.c === target.c) {
      row.className = 'grow win';
      row.innerHTML = '<div></div><div>0 km</div><div class="arrow">🎉</div><div>100%</div>';
    } else {
      var km = LE.km(guess.ll, target.ll), b = LE.bearing(guess.ll, target.ll);
      row.innerHTML = '<div></div><div>' + LE.fmtKm(km).replace(' km', '') + ' km</div>' +
        '<div class="arrow"><svg viewBox="0 0 24 24" style="transform:rotate(' + Math.round(b) + 'deg)" aria-label="direction"><path d="M12 3 5 11h4.5v10h5V11H19z" fill="currentColor"/></svg></div><div>' + LE.proximity(km) + '%</div>';
    }
    var nm = document.createElement('span'); nm.textContent = guess.n; row.firstChild.appendChild(nm);
    return row;
  };
  LE.emptyRow = function () {
    var r = LE.el('div', 'grow empty'); r.innerHTML = '<div></div><div></div><div></div><div></div>'; return r;
  };
  // Worldle-style share line: 5 squares by proximity + a direction emoji.
  LE.shareLine = function (guess, target) {
    if (guess.c === target.c) return '🟩🟩🟩🟩🟩🎉';
    var km = LE.km(guess.ll, target.ll), p = LE.proximity(km);
    var full = Math.floor(p / 20), half = (p - full * 20) >= 10 ? 1 : 0, s = '';
    for (var i = 0; i < 5; i++) s += i < full ? '🟩' : (i === full && half ? '🟨' : '⬜');
    return s + LE.arrowEmoji(LE.bearing(guess.ll, target.ll));
  };

  // ---------- navigation ----------
  // Moving between games replaces the current history entry, so the phone's
  // back button (and the ‹ icon) always returns to the games menu, never to
  // the previously played game.
  LE.goHub = function () {
    var fromHub = false;
    try { fromHub = sessionStorage.getItem('le:fromHub') === '1'; } catch (e) {}
    if (fromHub && history.length > 1) history.back();
    else location.replace('./');
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var href = a.getAttribute('href');
    var url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    var here = location.pathname.replace(/[^/]*$/, '');
    if (url.pathname.indexOf(here) !== 0) return;          // leaving le/ (e.g. ../): normal link
    e.preventDefault();
    var rest = url.pathname.slice(here.length);
    if (rest === '' || rest === 'index.html') LE.goHub();
    else location.replace(url.href);
  });

  // Run fn once unlocked (the gate hides the page until then).
  LE.ready = function (fn) {
    function go() { if (window.LE_UNLOCKED) fn(); else document.addEventListener('le-unlocked', fn, { once: true }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
})();
