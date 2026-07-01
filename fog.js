(function () {
  if (window.__reaFogInit) { console.log('[fog] already initialized on', location.href); return; }
  window.__reaFogInit = true;
  console.log('[fog] content script loaded on', location.href);

  const SVG_ID = 'rea-fog-svg', GRADE_ID = 'rea-fog-grade', CHIP_ID = 'rea-fog-chip';
  const NS = 'http://www.w3.org/2000/svg';
  const PAD = 168, DISC = 30, DR = DISC / 2;          // pad size, disc size, disc radius (px)
  const FACETS_LIGHT = 'rgba(255,255,255,.12)', FACETS_DARK = 'rgba(0,0,0,.10)';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function buildFacets() {
    const n = Math.floor(Math.random() * 11) + 5, offset = Math.floor(Math.random() * 360), seg = 360 / n, stops = [];
    for (let i = 0; i < n; i++) {
      const col = (i % 2 === 0) ? FACETS_LIGHT : FACETS_DARK;
      stops.push(`${col} ${(i * seg).toFixed(2)}deg ${((i + 1) * seg).toFixed(2)}deg`);
    }
    return `conic-gradient(from ${offset}deg, ${stops.join(',')})`;
  }

  // Polar grid backdrop (concentric rings + spokes + emphasized axes), as a
  // crisp data-URI SVG so it scales with the pad.
  function gridBackground() {
    const c = 50, rings = [16, 32, 48];
    let p = '';
    rings.forEach(r => { p += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,205,120,0.13)" stroke-width="0.6"/>`; });
    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180, x2 = (c + 48 * Math.cos(rad)).toFixed(2), y2 = (c + 48 * Math.sin(rad)).toFixed(2);
      p += `<line x1="${c}" y1="${c}" x2="${x2}" y2="${y2}" stroke="rgba(255,205,120,0.09)" stroke-width="0.5"/>`;
    }
    p += `<line x1="2" y1="${c}" x2="98" y2="${c}" stroke="rgba(255,215,140,0.22)" stroke-width="0.7"/>`;
    p += `<line x1="${c}" y1="2" x2="${c}" y2="98" stroke="rgba(255,215,140,0.22)" stroke-width="0.7"/>`;
    p += `<circle cx="${c}" cy="${c}" r="1.5" fill="rgba(255,225,160,0.55)"/>`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>${p}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function removeChip() {
    for (const id of [CHIP_ID, SVG_ID]) { const el = document.getElementById(id); if (el) el.remove(); }
    if (document.body) document.body.style.removeProperty('filter');
    if (window.__reaFogCleanup) { window.__reaFogCleanup(); window.__reaFogCleanup = null; }
  }

  function buildChip() { try { _buildChip(); } catch (e) { console.error('[fog] buildChip failed:', e); } }

  function _buildChip() {
    if (document.getElementById(CHIP_ID)) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', buildChip, { once: true }); return; }

    // --- SVG grade recipe: feColorMatrix (saturation) + per-channel affine ---
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
    const satNode = document.createElementNS(NS, 'feColorMatrix');
    satNode.setAttribute('type', 'saturate'); satNode.setAttribute('values', '1');
    const xfer = document.createElementNS(NS, 'feComponentTransfer');
    const mk = (tag) => {
      const f = document.createElementNS(NS, tag);
      f.setAttribute('type', 'linear'); f.setAttribute('slope', '1'); f.setAttribute('intercept', '0');
      return f;
    };
    const fnR = mk('feFuncR'), fnG = mk('feFuncG'), fnB = mk('feFuncB');
    xfer.append(fnR, fnG, fnB);
    filter.append(satNode, xfer);           // saturate first, then tone/temp
    svg.appendChild(filter);
    holder.appendChild(svg);

    // --- panel: square pad + polar grid + two gem discs ---------------------
    const facetRing = buildFacets();
    const gridBg = gridBackground();
    const silverBg = `${facetRing}, radial-gradient(circle at 42% 35%, #FCFDFE, #C9CFD6 55%, #7E858E)`;
    const goldBg = `${facetRing}, radial-gradient(circle at 42% 35%, #FBEEB0, #C8952A 55%, #7A560F)`;

    const chip = document.createElement('div');
    chip.id = CHIP_ID;
    chip.innerHTML = `
      <style>
        #${CHIP_ID}{
          position:fixed; top:60px; right:60px; left:auto; bottom:auto;
          margin:0; padding:10px; box-sizing:border-box; z-index:2147483647;
          border:1px solid #5C3A0A; border-radius:14px; opacity:.96;
          background:
            radial-gradient(120% 90% at 50% -10%, rgba(255,210,120,.10), transparent 60%),
            linear-gradient(180deg,#2A1A06,#150B02);
          box-shadow:0 6px 20px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,200,80,.14);
          cursor:grab; user-select:none; -webkit-user-select:none; touch-action:none;
        }
        #${CHIP_ID} .pad{
          position:relative; width:${PAD}px; height:${PAD}px; border-radius:10px;
          background-color:#120A02; background-image:${gridBg};
          background-size:100% 100%;
          box-shadow:inset 0 0 0 1px rgba(255,200,90,.12), inset 0 2px 12px rgba(0,0,0,.6);
          overflow:hidden;
        }
        #${CHIP_ID} .ff-disc{
          position:absolute; width:${DISC}px; height:${DISC}px; border-radius:50%;
          transform:translate(-50%,-50%); cursor:grab;
          box-shadow:0 3px 6px rgba(0,0,0,.6), inset 0 1px 2px rgba(255,255,255,.45), inset 0 -3px 4px rgba(0,0,0,.45);
        }
        #${CHIP_ID} .ff-silver{ background:${silverBg}; }
        #${CHIP_ID} .ff-gold{   background:${goldBg}; }
        #${CHIP_ID} .cap{
          display:flex; gap:12px; justify-content:center; margin-top:8px;
          font:600 9px/1.2 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;
          color:rgba(255,212,146,.78); letter-spacing:.2px;
        }
        #${CHIP_ID} .cap i{ display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:4px; vertical-align:middle; }
        #${CHIP_ID} .cap i.s{ background:#C9CFD6; } #${CHIP_ID} .cap i.g{ background:#C8952A; }
      </style>
      <div class="pad">
        <div class="ff-disc ff-silver" data-k="silver" title="Silver — X: brightness · Y: contrast"></div>
        <div class="ff-disc ff-gold"   data-k="gold"   title="Gold — X: temperature · Y: saturation"></div>
      </div>
      <div class="cap"><span><i class="s"></i>bright · contrast</span><span><i class="g"></i>warm · saturation</span></div>
    `;

    const root = document.documentElement;
    root.appendChild(holder);
    root.appendChild(chip);
    console.log('[fog] pad panel appended');

    const pad = chip.querySelector('.pad');
    const discEls = { silver: chip.querySelector('.ff-silver'), gold: chip.querySelector('.ff-gold') };
    // disc centre in pad pixels; centre of pad = neutral
    const state = { silver: { cx: PAD / 2, cy: PAD / 2 }, gold: { cx: PAD / 2, cy: PAD / 2 } };

    function renderDisc(k) { discEls[k].style.left = state[k].cx + 'px'; discEls[k].style.top = state[k].cy + 'px'; }
    // pad pixel -> normalized axis in [-1,1]; y flipped so up = +1
    function norm(px) { const usable = PAD - 2 * DR; return { nx: ((state[px].cx - DR) / usable) * 2 - 1, ny: -(((state[px].cy - DR) / usable) * 2 - 1) }; }

    function setFn(fn, slope, intercept) {
      fn.setAttribute('slope', slope.toFixed(4));
      fn.setAttribute('intercept', intercept.toFixed(4));
    }
    function applyGrade() {
      const s = norm('silver'), g = norm('gold');
      const b = Math.pow(2, s.nx);            // brightness: ±1 stop (0.5..2)
      const c = 1 + s.ny * 0.6;               // contrast: 0.4..1.6
      const k = g.nx * 0.3;                   // temperature: warm(+) / cool(-)
      const sat = Math.max(0, 1 + g.ny);      // saturation: 0..2
      const inter = 0.5 * (1 - c);            // contrast pivot at 0.5
      setFn(fnR, b * (1 + k) * c, inter);
      setFn(fnG, b * 1 * c, inter);
      setFn(fnB, b * (1 - k) * c, inter);
      satNode.setAttribute('values', sat.toFixed(3));
      document.body.style.setProperty('filter', `url(#${GRADE_ID})`, 'important');
    }

    renderDisc('silver'); renderDisc('gold');
    applyGrade();   // neutral identity — nothing visible until a disc moves

    // --- drag: a disc moves in the plane; empty pad / frame moves the panel --
    const padPoint = e => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    let drag = null;
    chip.addEventListener('pointerdown', e => {
      const discEl = e.target.closest('.ff-disc');
      if (discEl) {
        const k = discEl.dataset.k, p = padPoint(e);
        drag = { type: 'disc', k, offx: p.x - state[k].cx, offy: p.y - state[k].cy };
        discEl.style.cursor = 'grabbing';
      } else {
        const r = chip.getBoundingClientRect();
        drag = { type: 'move', ox: e.clientX - r.left, oy: e.clientY - r.top };
        chip.style.cursor = 'grabbing';
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
      e.preventDefault();
    });
    function onMove(e) {
      if (!drag) return;
      if (drag.type === 'disc') {
        const p = padPoint(e), st = state[drag.k];
        st.cx = clamp(p.x - drag.offx, DR, PAD - DR);
        st.cy = clamp(p.y - drag.offy, DR, PAD - DR);
        renderDisc(drag.k); applyGrade();
      } else {
        chip.style.right = 'auto'; chip.style.bottom = 'auto';
        chip.style.left = clamp(e.clientX - drag.ox, 0, window.innerWidth - chip.offsetWidth) + 'px';
        chip.style.top = clamp(e.clientY - drag.oy, 0, window.innerHeight - chip.offsetHeight) + 'px';
      }
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      drag = null; chip.style.cursor = 'grab';
      discEls.silver.style.cursor = discEls.gold.style.cursor = 'grab';
    }

    // double-click a disc to snap it back to neutral (centre)
    chip.addEventListener('dblclick', e => {
      const discEl = e.target.closest('.ff-disc');
      if (!discEl) return;
      const k = discEl.dataset.k;
      state[k].cx = PAD / 2; state[k].cy = PAD / 2;
      renderDisc(k); applyGrade(); e.preventDefault();
    });

    window.__reaFogCleanup = () => {
      window.removeEventListener('pointermove', onMove);
    };
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'fog-on') buildChip();
    else if (msg.type === 'fog-off') removeChip();
  });

  try {
    chrome.storage.local.get('enabled', (o) => { if (o && o.enabled) buildChip(); });
  } catch (e) { console.error('[fog] storage read failed:', e); }
})();
