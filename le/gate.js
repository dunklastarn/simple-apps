/*
 * gate.js — a simple password lock for the le apps pages.
 *
 * This is a casual lock, not real security: the site is static, so anyone who
 * reads the source can get past it. It keeps the pages from being opened by
 * accident or by someone who stumbles onto the link.
 *
 * To change the password, put the SHA-256 of "le:" + your password in HASH:
 *   printf 'le:NEWPASSWORD' | sha256sum
 * then bump the CACHE version in sw.js and push.
 */
(function () {
  var HASH = '87b6218b62835a49d34f2cf81fe7d69c565e750eb412c94a32784718d3956c66';
  var KEY = 'le:unlock';
  var root = document.documentElement;
  var ok = false;
  try { ok = localStorage.getItem(KEY) === HASH; } catch (e) {}
  window.LE_UNLOCKED = ok;
  if (ok) return;

  root.classList.add('le-locked');
  var st = document.createElement('style');
  st.textContent = 'html.le-locked body > *:not(#le-gate){display:none !important}';
  document.head.appendChild(st);

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function sha(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(hex);
  }

  function show() {
    var g = document.createElement('div');
    g.id = 'le-gate';
    g.innerHTML =
      '<form autocomplete="off">' +
      '<div class="lock"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg></div>' +
      '<h2>Le apps</h2><p>Enter the password to play.</p>' +
      '<input type="password" placeholder="Password" aria-label="Password" autocapitalize="off" autocorrect="off" spellcheck="false">' +
      '<button class="btn" type="submit">Unlock</button>' +
      '<div class="err"></div>' +
      '<p style="margin-top:22px"><a href="../" style="color:var(--accent);text-decoration:none">‹ Back to Apps</a></p>' +
      '</form>';
    document.body.appendChild(g);
    var input = g.querySelector('input'), err = g.querySelector('.err');
    setTimeout(function () { input.focus(); }, 50);
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      sha('le:' + input.value).then(function (h) {
        if (h === HASH) {
          try { localStorage.setItem(KEY, HASH); } catch (x) {}
          window.LE_UNLOCKED = true;
          root.classList.remove('le-locked');
          g.remove();
          document.dispatchEvent(new Event('le-unlocked'));
        } else {
          err.textContent = 'Wrong password';
          g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
          input.select();
        }
      });
    });
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
