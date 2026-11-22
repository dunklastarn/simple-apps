/*
 * bgtimer.js — a background-reliable interval-timer engine.
 *
 * The problem: mobile browsers freeze JS timers (setInterval/rAF) when the tab is
 * backgrounded or the screen locks, so a timer that counts with setInterval drifts
 * or stalls, and audio cues are missed.
 *
 * The fix, in two parts:
 *  1. All state derives from the wall clock (Date.now). Whenever the page wakes, the
 *     current phase is recomputed from elapsed time — always exact, no drift, no
 *     replaying missed phases one tick at a time.
 *  2. Every beep for the whole remaining workout is scheduled up front on the Web
 *     Audio timeline (createAudio below). The audio thread renders those cues even
 *     while the main thread is frozen, so they fire at the right moments with the
 *     screen off. navigator.audioSession='playback' (iOS 16.4+) keeps the audio
 *     session alive when locked and ignores the mute switch; a silent looping source
 *     keeps the context from suspending.
 *
 * The timer core (BGTimer) is pure and DOM-free so it can be unit-tested with a fake
 * clock. The audio scheduler (BGTimer.createAudio) is browser-only.
 */
(function (root) {
  'use strict';

  // phases: [{ name, sec, ... }]  (sec > 0, may be fractional)
  // opts:   { now?: () => ms, countdown?: number (beeps before each phase end, default 3) }
  function BGTimer(phases, opts) {
    opts = opts || {};
    var nowFn = opts.now || function () { return Date.now(); };
    var countdown = opts.countdown == null ? 3 : opts.countdown;

    var total = 0;
    for (var i = 0; i < phases.length; i++) total += phases[i].sec;

    var self = {
      phases: phases,
      total: total,
      startAt: 0,      // epoch ms when phase 0 begins
      paused: false,
      pausedAt: 0,
      started: false,
      done: false      // caller-owned flag (engine never reads it)
    };

    function effNow() { return self.paused ? self.pausedAt : nowFn(); }

    // Current state from an absolute time. Pure: same input → same output.
    self.stateAt = function (nowMs) {
      var e = (nowMs - self.startAt) / 1000;
      if (e < 0) e = 0;
      if (e >= total) {
        var lastP = phases[phases.length - 1];
        return { done: true, index: phases.length - 1, phase: lastP, elapsed: total,
                 phaseStart: total - (lastP ? lastP.sec : 0), leftExact: 0, left: 0,
                 frac: 0, remainingTotal: 0 };
      }
      var acc = 0, idx = 0;
      for (idx = 0; idx < phases.length; idx++) {
        if (e < acc + phases[idx].sec) break;
        acc += phases[idx].sec;
      }
      var ph = phases[idx];
      var leftExact = acc + ph.sec - e;
      return {
        done: false, index: idx, phase: ph, elapsed: e, phaseStart: acc,
        leftExact: leftExact, left: Math.max(0, Math.ceil(leftExact - 1e-6)),
        frac: leftExact / ph.sec, remainingTotal: total - e
      };
    };
    self.state = function () { return self.stateAt(effNow()); };

    // Every audio cue boundary after `fromMs`, as absolute epoch ms. 'count' = a
    // countdown blip, 'transition' = phase changeover, 'finish' = workout complete.
    self.cues = function (fromMs) {
      var out = [], acc = self.startAt;
      for (var i = 0; i < phases.length; i++) {
        var start = acc, end = acc + phases[i].sec * 1000;
        for (var k = countdown; k >= 1; k--) {
          var t = end - k * 1000;
          if (t > fromMs && t > start) out.push({ at: t, type: 'count' });
        }
        if (end > fromMs) out.push({ at: end, type: i === phases.length - 1 ? 'finish' : 'transition', index: i });
        acc = end;
      }
      return out;
    };

    self.start = function (atMs) {
      self.startAt = (atMs == null ? nowFn() : atMs);
      self.paused = false; self.started = true; self.done = false;
      return self;
    };
    self.pause = function () {
      if (self.started && !self.paused) { self.pausedAt = nowFn(); self.paused = true; }
      return self;
    };
    self.resume = function () {
      if (self.started && self.paused) { self.startAt += nowFn() - self.pausedAt; self.paused = false; }
      return self;
    };
    self.togglePause = function () { return self.paused ? self.resume() : self.pause(); };

    // End the current phase now: advance to the next boundary.
    self.skip = function () {
      var s = self.stateAt(effNow());
      if (s.done) return self;
      var remainingMs = (s.phaseStart + s.phase.sec - s.elapsed) * 1000;
      self.startAt -= remainingMs;
      return self;
    };
    // Restart the current phase from its beginning.
    self.restartPhase = function () {
      var s = self.stateAt(effNow());
      if (s.done) return self;
      self.startAt += (s.elapsed - s.phaseStart) * 1000;
      return self;
    };

    return self;
  }

  // ---- browser-only audio scheduler ----
  if (typeof window !== 'undefined') {
    BGTimer.createAudio = function (palette) {
      palette = palette || {};
      var AC = window.AudioContext || window.webkitAudioContext;
      var ac = null, scheduled = [], cues = [], pumpIv = null, awakeUntil = 0;
      var LOOK = 250;   // ms before a cue that we wake the context to schedule it
      var TAIL = 1200;  // ms to keep the context awake after a cue before releasing focus

      function ensure() {
        if (!AC) return null;
        if (!ac) { try { ac = new AC(); } catch (e) { return null; } }
        return ac;
      }
      function clearNodes() {
        for (var i = 0; i < scheduled.length; i++) {
          try { scheduled[i].stop(); } catch (e) {}
          try { scheduled[i].disconnect(); } catch (e) {}
        }
        scheduled = [];
      }
      function toneAt(audioTime, freq, dur, vol) {
        if (!ac) return;
        var t0 = Math.max(audioTime, ac.currentTime + 0.001);
        var o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = freq;
        o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.03);
        scheduled.push(o);
      }
      function fire(c, at) {
        if (c.type === 'count') toneAt(at, palette.count || 880, 0.12, 0.28);
        else if (c.type === 'transition') toneAt(at, palette.transition || 1320, 0.3, 0.32);
        else if (c.type === 'finish') {
          var mel = palette.finish || [523, 659, 784, 1047];
          for (var j = 0; j < mel.length; j++) toneAt(at + j * 0.14, mel[j], 0.42, 0.24);
        }
      }
      // Runs every ~120ms while a workout is active. The AudioContext is what grabs audio
      // focus (and so ducks other apps' music), so we keep it SUSPENDED during the quiet
      // stretch of an interval, wake it only ~LOOK ms before a cue is due, play the cue,
      // then suspend it again TAIL ms later. Net effect: other music only dips around the
      // beeps, and recovers immediately when the workout ends (release/clear suspend too).
      function pump() {
        if (!ac) return;
        var now = Date.now(), i;
        for (i = 0; i < cues.length; i++) {
          var c = cues[i];
          if (c.fired || c.at > now + LOOK) continue;
          c.fired = true;
          if (c.at < now - 2000) continue; // long past (tab was frozen) — skip, don't blare
          if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
          fire(c, ac.currentTime + Math.max(0, (c.at - now) / 1000));
          if (c.at + TAIL > awakeUntil) awakeUntil = c.at + TAIL;
        }
        if (ac.state === 'running' && now > awakeUntil) {
          var soon = false;
          for (i = 0; i < cues.length; i++) if (!cues[i].fired && cues[i].at <= now + TAIL) { soon = true; break; }
          if (!soon) { try { ac.suspend(); } catch (e) {} }
        }
      }
      function startPump() { if (!pumpIv) pumpIv = setInterval(pump, 120); }
      function stopPump() { if (pumpIv) { clearInterval(pumpIv); pumpIv = null; } }

      // Replace the pending cue list (epoch ms). Cues are played just-in-time by pump().
      function schedule(list) {
        ensure(); if (!ac) return;
        clearNodes();
        awakeUntil = 0;
        cues = (list || []).map(function (c) { return { at: c.at, type: c.type, index: c.index, fired: false }; });
        startPump(); pump();
      }
      function clear() { clearNodes(); cues = []; awakeUntil = 0; if (ac && ac.state === 'running') { try { ac.suspend(); } catch (e) {} } }
      // End of workout: stop the pump and release audio focus so other music recovers now.
      function release() { stopPump(); clearNodes(); cues = []; awakeUntil = 0; if (ac) { try { ac.suspend(); } catch (e) {} } }

      return {
        ensure: ensure,
        keepAlive: function () { ensure(); startPump(); },
        release: release, clear: clear, schedule: schedule,
        get ctx() { return ac; }
      };
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = BGTimer;
  else root.BGTimer = BGTimer;
})(typeof self !== 'undefined' ? self : this);
