(function () {
  if (window.__reaFogInit) return;
  window.__reaFogInit = true;

  const CHIP_ID = 'rea-fog-chip';
  const B_SPAN = 0.6, C_SPAN = 0.5, KNOB = 14, HALO = 8, HIT = KNOB / 2 + HALO;
  const FACETS_LIGHT = 'rgba(255,255,255,.12)', FACETS_DARK = 'rgba(0,0,0,.10)';
  const OCTAGON = 'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)';

  function setFilter(b, c) { document.body.style.setProperty('filter', `brightness(${b}) contrast(${c})`, 'important'); }
  function buildFacets() {
    const n = Math.floor(Math.random() * 11) + 5, offset = Math.floor(Math.random() * 360), seg = 360 / n, stops = [];
    for (let i = 0; i < n; i++) {
      const col = (i % 2 === 0) ? FACETS_LIGHT : FACETS_DARK;
      stops.push(`${col} ${(i * seg).toFixed(2)}deg ${((i + 1) * seg).toFixed(2)}deg`);
    }
    return `conic-gradient(from ${offset}deg, ${stops.join(',')})`;
  }

  function removeChip() {
    const el = document.getElementById(CHIP_ID);
    if (el) el.remove();
    if (document.body) document.body.style.removeProperty('filter');
    if (window.__reaFogCleanup) { window.__reaFogCleanup(); window.__reaFogCleanup = null; }
  }

  function buildChip() {
    if (document.getElementById(CHIP_ID)) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', buildChip, { once: true }); return; }

    const facetRing = buildFacets();
    const chip = document.createElement('div');
    chip.id = CHIP_ID;
    chip.innerHTML = `
      <style>
        #${CHIP_ID}{
          position:fixed; top:60px; right:60px; left:auto; bottom:auto;
          margin:0; padding:7px 11px; overflow:visible;
          width:152px; height:28px; z-index:2147483647; opacity:.8;
          border:1px solid #5C3A0A; border-radius:7px;
          background:
            radial-gradient(120% 90% at 50% -20%, rgba(255,210,120,.10), transparent 60%),
            linear-gradient(180deg,#2A1A06,#150B02);
          box-shadow:0 3px 14px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,200,80,.12);
          display:flex; flex-direction:row; align-items:center; justify-content:center;
          gap:14px; box-sizing:border-box; cursor:grab;
        }
        #${CHIP_ID}::before{
          content:""; position:absolute; inset:3px; border-radius:5px;
          background:repeating-conic-gradient(from 0deg, rgba(255,200,90,.05) 0deg 6deg, transparent 6deg 12deg);
          pointer-events:none;
        }
        #${CHIP_ID} input[type=range]{
          -webkit-appearance:none; appearance:none;
          width:58px; height:5px; margin:0; border-radius:3px; outline:none; pointer-events:none;
        }
        #${CHIP_ID} input.ff-bright{ background:linear-gradient(90deg,#2c2f33,#C9CDD3,#2c2f33); }
        #${CHIP_ID} input.ff-vol{    background:linear-gradient(90deg,#3a2406,#C8952A,#3a2406); }
        #${CHIP_ID} input[type=range]::-webkit-slider-thumb{
          -webkit-appearance:none; appearance:none;
          width:${KNOB}px; height:${KNOB}px; clip-path:${OCTAGON};
          box-shadow:0 1px 2px rgba(0,0,0,.7);
        }
        #${CHIP_ID} input.ff-bright::-webkit-slider-thumb{
          background:${facetRing}, radial-gradient(circle at 50% 38%, #F6F7F9, #B9BFC7 58%, #868C94);
        }
        #${CHIP_ID} input.ff-vol::-webkit-slider-thumb{
          background:${facetRing}, radial-gradient(circle at 50% 38%, #F4DC92, #C8952A 58%, #8A6418);
        }
      </style>
      <input type="range" class="ff-bright" min="0" max="100" value="50" step="1" title="Brightness">
      <input type="range" class="ff-vol" min="0" max="100" value="100" step="1" title="Volume">
    `;
    document.documentElement.appendChild(chip);

    const brightSlider = chip.querySelector('.ff-bright');
    const volSlider = chip.querySelector('.ff-vol');

    function applyBright() {
      const t = (parseInt(brightSlider.value, 10) - 50) / 50;
      setFilter((1 + B_SPAN * t).toFixed(3), (1 - C_SPAN * t).toFixed(3));
    }

    let currentVol = 1, volTouched = false;
    function applyVolume() {
      if (!volTouched) return;
      document.querySelectorAll('video, audio').forEach(m => { try { m.volume = currentVol; } catch (e) {} });
    }
    function applyVolFromSlider() { currentVol = parseInt(volSlider.value, 10) / 100; volTouched = true; applyVolume(); }

    const mo = new MutationObserver(muts => {
      if (!volTouched) return;
      for (const mu of muts) for (const n of mu.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('video,audio')) { try { n.volume = currentVol; } catch (e) {} }
        if (n.querySelectorAll) n.querySelectorAll('video,audio').forEach(el => { try { el.volume = currentVol; } catch (e) {} });
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    window.__reaFogCleanup = () => {
      mo.disconnect();
      if (volTouched) document.querySelectorAll('video,audio').forEach(m => { try { m.volume = 1; } catch (e) {} });
    };

    function knobCenter(s) {
      const r = s.getBoundingClientRect(), v = parseInt(s.value, 10);
      return { x: r.left + (v / 100) * (r.width - KNOB) + KNOB / 2, y: r.top + r.height / 2 };
    }
    function valueFromX(s, clientX) {
      const r = s.getBoundingClientRect(), span = r.width - KNOB;
      const v = span > 0 ? ((clientX - r.left - KNOB / 2) / span) * 100 : 0;
      return Math.max(0, Math.min(100, Math.round(v)));
    }
    function nearKnob(x, y) {
      for (const s of [brightSlider, volSlider]) { const c = knobCenter(s); if (Math.hypot(x - c.x, y - c.y) <= HIT) return s; }
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
        s.value = valueFromX(s, e.clientX);
        (s === brightSlider) ? applyBright() : applyVolFromSlider();
      } else {
        moveDrag = true;
        const r = chip.getBoundingClientRect();
        ox = e.clientX - r.left; oy = e.clientY - r.top;
        chip.style.cursor = 'grabbing';
      }
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (knobDrag) { knobDrag.value = valueFromX(knobDrag, e.clientX); (knobDrag === brightSlider) ? applyBright() : applyVolFromSlider(); return; }
      if (moveDrag) { clampToViewport(e.clientX - ox, e.clientY - oy); return; }
      const r = chip.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        chip.style.cursor = nearKnob(e.clientX, e.clientY) ? 'ew-resize' : 'grab';
      }
    });
    document.addEventListener('mouseup', () => { knobDrag = null; moveDrag = false; chip.style.cursor = 'grab'; });
    window.addEventListener('resize', () => { const r = chip.getBoundingClientRect(); clampToViewport(r.left, r.top); });

    applyBright();   // establish neutral; no visible change until you move a knob
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'fog-on') buildChip();
    else if (msg.type === 'fog-off') removeChip();
  });

  // On every page load, show the panel if Fog is switched on.
  try {
    chrome.storage.local.get('enabled', (o) => { if (o && o.enabled) buildChip(); });
  } catch (e) {}
})();
