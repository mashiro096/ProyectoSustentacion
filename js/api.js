// ==============================================================================
// CLIENTE API REST PARA CONEXIÓN A POSTGRESQL
// SingLing - Plataforma Educativa Interactiva
// ==============================================================================

// Determinar URL base de la API automáticamente
const API_BASE = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) 
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
  getIntentos: (unidadId) => request(`/intentos${unidadId ? `?unidadId=${encodeURIComponent(unidadId)}` : ''}`),

  // 8. Actividades Lúdicas Interactivas (Memorama, Crucigrama, Sopa de Letras, Ahorcado, Fill)
  getActividades: (unidadId, tipo) => {
    const params = new URLSearchParams();
    if (unidadId) params.append('unidadId', unidadId);
    if (tipo) params.append('tipo', tipo);
    const qs = params.toString();
    return request(`/actividades${qs ? `?${qs}` : ''}`);
  },
  getActividad: (id) => request(`/actividades/${id}`),
  createActividad: (data) => request('/actividades', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateActividad: (id, data) => request(`/actividades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteActividad: (id) => request(`/actividades/${id}`, { method: 'DELETE' }),

  // 9. Subida y Optimización de Imágenes
  uploadImage: async (imageBase64, filename) => {
    try {
      const res = await request('/upload-image', {
        method: 'POST',
        body: JSON.stringify({ imageBase64, filename })
      });
      return res;
    } catch (err) {
      // Fallback resiliente: Si el servidor Node aún no ha sido reiniciado (está en memoria antes de la ruta),
      // utiliza directamente la dataUrl optimizada en base64 (que pesa ~40KB) para que nada se rompa.
      console.warn("Aviso: /upload-image respondió con error (reiniciar el servidor con npm start cargará el endpoint en disco). Usando imagen base64 optimizada directamente.");
      return {
        url: imageBase64,
        filename: filename || 'imagen.webp',
        sizeKb: Math.round((imageBase64.length * 3 / 4) / 1024),
        fallback: true
      };
    }
  },

  // 10. Progreso y Autoaprendizaje Adaptativo
  getProgreso: async (unidadId, usuarioId) => {
    const key = `singling_progreso_u${unidadId || 1}`;
    try {
      const params = new URLSearchParams();
      if (unidadId) params.append('unidadId', unidadId);
      if (usuarioId) params.append('usuarioId', usuarioId);
      const res = await request(`/progreso?${params.toString()}`);
      if (res && typeof res.aciertos === 'number') {
        localStorage.setItem(key, JSON.stringify(res));
        return res;
      }
    } catch (e) {
      // Fallback a localStorage si el servidor aún no tiene la ruta activa
    }
    const local = localStorage.getItem(key);
    if (local) {
      try { return JSON.parse(local); } catch (_) {}
    }
    return {
      unidadId: parseInt(unidadId || 1, 10),
      aciertos: 0,
      rachaActual: 0,
      rachaMaxima: 0,
      nivelActual: 1,
      actividadesCompletadas: [],
      porcentajeDominio: 0
    };
  },

  registrarAcierto: async (data) => {
    const uId = data.unidadId || 1;
    const key = `singling_progreso_u${uId}`;
    try {
      const res = await request('/progreso/acierto', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res && res.success) {
        localStorage.setItem(key, JSON.stringify(res));
        return res;
      }
    } catch (e) {
      // Fallback local adaptativo
    }

    // Algoritmo local resiliente
    let current = {
      unidadId: uId,
      aciertos: 0,
      rachaActual: 0,
      rachaMaxima: 0,
      nivelActual: 1,
      actividadesCompletadas: [],
      porcentajeDominio: 0
    };
    try {
      const raw = localStorage.getItem(key);
      if (raw) current = { ...current, ...JSON.parse(raw) };
    } catch (_) {}

    const isCorrect = Boolean(data.esAcierto);
    if (isCorrect) {
      current.aciertos += 1;
      current.rachaActual += 1;
      if (current.rachaActual > current.rachaMaxima) current.rachaMaxima = current.rachaActual;
    } else {
      current.rachaActual = 0;
    }

    if (data.completada && data.tipoActividad && !current.actividadesCompletadas.includes(data.tipoActividad)) {
      current.actividadesCompletadas.push(data.tipoActividad);
    }

    const prevLvl = current.nivelActual;
    if (current.aciertos >= 15 || current.rachaActual >= 5) {
      current.nivelActual = 3;
    } else if (current.aciertos >= 5 || current.rachaActual >= 2) {
      current.nivelActual = 2;
    } else {
      current.nivelActual = 1;
    }

    current.porcentajeDominio = Math.min(100, Math.round((current.aciertos / 20) * 100));
    const nivelSubido = current.nivelActual > prevLvl;

    localStorage.setItem(key, JSON.stringify(current));
    return { ...current, success: true, nivelSubido };
  }
};

// ==============================================================================
// OPTIMIZADOR HD DE IMÁGENES CLIENT-SIDE (HTML5 Canvas + WebP/JPEG)
// Reduce imágenes pesadas (ej: 4MB a ~40KB-70KB) manteniendo calidad HD nítida
// ==============================================================================
export function optimizeAndCompressImage(file, maxDimension = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const originalSizeKb = (file.size / 1024).toFixed(1);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escalado proporcional manteniendo aspecto sin distorsión
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Suavizado bicúbico de alta calidad para máxima nitidez HD
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Preferir WebP por su compresión superior y soporte moderno; fallback a JPEG
        let mime = 'image/webp';
        let dataUrl = canvas.toDataURL(mime, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          mime = 'image/jpeg';
          dataUrl = canvas.toDataURL(mime, quality);
        }

        // Calcular tamaño optimizado aproximado
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const optimizedSizeKb = ((base64Length * 0.75) / 1024).toFixed(1);
        const reductionPct = Math.max(0, Math.round(((file.size - (base64Length * 0.75)) / file.size) * 100));

        resolve({
          dataUrl,
          filename: file.name,
          width,
          height,
          originalSizeKb: parseFloat(originalSizeKb),
          optimizedSizeKb: parseFloat(optimizedSizeKb),
          reductionPct,
          mime
        });
      };
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

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

// Indicador visual de estado de conexión a PostgreSQL en la interfaz
export function initDbStatusBadge(containerId = null) {
  const badgeId = 'singling-db-badge';
  let badge = document.getElementById(badgeId);

  if (!badge) {
    badge = document.createElement('div');
    badge.id = badgeId;
    badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all border backdrop-blur-md cursor-pointer';
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></span><span>Conectando a PostgreSQL...</span>`;
    document.body.appendChild(badge);
  }

  // Verificar conexión con el backend y la base de datos
  api.checkStatus()
    .then(data => {
      if (data.success) {
        badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all';
        badge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>PostgreSQL: <b>${data.database || 'singling_db'}</b></span>
        `;
        badge.title = `Conectado a ${data.config?.host}:${data.config?.port} (${data.version || 'PostgreSQL'})`;
      } else {
        throw new Error(data.error || 'Error reportado por el servidor');
      }
    })
    .catch(err => {
      badge.className = 'fixed bottom-3 right-3 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md bg-amber-50 text-amber-800 border border-amber-300 transition-all';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        <span>PostgreSQL: Configurar en .env</span>
      `;
      badge.title = `Para conectar a PostgreSQL: configura tu contraseña en .env y ejecuta "npm start". (${err.message})`;
      badge.onclick = () => {
        alert(
          "ℹ️ Estado de Conexión a PostgreSQL\n\n" +
          "Para que tu base de datos funcione:\n" +
          "1. Verifica la contraseña en la variable DATABASE_URL o DB_PASSWORD del archivo .env.\n" +
          "2. Asegúrate de haber importado database/esquema_singling_postgresql.sql en tu base de datos.\n" +
          "3. Ejecuta 'npm start' en la terminal para iniciar el servidor.\n\n" +
          "Detalle del error: " + err.message
        );
      };
    });
}
