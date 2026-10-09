/* Jelgava Coworking — UI enhancements
   burger menu · header shrink · reveal on scroll · swipe carousels · mobile accordions
   No dependencies. Respects prefers-reduced-motion. */
(function () {
  'use strict';
  var d = document;
  var mm = function (q) { return window.matchMedia(q); };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;
  var header = d.querySelector('header');

  /* ── 1. Header shrinks on scroll ── */
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 2. Burger menu (≤900px) — clones the desktop nav, language chips and CTA ── */
  var burger = d.querySelector('.burger');
  var mnav = d.getElementById('mnav');
  if (header && burger && mnav) {
    var inner = mnav.querySelector('.mnav-inner') || mnav;
    var links = d.createElement('div');
    links.className = 'mnav-links';
    d.querySelectorAll('header nav a').forEach(function (a) { links.appendChild(a.cloneNode(true)); });
    var bottom = d.createElement('div');
    bottom.className = 'mnav-bottom';
    var lang = d.querySelector('header .actions .lang');
    var cta = d.querySelector('header .actions .btn-primary');
    if (lang) bottom.appendChild(lang.cloneNode(true));
    if (cta) bottom.appendChild(cta.cloneNode(true));
    inner.appendChild(links);
    inner.appendChild(bottom);

    var setOpen = function (open) {
      mnav.classList.toggle('open', open);
      header.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', function () { setOpen(!mnav.classList.contains('open')); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('click', function (e) {
      if (mnav.classList.contains('open') && !header.contains(e.target)) setOpen(false);
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    mm('(max-width: 900px)').addEventListener('change', function (e) { if (!e.matches) setOpen(false); });
  }

  /* ── 3. Swipe carousels with dots (pure CSS scroll-snap, JS only for dots) ── */
  function carousel(scroller, query, dotsClass, onChange) {
    var items = Array.prototype.slice.call(scroller.children);
    if (items.length < 2) return null;
    var q = mm(query);
    var dots = d.createElement('div');
    dots.className = 'dots ' + dotsClass;
    var center = function (el) { return el.offsetLeft + el.offsetWidth / 2; };
    var goTo = function (el, smooth) {
      scroller.scrollTo({
        left: center(el) - scroller.clientWidth / 2,
        behavior: smooth && !reduce ? 'smooth' : 'auto'
      });
    };
    items.forEach(function (it, i) {
      var b = d.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (i + 1) + ' / ' + items.length);
      b.addEventListener('click', function () { goTo(it, true); });
      dots.appendChild(b);
    });
    scroller.insertAdjacentElement('afterend', dots);

    var current = -1;
    var update = function () {
      if (!q.matches) return;
      var mid = scroller.scrollLeft + scroller.clientWidth / 2, best = 0, bd = Infinity;
      items.forEach(function (it, i) {
        var dd = Math.abs(center(it) - mid);
        if (dd < bd) { bd = dd; best = i; }
      });
      if (best === current) return;
      current = best;
      Array.prototype.forEach.call(dots.children, function (b, i) { b.classList.toggle('on', i === best); });
      if (onChange) onChange(items[best]);
    };
    var raf = 0;
    scroller.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
    q.addEventListener('change', function () { current = -1; update(); });
    return { items: items, q: q, goTo: goTo, update: update };
  }

  var gallery = d.querySelector('.gallery');
  var galleryC = gallery ? carousel(gallery, '(max-width: 900px)', 'gallery-dots') : null;
  if (galleryC) galleryC.update();

  var cardsEl = d.querySelector('#paketes .cards');
  var cardsC = cardsEl ? carousel(cardsEl, '(max-width: 650px)', 'cards-dots', function (card) {
    cardsEl.querySelectorAll('.card').forEach(function (c) { c.classList.toggle('is-active', c === card); });
  }) : null;
  if (cardsC) {
    var featured = cardsEl.querySelector('.card.featured');
    if (featured && cardsC.q.matches) cardsC.goTo(featured, false); // start on Studio
    cardsC.update();
  }

  /* ── 4. "Who it's for" cards: tap to expand on phones (≤580px) ── */
  var kq = mm('(max-width: 580px)');
  var kams = d.querySelectorAll('.kam-card');
  var kamSetup = function () {
    kams.forEach(function (c) {
      if (kq.matches) {
        c.setAttribute('role', 'button');
        c.setAttribute('tabindex', '0');
        c.setAttribute('aria-expanded', c.classList.contains('open') ? 'true' : 'false');
      } else {
        c.removeAttribute('role');
        c.removeAttribute('tabindex');
        c.removeAttribute('aria-expanded');
        c.classList.remove('open');
      }
    });
  };
  var kamToggle = function (c) {
    var o = c.classList.toggle('open');
    c.setAttribute('aria-expanded', o ? 'true' : 'false');
  };
  kams.forEach(function (c) {
    c.addEventListener('click', function () { if (kq.matches) kamToggle(c); });
    c.addEventListener('keydown', function (e) {
      if (kq.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kamToggle(c); }
    });
  });
  kamSetup();
  kq.addEventListener('change', kamSetup);

  /* ── 5. FAQ: on phones show 5 questions + "show all" ── */
  var faqList = d.querySelector('.faq-list');
  var faqMore = d.querySelector('.faq-more');
  if (faqList && faqMore) {
    faqList.classList.add('collapsed');
    faqMore.addEventListener('click', function () {
      faqList.classList.remove('collapsed');
      faqMore.remove();
    });
  }

  /* ── 6. Reveal on scroll ── */
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = [];
    var add = function (el) { if (el && targets.indexOf(el) < 0) targets.push(el); };

    // in carousel mode reveal the whole strip, not each (off-screen) slide
    if (galleryC && galleryC.q.matches) add(gallery);
    else d.querySelectorAll('.gallery .photo').forEach(add);
    if (cardsC && cardsC.q.matches) add(cardsEl);
    else d.querySelectorAll('#paketes .cards .card').forEach(add);

    d.querySelectorAll('.kam-card, .panel, .faq-item').forEach(add);
    d.querySelectorAll('section:not(.hero) h2, section:not(.hero) .sub').forEach(function (el) {
      if (!el.closest('.panel, .card, .kam-card')) add(el);
    });

    targets.forEach(function (el) { el.classList.add('rv'); });

    var io = new IntersectionObserver(function (entries) {
      var batch = new Map(); // stagger siblings that appear together
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, p = el.parentElement, i = batch.get(p) || 0;
        batch.set(p, i + 1);
        io.unobserve(el);
        var delay = Math.min(i, 5) * 70;
        el.style.setProperty('--rv-d', delay + 'ms');
        el.classList.add('in');
        // hand control back to the element's own hover/active transitions
        setTimeout(function () {
          el.classList.remove('rv', 'in');
          el.style.removeProperty('--rv-d');
        }, 800 + delay);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    targets.forEach(function (el) { io.observe(el); });
  }
})();
