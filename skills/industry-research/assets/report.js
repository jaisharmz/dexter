/* Openness-map tooltip.
   One cancellable timer, not a timer per mouseleave. Moving between adjacent
   cells used to schedule a hide from the cell you left that fired 120ms later,
   after the next cell had already opened, so the tooltip vanished mid-scan. */
(function () {
  var tip = document.getElementById('tip');
  if (!tip) return;
  var timer = null, over = false;

  function cancel() { if (timer) { clearTimeout(timer); timer = null; } }

  function place(el) {
    var r = el.getBoundingClientRect();
    // measure while mounted but invisible, so offsetHeight is real
    tip.style.visibility = 'hidden';
    tip.classList.add('on');
    var h = tip.offsetHeight, w = tip.offsetWidth;
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    var left = Math.min(r.left, window.innerWidth - w - 12);
    tip.style.top = Math.max(8, top) + 'px';
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.visibility = '';
  }

  function show(el) {
    var n = el.getAttribute('data-work');
    if (!n) return;
    cancel();
    tip.innerHTML = '<h4>' + (el.getAttribute('data-title') || '') + '</h4>' + n;
    place(el);
  }

  function hideSoon() {
    cancel();
    timer = setTimeout(function () { if (!over) tip.classList.remove('on'); }, 220);
  }

  tip.addEventListener('mouseenter', function () { over = true; cancel(); });
  tip.addEventListener('mouseleave', function () { over = false; hideSoon(); });

  document.querySelectorAll('.cell').forEach(function (c) {
    c.addEventListener('mouseenter', function () { over = false; show(c); });
    c.addEventListener('mouseleave', hideSoon);
    c.addEventListener('focus', function () { over = false; show(c); });
    c.addEventListener('blur', hideSoon);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { over = false; cancel(); tip.classList.remove('on'); }
  });
  window.addEventListener('scroll', function () { cancel(); tip.classList.remove('on'); }, true);
})();
