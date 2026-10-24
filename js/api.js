// ==============================================================================
// CLIENTE API REST PARA CONEXIÓN A MARIADB / MYSQL
// SingLing - Plataforma Educativa Interactiva
// ==============================================================================

// Determinar URL base de la API automáticamente
const API_BASE = (window.location.protocol.startsWith('http')) 
  ? '/api' 
  : 'http://localhost:3000/api';

// Helper genérico para peticiones fetch
async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Error HTTP ${res.status}`;
      console.error(`[API Error ${res.status}] ${endpoint}:`, data);
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    console.error(`[Fallo de Conexión] No se pudo conectar al endpoint '${endpoint}':`, error.message);
    throw error;
  }
}

export const api = {
  // 1. Diagnóstico de Base de Datos
  checkStatus: () => request('/status'),

  // 2. Grados
  getGrados: () => request('/grados'),

  // 3. Materias
  getMaterias: (gradoId) => request(`/materias${gradoId ? `?gradoId=${encodeURIComponent(gradoId)}` : ''}`),
  createMateria: (nombre, gradoId, descripcion = '') => request('/materias', {
    method: 'POST',
    body: JSON.stringify({ nombre, gradoId, descripcion })
  }),
  deleteMateria: (id) => request(`/materias/${id}`, { method: 'DELETE' }),

  // 4. Unidades Didácticas
  getUnidades: (materiaId) => request(`/unidades${materiaId ? `?materiaId=${encodeURIComponent(materiaId)}` : ''}`),
  createUnidad: (titulo, materiaId, numeroUnidad = 1, descripcion = '', limitePreguntas = 10) => request('/unidades', {
    method: 'POST',
    body: JSON.stringify({ titulo, materiaId, numeroUnidad, descripcion, limitePreguntas })
  }),
  deleteUnidad: (id) => request(`/unidades/${id}`, { method: 'DELETE' }),
  getQuizConfig: (unidadId) => request(`/unidades/${unidadId}/config`),
  setQuizConfig: (unidadId, limitePreguntas) => request(`/unidades/${unidadId}/config`, {
    method: 'POST',
    body: JSON.stringify({ limitePreguntas })
  }),

  // 5. Recursos Didácticos
  getRecursos: (unidadId) => request(`/recursos${unidadId ? `?unidadId=${encodeURIComponent(unidadId)}` : ''}`),
  createRecurso: (titulo, tipo, url, unidadId) => request('/recursos', {
    method: 'POST',
    body: JSON.stringify({ titulo, tipo, url, unidadId })
  }),
  deleteRecurso: (id) => request(`/recursos/${id}`, { method: 'DELETE' }),

  // 6. Preguntas y Banco Evaluativo
  getPreguntas: (unidadId) => request(`/preguntas${unidadId ? `?unidadId=${encodeURIComponent(unidadId)}` : ''}`),
  createPregunta: (data) => request('/preguntas', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deletePregunta: (id) => request(`/preguntas/${id}`, { method: 'DELETE' }),

  // 7. Intentos de Evaluación (Semáforo Adaptativo)
  saveIntento: (data) => request('/intentos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getIntentos: (unidadId) => request(`/intentos${unidadId ? `?unidadId=${encodeURIComponent(unidadId)}` : ''}`)
};

// Helper para convertir links de Google Drive a URLs embebibles
export function cleanDriveLink(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    const parts = trimmed.split('/');
    const fileId = trimmed.includes('id=') ? trimmed.split('id=')[1] : parts[parts.indexOf('d') + 1];
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId.split(/[?&]/)[0]}`;
    }
  }
  return trimmed;
}

// Indicador visual de estado de conexión a MariaDB en la interfaz
export function initDbStatusBadge(containerId = null) {
  const badgeId = 'singling-db-badge';
  let badge = document.getElementById(badgeId);

  if (!badge) {
    badge = document.createElement('div');
    badge.id = badgeId;
    badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all border backdrop-blur-md cursor-pointer';
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></span><span>Conectando a MariaDB...</span>`;
    document.body.appendChild(badge);
  }

  // Verificar conexión con el backend y la base de datos
  api.checkStatus()
    .then(data => {
      if (data.success) {
        badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all';
        badge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>MariaDB: <b>${data.database || 'singling_db'}</b></span>
        `;
        badge.title = `Conectado a ${data.config?.host}:${data.config?.port} (${data.version || 'MySQL/MariaDB'})`;
      } else {
        throw new Error(data.error || 'Error reportado por el servidor');
      }
    })
    .catch(err => {
      badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md bg-amber-50 text-amber-800 border border-amber-300 transition-all';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>MariaDB: Configurar en .env</span>
      `;
      badge.title = `Para conectar a tu base de datos local: asegúrate de que MariaDB/MySQL esté activo y ejecuta "npm start". (${err.message})`;
      badge.onclick = () => {
        alert(
          "ℹ️ Estado de Conexión a MariaDB / MySQL\n\n" +
          "Para que tu base de datos funcione:\n" +
          "1. Asegúrate de iniciar MariaDB o MySQL (en XAMPP, Laragon o Servicios de Windows).\n" +
          "2. Verifica tu usuario y contraseña en el archivo .env de este proyecto.\n" +
          "3. Ejecuta 'npm start' en la terminal para iniciar el servidor.\n\n" +
          "Detalle del error: " + err.message
        );
      };
    });
}
