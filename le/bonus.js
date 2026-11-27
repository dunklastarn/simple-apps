/*
 * bonus.js — the follow-up questions after an Outline round:
 * flag, capital, neighbours, population, area, language and currency.
 *
 * LE.bonus(container, target, opts)
 *   opts.saved   previously saved answers [{q, ok}] (daily resume)
 *   opts.seed    number for deterministic options (daily) or null (free play)
 *   opts.onSave  function(answers, finished) called after every answer
 */
(function () {
  var LE = window.LE;

  function fmtPop(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 2).replace(/\.?0+$/, '') + ' billion';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '') + ' million';
    if (n >= 1e3) return Math.round(n / 1e3).toLocaleString('en-US') + ',000';
    return n.toLocaleString('en-US');
  }
  function fmtArea(a) {
    if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + ' million km²';
    if (a >= 1e4) return Math.round(a / 1e3).toLocaleString('en-US') + ',000 km²';
    return Math.round(a).toLocaleString('en-US') + ' km²';
  }

  // Nearby countries first, so the wrong answers are plausible.
  function nearby(target, pool) {
    return pool.filter(function (c) { return c.c !== target.c; })
      .map(function (c) { return { c: c, d: LE.km(c.ll, target.ll) }; })
      .sort(function (a, b) { return a.d - b.d; })
      .map(function (x) { return x.c; });
  }

  // Pick k numbers from other countries that differ clearly from the answer and each other.
  function spreadValues(answer, values, k, rnd) {
    var out = [answer];
    var cands = LE.shuffle(values.slice(), rnd);
    for (var i = 0; i < cands.length && out.length < k + 1; i++) {
      var v = cands[i];
      if (!v) continue;
      if (out.every(function (o) { return Math.max(o, v) / Math.min(o, v) >= 1.6; })) out.push(v);
    }
    return out.slice(1);
  }

  function buildQuestions(t, rnd) {
    var all = LE.countries;
    var sovereign = all.filter(function (c) { return c.d; });
    var near = nearby(t, sovereign);
    var Q = [];

    // 1. Flag
    var fopts = LE.shuffle(near.slice(0, 9), rnd).slice(0, 5).concat([t]);
    Q.push({ id: 'flag', text: 'Which is the flag of <b>' + LE.esc(t.n) + '</b>?', kind: 'flag',
      opts: LE.shuffle(fopts, rnd).map(function (c) { return { v: c.c, flag: c.c, label: c.n, ok: c.c === t.c }; }) });

    // 2. Capital
    if (t.cap) {
      var caps = [], seen = {}; seen[t.cap] = 1;
      near.forEach(function (c) { if (c.cap && !seen[c.cap] && caps.length < 8) { seen[c.cap] = 1; caps.push(c.cap); } });
      var copts = LE.shuffle(caps, rnd).slice(0, 3).concat([t.cap]);
      Q.push({ id: 'capital', text: 'What is the capital of <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
        opts: LE.shuffle(copts, rnd).map(function (v) { return { v: v, label: v, ok: v === t.cap }; }) });
    }

    // 3. Neighbours
    var nb = t.b.map(function (c) { return LE.byCode[c]; }).filter(Boolean);
    if (nb.length) {
      var shown = LE.shuffle(nb.slice(), rnd).slice(0, 6);
      var fill = near.filter(function (c) { return t.b.indexOf(c.c) < 0; }).slice(0, 12);
      fill = LE.shuffle(fill, rnd).slice(0, Math.max(2, 8 - shown.length));
      var nopts = LE.shuffle(shown.concat(fill), rnd);
      Q.push({ id: 'neighbors', text: 'Select every country that borders <b>' + LE.esc(t.n) + '</b>.', kind: 'multi',
        opts: nopts.map(function (c) { return { v: c.c, label: c.n, ok: t.b.indexOf(c.c) >= 0 }; }),
        reveal: nb.length > shown.length ? 'All ' + nb.length + ' neighbors: ' + nb.map(function (c) { return c.n; }).join(', ') : '' });
    } else {
      Q.push({ id: 'neighbors', text: 'How many countries share a land border with <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
        opts: ['0', '1', '2', '3'].map(function (v) { return { v: v, label: v === '0' ? 'None' : v, ok: v === '0' }; }) });
    }

    // 4. Population
    if (t.pop) {
      var pv = spreadValues(t.pop, all.map(function (c) { return c.pop; }), 3, rnd);
      if (pv.length === 3) {
        var popts = pv.concat([t.pop]).sort(function (a, b) { return a - b; });
        Q.push({ id: 'population', text: 'Roughly how many people live in <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
          opts: popts.map(function (v) { return { v: String(v), label: '≈ ' + fmtPop(v), ok: v === t.pop }; }),
          note: 'Population figures are approximate (around 2018).' });
      }
    }

    // 5. Area
    if (t.ar > 0) {
      var av = spreadValues(t.ar, all.map(function (c) { return c.ar > 0 ? c.ar : 0; }), 3, rnd);
      if (av.length === 3) {
        var aopts = av.concat([t.ar]).sort(function (a, b) { return a - b; });
        Q.push({ id: 'area', text: 'How big is <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
          opts: aopts.map(function (v) { return { v: String(v), label: fmtArea(v), ok: v === t.ar }; }) });
      }
    }

    // 6. Language
    if (t.lang.length) {
      var right = t.lang[Math.floor(rnd() * t.lang.length)], langs = [], ls = {};
      t.lang.forEach(function (l) { ls[l] = 1; });
      near.concat(LE.shuffle(sovereign.slice(), rnd)).forEach(function (c) {
        c.lang.forEach(function (l) { if (!ls[l] && langs.length < 10) { ls[l] = 1; langs.push(l); } });
      });
      var lopts = LE.shuffle(langs, rnd).slice(0, 3).concat([right]);
      Q.push({ id: 'language', text: 'Which of these is an official language of <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
        opts: LE.shuffle(lopts, rnd).map(function (v) { return { v: v, label: v, ok: v === right }; }),
        note: t.lang.length > 1 ? 'Official languages: ' + t.lang.join(', ') + '.' : '' });
    }

    // 7. Currency
    if (t.cur.length) {
      var cr = t.cur[0], curs = [], cs = {};
      t.cur.forEach(function (x) { cs[x] = 1; });
      near.concat(LE.shuffle(sovereign.slice(), rnd)).forEach(function (c) {
        c.cur.forEach(function (x) { if (!cs[x] && curs.length < 10) { cs[x] = 1; curs.push(x); } });
      });
      var kopts = LE.shuffle(curs, rnd).slice(0, 3).concat([cr]);
      Q.push({ id: 'currency', text: 'What currency is used in <b>' + LE.esc(t.n) + '</b>?', kind: 'text',
        opts: LE.shuffle(kopts, rnd).map(function (v) { return { v: v, label: v, ok: v === cr }; }) });
    }
    return Q;
  }

  var NAMES = { flag: 'Flag', capital: 'Capital', neighbors: 'Neighbors', population: 'Population', area: 'Area', language: 'Language', currency: 'Currency' };

  LE.bonusShare = function (answers) {
    if (!answers || !answers.length) return '';
    var ok = answers.filter(function (a) { return a.ok; }).length;
    return 'Bonus ' + answers.map(function (a) { return a.ok ? '⭐' : '⬛'; }).join('') + ' ' + ok + '/' + answers.length;
  };

  LE.bonus = function (parent, target, opts) {
    var rnd = opts.seed != null ? LE.rng(opts.seed) : Math.random;
    var Q = buildQuestions(target, rnd);
    var answers = (opts.saved || []).slice(0, Q.length);
    var card = LE.el('div', 'bonus-card');
    parent.appendChild(card);

    function head(num) {
      var ok = answers.filter(function (a) { return a.ok; }).length;
      return '<div class="bonus-head"><b>Bonus round</b><span>Question ' + num + ' of ' + Q.length +
        (answers.length ? ' · ' + ok + ' correct' : '') + '</span></div>' +
        '<div class="bonus-dots">' + Q.map(function (q, i) {
          var a = answers[i]; return '<i class="' + (a ? (a.ok ? 'ok' : 'no') : (i === answers.length ? 'cur' : '')) + '"></i>';
        }).join('') + '</div>';
    }
    function summary() {
      var ok = answers.filter(function (a) { return a.ok; }).length;
      card.innerHTML = '<div class="bonus-head"><b>Bonus round</b><span>' + ok + ' / ' + Q.length + ' correct</span></div>' +
        '<div class="bonus-sum">' + Q.map(function (q, i) {
          var a = answers[i], right = q.opts.filter(function (o) { return o.ok; }).map(function (o) { return o.label; });
          var ans = q.kind === 'flag' ? '' : (q.kind === 'multi' ? right.join(', ') : right[0]);
          return '<div class="bs-row"><span class="bs-mark ' + (a && a.ok ? 'ok' : 'no') + '">' + (a && a.ok ? '✓' : '✗') + '</span>' +
            '<span class="bs-name">' + NAMES[q.id] + '</span><span class="bs-ans">' +
            (q.kind === 'flag' ? '<img src="flags/' + target.c.toLowerCase() + '.svg" alt="">' : LE.esc(ans)) + '</span></div>';
        }).join('') + '</div>';
      if (opts.onDone) opts.onDone(answers);
    }
    function ask() {
      if (answers.length >= Q.length) { summary(); return; }
      var q = Q[answers.length];
      card.innerHTML = head(answers.length + 1) + '<div class="bonus-q">' + q.text + '</div>';
      var grid = LE.el('div', 'bonus-opts ' + (q.kind === 'flag' ? 'flags' : q.kind === 'multi' ? 'multi' : 'text'));
      var sel = {};
      q.opts.forEach(function (o) {
        var b = LE.el('button', 'bopt');
        if (q.kind === 'flag') b.innerHTML = '<img src="flags/' + o.flag.toLowerCase() + '.svg" alt="Flag option">';
        else b.textContent = o.label;
        b._o = o;
        b.onclick = function () {
          if (card.dataset.locked) return;
          if (q.kind === 'multi') { sel[o.v] = !sel[o.v]; b.classList.toggle('sel', !!sel[o.v]); return; }
          grade(o.ok, function (bb) { if (bb === b && !o.ok) bb.classList.add('wrong'); });
        };
        grid.appendChild(b);
      });
      card.appendChild(grid);
      var foot = LE.el('div', 'bonus-foot');
      if (q.kind === 'multi') {
        var check = LE.el('button', 'btn', 'Check');
        check.onclick = function () {
          if (card.dataset.locked) return;
          var ok = q.opts.every(function (o) { return !!sel[o.v] === o.ok; });
          grade(ok, function (bb) { if (sel[bb._o.v] && !bb._o.ok) bb.classList.add('wrong'); if (!sel[bb._o.v] && bb._o.ok) bb.classList.add('missed'); });
        };
        foot.appendChild(check);
      }
      var skip = LE.el('button', 'btn ghost', 'Skip');
      skip.onclick = function () { if (!card.dataset.locked) grade(false, function () {}); };
      foot.appendChild(skip);
      card.appendChild(foot);

      function grade(ok, mark) {
        card.dataset.locked = '1';
        Array.prototype.forEach.call(grid.children, function (bb) {
          if (bb._o.ok) bb.classList.add('right');
          mark(bb);
          if (q.kind === 'flag') { var l = LE.el('div', 'blbl'); l.textContent = bb._o.label; bb.appendChild(l); }
        });
        answers.push({ q: q.id, ok: ok });
        if (opts.onSave) opts.onSave(answers, answers.length >= Q.length);
        foot.innerHTML = '';
        var msg = LE.el('div', 'bonus-msg ' + (ok ? 'ok' : 'no'), ok ? 'Correct!' : 'Not quite.');
        foot.appendChild(msg);
        var extra = (q.reveal || '') + (q.reveal && q.note ? ' ' : '') + (q.note || '');
        if (extra) { var n = LE.el('div', 'bonus-note'); n.textContent = extra; card.appendChild(n); }
        var nx = LE.el('button', 'btn', answers.length >= Q.length ? 'See results' : 'Next question');
        nx.onclick = function () { delete card.dataset.locked; ask(); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
        foot.appendChild(nx);
        var h = card.querySelector('.bonus-head'), d = card.querySelector('.bonus-dots');
        var tmp = LE.el('div'); tmp.innerHTML = head(answers.length);
        h.replaceWith(tmp.children[0]); d.replaceWith(tmp.children[0]);
      }
    }
    ask();
    return { el: card };
  };
})();
