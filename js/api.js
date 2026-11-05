/* Cliente de la API REST (Fetch API). Todas las funciones devuelven Promesas. */
const BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('No hay conexión con el servidor. ¿Está corriendo con npm start?');
  }
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

const qs = obj => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? '?' + s : '';
};

export const api = {
  peliculas: (filtros = {}) => request('/peliculas' + qs(filtros)),
  pelicula: id => request(`/peliculas/${id}`),
  categorias: () => request('/categorias'),
  socios: () => request('/socios'),
  crearSocio: datos => request('/socios', { method: 'POST', body: datos }),
  alquileres: socioId => request(`/socios/${socioId}/alquileres`),
  alquilar: (socioId, items) => request(`/socios/${socioId}/alquileres`, { method: 'POST', body: { items } }),
  devolver: (socioId, alquilerId) => request(`/socios/${socioId}/alquileres/${alquilerId}/devolucion`, { method: 'PATCH' }),
  favoritos: socioId => request(`/socios/${socioId}/favoritos`),
  agregarFavorito: (socioId, peliId) => request(`/socios/${socioId}/favoritos/${peliId}`, { method: 'PUT' }),
  quitarFavorito: (socioId, peliId) => request(`/socios/${socioId}/favoritos/${peliId}`, { method: 'DELETE' })
};
