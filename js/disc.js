export const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const bs = n => 'Bs ' + Number(n || 0).toFixed(2);
export const colorVars = p => `--c1:${safeColor(p.color1, '#2c2f36')};--c2:${safeColor(p.color2, '#0d0e11')}`;
const safeColor = (c, d) => /^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : d;
const safeSrc = u => typeof u === 'string' &&
  (/^\/api\/portadas\/\d+(\?[\w=.-]*)?$/.test(u) || /^https:\/\/upload\.wikimedia\.org\/[\w\/%().,~-]+$/.test(u)) ? u : null;

export function discHTML(p, { brand = 'CLUB SAKILA', lazy = true } = {}) {
  const src = safeSrc(p.portada);
  const art = src ? `<img class="cd__art" src="${esc(src)}" alt="" ${lazy ? 'loading="lazy"' : ''} decoding="async" draggable="false" referrerpolicy="no-referrer">` : '';
  return `
    <span class="cd${src ? ' cd--art' : ''}" style="${colorVars(p)}">
      <span class="cd__spin"><span class="cd__label"></span>${art}</span>
      <span class="cd__text">
        <span class="cd__brand">${esc(brand)}</span>
        <span class="cd__title">${esc(p.titulo)}</span>
        <span class="cd__meta">${esc(p.anio)} · ${esc(p.clasificacion)}</span>
      </span>
      <span class="cd__hub"></span>
      <span class="cd__sheen"></span>
    </span>`;
}

export function discBackHTML() {
  return `
    <span class="cd cd--back">
      <span class="cd__spin"></span>
      <span class="cd__hub"></span>
      <span class="cd__sheen"></span>
    </span>`;
}

export function installArtFallback(root = document) {
  root.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('cd__art')) return;
    img.closest('.cd')?.classList.remove('cd--art');
    img.remove();
  }, true);
  root.addEventListener('load', e => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.classList.contains('cd__art')) img.classList.add('is-loaded');
  }, true);
}
