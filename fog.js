(function () {
  if (window.__reaFogInit) return;
  window.__reaFogInit = true;

  // --- ids -----------------------------------------------------------------
  const SVG_ID = 'rea-fog-svg', GRADE_ID = 'rea-fog-grade';
  const COVER_ID = 'rea-fog-cover', CHIP_ID = 'rea-fog-chip';

  // --- panel look ----------------------------------------------------------
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

  // Can this engine put elements in the top layer? (Chrome 114+, Edge, Brave.)
  const TOP_LAYER = typeof document.createElement('div').showPopover === 'function';

  function removeChip() {
    for (const id of [CHIP_ID, COVER_ID, SVG_ID]) {
      const el = document.getElementById(id);
      if (el) { try { el.hidePopover && el.matches(':popover-open') && el.hidePopover(); } catch (e) {} el.remove(); }
    }
    if (document.body) document.body.style.removeProperty('filter');
    if (window.__reaFogCleanup) { window.__reaFogCleanup(); window.__reaFogCleanup = null; }
  }

  function buildChip() {
    if (document.getElementById(CHIP_ID)) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', buildChip, { once: true }); return; }

    const root = document.documentElement;
    const facetRing = buildFacets();

    // 1) The grade "recipe": an invisible SVG <filter>. Every visual parameter
    //    is a per-channel affine map (multiply for exposure/temperature/dim,
    //    then a contrast pivot), so each channel is one feFunc type="linear".
    //    Nonlinear params (highlights/shadows, gamma) would swap these for
    //    type="table"/"gamma" later. feColorMatrix is the slot for saturation
    //    (it mixes channels, so it can't live in the per-channel transfer).
    const NS = 'http://www.w3.org/2000/svg';
    const holder = document.createElement('div');
    holder.id = SVG_ID;
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    const svg = document.createElementNS(NS, 'svg');
    const filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', GRADE_ID);
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    const sat = document.createElementNS(NS, 'feColorMatrix');     // saturation slot (identity for now)
    sat.setAttribute('type', 'saturate'); sat.setAttribute('values', '1');
    const xfer = document.createElementNS(NS, 'feComponentTransfer');
    const fnR = (function (t) { const f = document.createElementNS(NS, t); f.setAttribute('type', 'linear'); f.setAttribute('slope', '1'); f.setAttribute('intercept', '0'); return f; })('feFuncR');
    const fnG = (function (t) { const f = document.createElementNS(NS, t); f.setAttribute('type', 'linear'); f.setAttribute('slope', '1'); f.setAttribute('intercept', '0'); return f; })('feFuncG');
    const fnB = (function (t) { const f = document.createElementNS(NS, t); f.setAttribute('type', 'linear'); f.setAttribute('slope', '1'); f.setAttribute('intercept', '0'); return f; })('feFuncB');
    xfer.append(fnR, fnG, fnB);
    filter.append(sat, xfer);
    svg.appendChild(filter);
    holder.appendChild(svg);

    // 2) The cover: a transparent, click-through layer that carries the recipe
    //    via backdrop-filter, so the grade lands on everything painted behind
    //    it. Promoted into the top layer (popover) so it also sits over
    //    fullscreen video / modal dialogs that a body filter can't reach.
    const cover = document.createElement('div');
    cover.id = COVER_ID;
    if (TOP_LAYER) cover.setAttribute('popover', 'manual');

    // 3) The control panel. Also top-layer, shown *after* the cover so it
    //    paints above it (and is therefore not graded by it, and stays
    //    clickable).
    const chip = document.createElement('div');
    chip.id = CHIP_ID;
    if (TOP_LAYER) chip.setAttribute('popover', 'manual');
    chip.innerHTML = `
      <style>
        #${COVER_ID}{
          position:fixed; inset:0; margin:0; padding:0; border:0;
          width:100%; height:100%; max-width:none; max-height:none;
          background:transparent; overflow:hidden; pointer-events:none;
          ${TOP_LAYER ? '' : 'z-index:2147483646;'}
          backdrop-filter:url(#${GRADE_ID}); -webkit-backdrop-filter:url(#${GRADE_ID});
        }
        #${COVER_ID}::backdrop{ background:transparent; }
        #${CHIP_ID}{
          position:fixed; inset:auto; top:60px; right:60px; left:auto; bottom:auto;
          margin:0; padding:7px 11px; overflow:visible;
          height:28px; ${TOP_LAYER ? '' : 'z-index:2147483647;'} opacity:.85;
          border:1px solid #5C3A0A; border-radius:7px;
          background:
            radial-gradient(120% 90% at 50% -20%, rgba(255,210,120,.10), transparent 60%),
            linear-gradient(180deg,#2A1A06,#150B02);
          box-shadow:0 3px 14px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,200,80,.12);
          display:flex; flex-direction:row; align-items:center; justify-content:center;
          gap:12px; box-sizing:border-box; cursor:grab; pointer-events:auto;
        }
        #${CHIP_ID}::backdrop{ background:transparent; }
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

    root.appendChild(holder);
    root.appendChild(cover);
    root.appendChild(chip);
    showTopLayer();

    const dimSlider = chip.querySelector('.ff-dim');
    const expSlider = chip.querySelector('.ff-exp');
    const tempSlider = chip.querySelector('.ff-temp');
    const volSlider = chip.querySelector('.ff-vol');
    const gradeSliders = [dimSlider, expSlider, tempSlider];

    // --- the grade: rewrite the per-channel affine maps live ---------------
    const val = s => parseInt(s.value, 10);
    function setFn(fn, slope, intercept) {
      fn.setAttribute('slope', slope.toFixed(4));
      fn.setAttribute('intercept', intercept.toFixed(4));
    }
    function applyGrade() {
      const expMul = Math.pow(2, (val(expSlider) - 50) / 25);      // ±2 stops
      const t = (val(dimSlider) - 50) / 50;                        // -1..1
      const bDim = 1 + 0.6 * t, cDim = 1 - 0.5 * t;                // brightness, contrast (coupled)
      const k = (val(tempSlider) - 50) / 50 * 0.3;                 // warm: R up, B down
      const inter = 0.5 * (1 - cDim);                              // contrast pivot at 0.5, shared
      setFn(fnR, expMul * bDim * (1 + k) * cDim, inter);
      setFn(fnG, expMul * bDim * 1 * cDim, inter);
      setFn(fnB, expMul * bDim * (1 - k) * cDim, inter);
    }

    // --- volume (unchanged behaviour) --------------------------------------
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

    // Fullscreen / modal content jumps to the top of the top layer when it
    // opens, landing above our cover. Re-assert (hide+show, in order) so the
    // cover — and then the panel — climb back on top. This is the part that
    // genuinely needs per-site testing.
    function onFsChange() { showTopLayer(); }
    document.addEventListener('fullscreenchange', onFsChange, true);
    document.addEventListener('webkitfullscreenchange', onFsChange, true);

    window.__reaFogCleanup = () => {
      mo.disconnect();
      document.removeEventListener('fullscreenchange', onFsChange, true);
      document.removeEventListener('webkitfullscreenchange', onFsChange, true);
      if (volTouched) document.querySelectorAll('video,audio').forEach(m => { try { m.volume = 1; } catch (e) {} });
    };

    function showTopLayer() {
      if (!TOP_LAYER) return;
      for (const el of [chip, cover]) { try { if (el.matches(':popover-open')) el.hidePopover(); } catch (e) {} }
      for (const el of [cover, chip]) { try { el.showPopover(); } catch (e) {} }  // cover first, panel on top
    }

    // --- knob + drag interaction -------------------------------------------
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
    function applyFor(s) { (s === volSlider) ? applyVolFromSlider() : applyGrade(); }
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
    if (msg.type === 'fog-on') buildChip();
    else if (msg.type === 'fog-off') removeChip();
  });

  try {
    chrome.storage.local.get('enabled', (o) => { if (o && o.enabled) buildChip(); });
  } catch (e) {}
})();
