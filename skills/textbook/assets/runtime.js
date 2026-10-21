/* First-principles figures.
   A run's figures live in its own figures/ folder and register with FP.fig(id, setup);
   the builder inlines them after this file. The runtime gives every figure the same
   chrome: a canvas sized to its column at the device's pixel ratio, colors read from the
   page's tokens so both themes work, a redraw on resize and on theme change, a seeded
   random source so a figure looks the same on every load, and lazy setup once the figure
   nears the viewport, so a long page does not compute every figure at load. */
var FP = (function () {
  var setups = {}, live = [], api = {};
  var root = document.querySelector('.viz-root') || document.documentElement;
  api.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  api.fig = function (id, setup) { setups[id] = setup; };

  api.colors = function () {
    var s = getComputedStyle(root), c = {};
    ['surface', 'surface-2', 'rule', 'ink', 'ink-2', 'ink-3', 'open', 'contested', 'eng',
     'open-bg', 'contested-bg', 'eng-bg'].forEach(function (k) {
      c[k.replace('-', '')] = s.getPropertyValue('--' + k).trim();
    });
    return c;
  };

  // a token color at an alpha, for hex tokens (#rgb or #rrggbb)
  api.alpha = function (hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, function (ch) { return ch + ch; });
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  // mulberry32, so every load draws the same samples
  api.rng = function (seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  api.gauss = function (r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); };

  var memo = {};
  api.memo = function (key, make) { if (!(key in memo)) memo[key] = make(); return memo[key]; };

  // A canvas that fills the figure's stage. height(w) gives the CSS height for a width.
  api.canvas = function (fig, height) {
    var stage = fig.querySelector('.fpstage');
    var cv = document.createElement('canvas');
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', stage.getAttribute('data-label') || '');
    stage.appendChild(cv);
    var o = { cv: cv, ctx: cv.getContext('2d'), w: 0, h: 0 };
    o.fit = function () {
      var w = Math.max(240, Math.round(stage.clientWidth)), h = Math.round(height(w));
      var r = Math.min(window.devicePixelRatio || 1, 2);
      if (w === o.w && h === o.h && cv.width === Math.round(w * r)) return false;
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.width = Math.round(w * r); cv.height = Math.round(h * r);
      o.ctx.setTransform(r, 0, 0, r, 0, 0);
      o.w = w; o.h = h;
      return true;
    };
    o.fit();
    return o;
  };

  // controls rendered by the builder, found by attribute: a range input carries data-c,
  // its readout data-o, a button data-act, and a segmented group of buttons data-seg
  api.val = function (fig, name) { var el = fig.querySelector('[data-c="' + name + '"]'); return el ? parseFloat(el.value) : NaN; };
  api.input = function (fig, name, cb) { var el = fig.querySelector('[data-c="' + name + '"]'); if (el) el.addEventListener('input', cb); return el; };
  api.out = function (fig, name, text) { var el = fig.querySelector('[data-o="' + name + '"]'); if (el) el.textContent = text; };
  api.act = function (fig, name, cb) { var el = fig.querySelector('[data-act="' + name + '"]'); if (el) el.addEventListener('click', cb); return el; };
  api.seg = function (fig, name, cb) {
    var box = fig.querySelector('[data-seg="' + name + '"]');
    if (!box) return function () { return null; };
    var btns = box.querySelectorAll('button');
    function pick(b) {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cb && cb(b.getAttribute('data-v'));
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
    return function () { var on = box.querySelector('[aria-pressed="true"]'); return on ? on.getAttribute('data-v') : null; };
  };

  // A play loop that pauses while its figure is off screen and resumes when it returns.
  // step(dt) returns false to stop.
  api.loop = function (fig, step) {
    var on = false, want = false, last = 0;
    function frame(ts) {
      if (!on) return;
      if (!fig._visible) { on = false; return; }
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      if (step(dt) === false) { on = want = false; return; }
      requestAnimationFrame(frame);
    }
    var l = {
      start: function () { want = true; if (on) return; on = true; last = 0; requestAnimationFrame(frame); },
      stop: function () { on = want = false; },
      running: function () { return want; },
      resume: function () { if (want && !on) { on = true; last = 0; requestAnimationFrame(frame); } }
    };
    (fig._loops = fig._loops || []).push(l);
    return l;
  };

  // map a value range onto a pixel range
  api.scale = function (d0, d1, r0, r1) { return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); }; };

  function start(fig) {
    if (fig._fp) return;
    var id = fig.getAttribute('data-fig'), setup = setups[id];
    if (!setup) return;
    try { fig._fp = setup(fig, api) || {}; live.push(fig); }
    catch (err) { fig.classList.add('fperr'); if (window.console) console.error('figure ' + id, err); return; }
    // A figure set up before layout (a hidden tab, a collapsed section) drew at the minimum
    // width, so redraw it once its stage has a real width, and on any later width change.
    if ('ResizeObserver' in window && fig._fp.draw) {
      var stage = fig.querySelector('.fpstage'), w = stage.clientWidth;
      new ResizeObserver(function () {
        if (stage.clientWidth !== w) { w = stage.clientWidth; fig._fp.draw(true); }
      }).observe(stage);
    }
  }

  function redrawAll() { live.forEach(function (f) { if (f._fp.draw) f._fp.draw(true); }); }

  function boot() {
    var figs = document.querySelectorAll('.fpfig[data-fig]');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          en.target._visible = en.isIntersecting;
          if (en.isIntersecting) {
            start(en.target);
            (en.target._loops || []).forEach(function (l) { l.resume(); });
          }
        });
      }, { rootMargin: '300px 0px' });
      figs.forEach(function (f) { io.observe(f); });
    } else {
      figs.forEach(function (f) { f._visible = true; start(f); });
    }
    var t = null;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(redrawAll, 120); });
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', redrawAll);
    }
    if ('MutationObserver' in window) {
      new MutationObserver(redrawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
  }
  api.boot = boot;
  return api;
})();
