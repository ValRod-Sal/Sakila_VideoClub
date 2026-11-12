import { esc, discHTML, discBackHTML } from './disc.js';

const KEYFRAMES = [
  { d: -3, x: -62, y:  42, z: -240, scale: 0.44, rotZ: -14, rotX: 16, rotY:  22, opacity: 0 },
  { d: -2, x: -42, y:  30, z: -120, scale: 0.60, rotZ: -17, rotX: 14, rotY:  16, opacity: 1 },
  { d: -1, x: -22, y:  17, z:  -50, scale: 0.75, rotZ: -20, rotX: 11, rotY:  10, opacity: 1 },
  { d:  0, x:   2, y:   0, z:   40, scale: 1.00, rotZ: -21, rotX:  5, rotY:  -2, opacity: 1 },
  { d:  1, x:  31, y: -15, z:  110, scale: 1.15, rotZ: -23, rotX:  9, rotY: -14, opacity: 1 },
  { d:  2, x:  64, y: -31, z:  160, scale: 1.28, rotZ: -26, rotX: 12, rotY: -20, opacity: 0 }
];
const KEYS = ['x', 'y', 'z', 'scale', 'rotZ', 'rotX', 'rotY', 'opacity'];
const lerp = (a, b, t) => a + (b - a) * t;

function sampleCurve(offset) {
  const first = KEYFRAMES[0], last = KEYFRAMES[KEYFRAMES.length - 1];
  if (offset <= first.d) return first;
  if (offset >= last.d) return last;
  const i = KEYFRAMES.findIndex(k => offset < k.d) - 1;
  const k0 = KEYFRAMES[i], k1 = KEYFRAMES[i + 1];
  const t = (offset - k0.d) / (k1.d - k0.d);
  return Object.fromEntries(KEYS.map(k => [k, lerp(k0[k], k1[k], t)]));
}

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export class DiscStripGallery {
  constructor({ stageEl, trackEl, keyTarget, onActiveChange, onDiscOpen }) {
    this.stageEl = stageEl;
    this.trackEl = trackEl;
    this.keyTarget = keyTarget || stageEl;
    this.onActiveChange = onActiveChange;
    this.onDiscOpen = onDiscOpen;

    this.films = [];
    this.slotEls = [];
    this.currentPos = 0;
    this.targetPos = 0;
    this.activeIndex = -1;
    this.dirty = true;

    this.isDragging = false;
    this.dragMoved = false;
    this.tilt = { x: 0, y: 0 };
    this.snapTimer = null;
    this.visible = true;

    this._bindEvents();
    this._startLoop();
  }

  setFilms(films, initialIndex = 0) {
    this.films = Array.isArray(films) ? films : [];
    this.trackEl.innerHTML = '';
    this.slotEls = this.films.map((f, i) => {
      const el = this._createSlot(f, i);
      this.trackEl.appendChild(el);
      return el;
    });
    this.activeIndex = -1;
    if (!this.films.length) return;
    const i = Math.max(0, Math.min(initialIndex, this.films.length - 1));
    this.currentPos = this.targetPos = i;
    this.dirty = true;
    this._notifyActive(i);
  }

  goToIndex(index) {
    if (!this.films.length) return;
    this.targetPos = Math.max(0, Math.min(index, this.films.length - 1));
    if (reduceMotion()) this.currentPos = this.targetPos;
    this.dirty = true;
  }
  next() { this.goToIndex(Math.round(this.targetPos) + 1); }
  prev() { this.goToIndex(Math.round(this.targetPos) - 1); }

  toggleFlipActive() {
    this.slotEls[this.activeIndex]?.classList.toggle('is-flipped');
  }

  _createSlot(film, idx) {
    const slot = document.createElement('div');
    slot.className = 'cd-slot';
    slot.dataset.index = String(idx);
    const pathId = `rim-${idx}-${film.pelicula_id}`;
    const rimFront = `DIRIGIDA POR ${film.director} • ${String(film.reparto || '').replace(/,/g, ' •')} • ${film.anio} • CLUB SAKILA • `;
    const rimBack = `SK-${String(film.pelicula_id).padStart(4, '0')} • ${film.titulo} • ${film.duracion} MIN • ${film.categoria} • DISCO DE ALQUILER • `;
    const ring = (text, id) => {
      const t = text.toUpperCase().repeat(Math.ceil(170 / text.length)).slice(0, 170);
      return `
      <svg class="cd-rim" viewBox="0 0 500 500" aria-hidden="true">
        <defs><path id="${id}" d="M 250,250 m -229,0 a 229,229 0 1,1 458,0 a 229,229 0 1,1 -458,0" /></defs>
        <text><textPath href="#${id}" textLength="1420" lengthAdjust="spacingAndGlyphs">${esc(t)}</textPath></text>
      </svg>`;
    };
    slot.innerHTML = `
      <svg class="cd-sketch" viewBox="-35 -35 570 570" aria-hidden="true">
        <path d="M 18 228 C 22 104, 118 12, 245 8 C 332 5, 412 46, 456 112" />
        <path d="M 52 384 C 108 468, 218 504, 326 482 C 414 464, 476 398, 494 316" />
        <path class="cd-sketch__alt" d="M 38 358 C 96 456, 214 496, 338 472 C 402 459, 454 416, 480 356" />
      </svg>
      <div class="cd-flipper">
        <div class="cd-face cd-face--front">${discHTML(film)}${ring(rimFront, pathId)}</div>
        <div class="cd-face cd-face--back">${discBackHTML()}${ring(rimBack, pathId + '-b')}</div>
      </div>`;
    slot.addEventListener('click', e => {
      e.stopPropagation();
      if (this.dragMoved) return;
      if (idx === this.activeIndex) this.onDiscOpen?.(this.films[idx]);
      else this.goToIndex(idx);
    });
    return slot;
  }

  _bindEvents() {
    this.stageEl.addEventListener('wheel', e => {
      if (!this.films.length || e.ctrlKey) return;
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const atStart = this.targetPos <= 0 && raw < 0;
      const atEnd = this.targetPos >= this.films.length - 1 && raw > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      clearTimeout(this.snapTimer);
      const notch = e.deltaMode !== 0 || Math.abs(raw) >= 50;
      if (notch) {
        const now = performance.now();
        if (now - (this.lastNotch || 0) < 90) return;
        this.lastNotch = now;
        this.goToIndex(Math.round(this.targetPos) + Math.sign(raw));
        return;
      }
      this.targetPos = Math.max(-0.25, Math.min(this.films.length - 0.75, this.targetPos + raw * 0.012));
      this.dirty = true;
      this.snapTimer = setTimeout(() => this.goToIndex(Math.round(this.targetPos)), 140);
    }, { passive: false });

    let start = null;
    this.stageEl.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, pos: this.targetPos };
      this.isDragging = true;
      this.dragMoved = false;
      clearTimeout(this.snapTimer);
    });
    window.addEventListener('pointermove', e => {
      const r = this.stageEl.getBoundingClientRect();
      if (r.width && r.height && e.pointerType === 'mouse') {
        this.tilt = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 };
        this.dirty = true;
      }
      if (!this.isDragging || !this.films.length) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 6) { this.dragMoved = true; this.stageEl.classList.add('is-dragging'); }
      const projected = (-dx + dy * 0.42) / Math.max(240, window.innerWidth * 0.22);
      this.targetPos = Math.max(-0.3, Math.min(this.films.length - 0.7, start.pos + projected));
      this.dirty = true;
    });
    const endDrag = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.stageEl.classList.remove('is-dragging');
      this.goToIndex(Math.round(this.targetPos));
      setTimeout(() => { this.dragMoved = false; }, 40);
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    this.keyTarget.addEventListener('keydown', e => {
      if (e.target.closest('input, select, textarea')) return;
      if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('button, a')) return;
      const acts = {
        ArrowRight: () => this.next(), ArrowDown: () => this.next(),
        ArrowLeft: () => this.prev(), ArrowUp: () => this.prev(),
        Home: () => this.goToIndex(0), End: () => this.goToIndex(this.films.length - 1),
        ' ': () => this.toggleFlipActive(),
        Enter: () => this.activeIndex >= 0 && this.onDiscOpen?.(this.films[this.activeIndex])
      };
      if (acts[e.key]) { e.preventDefault(); acts[e.key](); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.dirty = true; })
        .observe(this.stageEl);
    }
  }

  _notifyActive(i) {
    if (i === this.activeIndex) return;
    this.slotEls[this.activeIndex]?.classList.remove('is-active', 'is-flipped');
    this.activeIndex = i;
    this.slotEls[i]?.classList.add('is-active');
    this.onActiveChange?.(this.films[i], i, this.films.length);
  }

  _startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);
      if (!this.visible || !this.films.length || !this.dirty) return;
      const diff = this.targetPos - this.currentPos;
      this.currentPos += diff * 0.11;
      if (Math.abs(diff) < 0.0008) this.currentPos = this.targetPos;
      const settled = this.currentPos === this.targetPos && !this.isDragging;

      this._notifyActive(Math.max(0, Math.min(this.films.length - 1, Math.round(this.currentPos))));
      const spin = diff * 48;
      for (let i = 0; i < this.slotEls.length; i++) {
        const slot = this.slotEls[i];
        const offset = i - this.currentPos;
        if (offset < -2.85 || offset > 1.85) { slot.style.visibility = 'hidden'; continue; }
        const pose = sampleCurve(offset);
        const center = Math.abs(offset) < 0.45;
        const tx = center ? -this.tilt.y * 6 : 0;
        const ty = center ? this.tilt.x * 8 : 0;
        slot.style.visibility = 'visible';
        slot.style.zIndex = String(Math.round(50 - Math.abs(offset) * 10 + (offset > 0 ? 5 : 0)));
        slot.style.opacity = String(Math.max(0, Math.min(1, pose.opacity)));
        slot.style.transform = `translate3d(${pose.x}vw, ${pose.y}vh, ${pose.z}px) scale(${pose.scale}) ` +
          `rotateX(${pose.rotX + tx}deg) rotateY(${pose.rotY + ty}deg) rotateZ(${pose.rotZ - offset * 28 + spin}deg)`;
      }
      if (settled) this.dirty = false;
    };
    requestAnimationFrame(tick);
  }
}
