(function () {
  if (window.__reaFogInit) { console.log('[fog] already initialized on', location.href); return; }
  window.__reaFogInit = true;
  console.log('[fog] content script loaded on', location.href);

  const SVG_ID = 'rea-fog-svg', GRADE_ID = 'rea-fog-grade', CHIP_ID = 'rea-fog-chip';
  const NS = 'http://www.w3.org/2000/svg';
  const KNOB = 14, HALO = 8, HIT = KNOB / 2 + HALO;
  const FACETS_LIGHT = 'rgba(255,255,255,.12)', FACETS_DARK = 'rgba(0,0,0,.10)';
  const OCTAGON = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';

  function buildFacets() {
    const n = Math.floor(Math.random() * 11) + 5, offset = Math.floor(Math.random() * 360), seg = 360 / n, stops = [];
    for (let i = 0; i < n; i++) {
      const col = (i % 2 === 0) ? FACETS_LIGHT : FACETS_DARK;
      stops.push(`${col} ${(i * seg).toFixed(2)}deg ${((i + 1) * seg).toFixed(2)}deg`);
    }
    return `conic-gradient(from ${offset}deg, ${stops.join(',')})`;
  }

  function removeChip() {
    for (const id of [CHIP_ID, SVG_ID]) { const el = document.getElementById(id); if (el) el.remove(); }
    if (document.body) document.body.style.removeProperty('filter');
    if (window.__reaFogCleanup) { window.__reaFogCleanup(); window.__reaFogCleanup = null; }
  }

  function buildChip() { try { _buildChip(); } catch (e) { console.error('[fog] buildChip failed:', e); } }

  function _buildChip() {
    console.log('[fog] buildChip: start');
    if (document.getElementById(CHIP_ID)) { console.log('[fog] buildChip: panel already present'); return; }
    if (!document.body) { console.log('[fog] buildChip: no body yet, waiting for DOMContentLoaded'); document.addEventListener('DOMContentLoaded', buildChip, { once: true }); return; }

    // --- the grade "recipe": an invisible SVG <filter> -----------------------
    // Each channel is one feFunc type="linear" (an affine map): exposure,
    // temperature and the coupled dim are all multiplies + a contrast pivot, so
    // they collapse into per-channel slope/intercept we rewrite live. The
    // feColorMatrix is the slot for saturation (mixes channels, so it can't
    // live in the per-channel transfer). Built with createElementNS — no
    // innerHTML parsing that could fail.
    const holder = document.createElement('div');
    holder.id = SVG_ID;
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    const svg = document.createElementNS(NS, 'svg');
    const filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', GRADE_ID);
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const sat = document.createElementNS(NS, 'feColorMatrix');
    sat.setAttribute('type', 'saturate'); sat.setAttribute('values', '1');
    const xfer = document.createElementNS(NS, 'feComponentTransfer');
    const mk = (tag) => {
      const f = document.createElementNS(NS, tag);
      f.setAttribute('type', 'linear'); f.setAttribute('slope', '1'); f.setAttribute('intercept', '0');
      return f;
    };
    const fnR = mk('feFuncR'), fnG = mk('feFuncG'), fnB = mk('feFuncB');
    xfer.append(fnR, fnG, fnB);
    filter.append(sat, xfer);
    svg.appendChild(filter);
    holder.appendChild(svg);

    // --- the panel (plain fixed element on <html>, like the original) --------
    const facetRing = buildFacets();
    const chip = document.createElement('div');
    chip.id = CHIP_ID;
    chip.innerHTML = `
      <style>
        #${CHIP_ID}{
          position:fixed; top:60px; right:60px; left:auto; bottom:auto;
          margin:0; padding:7px 11px; overflow:visible;
          height:28px; z-index:2147483647; opacity:.85;
          border:1px solid #5C3A0A; border-radius:7px;
          background:
            radial-gradient(120% 90% at 50% -20%, rgba(255,210,120,.10), transparent 60%),
            linear-gradient(180deg,#2A1A06,#150B02);
          box-shadow:0 3px 14px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,200,80,.12);
          display:flex; flex-direction:row; align-items:center; justify-content:center;
          gap:12px; box-sizing:border-box; cursor:grab;
        }
        #${CHIP_ID}::before{
          content:""; position:absolute; inset:3px; border-radius:5px;
          background:repeating-conic-gradient(from 0deg, rgba(255,200,90,.05) 0deg 6deg, transparent 6deg 12deg);
          pointer-events:none;
        }
        #${CHIP_ID} input[type=range]{
          -webkit-appearance:none; appearance:none;
          width:48px; height:5px; margin:0; border-radius:3px; outline:none; pointer-events:none;
        }
        #${CHIP_ID} input.ff-dim{  background:linear-gradient(90deg,#2c2f33,#C9CDD3,#2c2f33); }
        #${CHIP_ID} input.ff-exp{  background:linear-gradient(90deg,#0c0c0c,#888,#f4f4f4); }
        #${CHIP_ID} input.ff-temp{ background:linear-gradient(90deg,#3a6ea5,#9aa0a6,#C8952A); }
        #${CHIP_ID} input.ff-vol{  background:linear-gradient(90deg,#3a2406,#C8952A,#3a2406); }
        #${CHIP_ID} input[type=range]::-webkit-slider-thumb{
          -webkit-appearance:none; appearance:none;
          width:${KNOB}px; height:${KNOB}px; clip-path:${OCTAGON};
          box-shadow:0 1px 2px rgba(0,0,0,.7);
        }
        #${CHIP_ID} input.ff-dim::-webkit-slider-thumb,
        #${CHIP_ID} input.ff-exp::-webkit-slider-thumb{
          background:${facetRing}, radial-gradient(circle at 50% 38%, #F6F7F9, #B9BFC7 58%, #868C94);
        }
        #${CHIP_ID} input.ff-temp::-webkit-slider-thumb,
        #${CHIP_ID} input.ff-vol::-webkit-slider-thumb{
          background:${facetRing}, radial-gradient(circle at 50% 38%, #F4DC92, #C8952A 58%, #8A6418);
        }
      </style>
      <input type="range" class="ff-dim"  min="0" max="100" value="50"  step="1" title="Dim / brighten (dim raises contrast)">
      <input type="range" class="ff-exp"  min="0" max="100" value="50"  step="1" title="Exposure (±2 stops)">
      <input type="range" class="ff-temp" min="0" max="100" value="50"  step="1" title="Temperature (cool ↔ warm)">
      <input type="range" class="ff-vol"  min="0" max="100" value="100" step="1" title="Volume">
    `;

    const root = document.documentElement;
    root.appendChild(holder);
    root.appendChild(chip);
    console.log('[fog] buildChip: panel appended', chip.getBoundingClientRect());

    const dimSlider = chip.querySelector('.ff-dim');
    const expSlider = chip.querySelector('.ff-exp');
    const tempSlider = chip.querySelector('.ff-temp');
    const volSlider = chip.querySelector('.ff-vol');
    const val = s => parseInt(s.value, 10);

    // --- the grade: rewrite the per-channel affine maps, then point body at it
    function setFn(fn, slope, intercept) {
      fn.setAttribute('slope', slope.toFixed(4));
      fn.setAttribute('intercept', intercept.toFixed(4));
    }
    function applyGrade() {
      const expMul = Math.pow(2, (val(expSlider) - 50) / 25);   // ±2 stops
      const t = (val(dimSlider) - 50) / 50;                     // -1..1
      const bDim = 1 + 0.6 * t, cDim = 1 - 0.5 * t;             // brightness / contrast, coupled
      const k = (val(tempSlider) - 50) / 50 * 0.3;              // warm: R up, B down
      const inter = 0.5 * (1 - cDim);                           // contrast pivot at 0.5, shared
      setFn(fnR, expMul * bDim * (1 + k) * cDim, inter);
      setFn(fnG, expMul * bDim * cDim, inter);
      setFn(fnB, expMul * bDim * (1 - k) * cDim, inter);
      document.body.style.setProperty('filter', `url(#${GRADE_ID})`, 'important');
    }

    // --- volume (unchanged behaviour) ---------------------------------------
    let currentVol = 1, volTouched = false;
    function applyVolume() {
      if (!volTouched) return;
      document.querySelectorAll('video, audio').forEach(m => { try { m.volume = currentVol; } catch (e) {} });
    }
    function applyVolFromSlider() { currentVol = val(volSlider) / 100; volTouched = true; applyVolume(); }

    const mo = new MutationObserver(muts => {
      if (!volTouched) return;
      for (const mu of muts) for (const n of mu.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('video,audio')) { try { n.volume = currentVol; } catch (e) {} }
        if (n.querySelectorAll) n.querySelectorAll('video,audio').forEach(el => { try { el.volume = currentVol; } catch (e) {} });
      }
    });
    mo.observe(root, { childList: true, subtree: true });
    window.__reaFogCleanup = () => {
      mo.disconnect();
      if (volTouched) document.querySelectorAll('video,audio').forEach(m => { try { m.volume = 1; } catch (e) {} });
    };

    // --- knob + drag interaction --------------------------------------------
    function applyFor(s) { (s === volSlider) ? applyVolFromSlider() : applyGrade(); }
    function knobCenter(s) {
      const r = s.getBoundingClientRect(), v = val(s);
      return { x: r.left + (v / 100) * (r.width - KNOB) + KNOB / 2, y: r.top + r.height / 2 };
    }
    function valueFromX(s, clientX) {
      const r = s.getBoundingClientRect(), span = r.width - KNOB;
      const v = span > 0 ? ((clientX - r.left - KNOB / 2) / span) * 100 : 0;
      return Math.max(0, Math.min(100, Math.round(v)));
    }
    function nearKnob(x, y) {
      for (const s of [dimSlider, expSlider, tempSlider, volSlider]) {
        const c = knobCenter(s); if (Math.hypot(x - c.x, y - c.y) <= HIT) return s;
      }
      return null;
    }
    function clampToViewport(left, top) {
      const w = chip.offsetWidth, h = chip.offsetHeight;
      chip.style.right = 'auto'; chip.style.bottom = 'auto';
      chip.style.left = Math.max(0, Math.min(left, window.innerWidth - w)) + 'px';
      chip.style.top = Math.max(0, Math.min(top, window.innerHeight - h)) + 'px';
    }

    let moveDrag = false, knobDrag = null, ox = 0, oy = 0;
    chip.addEventListener('mousedown', e => {
      const s = nearKnob(e.clientX, e.clientY);
      if (s) {
        knobDrag = s; chip.style.cursor = 'ew-resize';
        s.value = valueFromX(s, e.clientX); applyFor(s);
      } else {
        moveDrag = true;
        const r = chip.getBoundingClientRect();
        ox = e.clientX - r.left; oy = e.clientY - r.top;
        chip.style.cursor = 'grabbing';
      }
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (knobDrag) { knobDrag.value = valueFromX(knobDrag, e.clientX); applyFor(knobDrag); return; }
      if (moveDrag) { clampToViewport(e.clientX - ox, e.clientY - oy); return; }
      const r = chip.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        chip.style.cursor = nearKnob(e.clientX, e.clientY) ? 'ew-resize' : 'grab';
      }
    });
    document.addEventListener('mouseup', () => { knobDrag = null; moveDrag = false; chip.style.cursor = 'grab'; });
    window.addEventListener('resize', () => { const r = chip.getBoundingClientRect(); clampToViewport(r.left, r.top); });

    applyGrade();   // neutral identity; nothing visible until a knob moves
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    console.log('[fog] message:', msg.type);
    if (msg.type === 'fog-on') buildChip();
    else if (msg.type === 'fog-off') removeChip();
  });

  try {
    chrome.storage.local.get('enabled', (o) => {
      console.log('[fog] storage enabled =', o && o.enabled);
      if (o && o.enabled) buildChip();
    });
  } catch (e) { console.error('[fog] storage read failed:', e); }
})();
