// ==============================================================================
// SERVIDOR WEB Y API REST PARA POSTGRESQL
// SingLing - Plataforma Educativa Interactiva de Inglés
// ==============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { pool, query, testConnection, dbConfig } from './db.js';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares con límite ampliado para imágenes HD optimizadas
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS, Imágenes)
app.use(express.static(__dirname));

// ==============================================================================
// GESTOR DE SUBIDA Y ALMACENAMIENTO DE IMÁGENES HD OPTIMIZADAS
// ==============================================================================
app.post('/api/upload-image', (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se envió la imagen' });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9-+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagen inválido o corrupto' });
    }

    const extRaw = matches[1].toLowerCase();
    const ext = extRaw === 'jpeg' ? 'jpg' : (extRaw === 'svg+xml' ? 'svg' : extRaw);
    const buffer = Buffer.from(matches[2], 'base64');

    const uploadsDir = path.join(__dirname, 'img', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const cleanBase = (filename || 'img')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const finalFilename = `${Date.now()}_${cleanBase}.${ext}`;
    const targetPath = path.join(uploadsDir, finalFilename);

    fs.writeFileSync(targetPath, buffer);

    const relativeUrl = `img/uploads/${finalFilename}`;
    const sizeKb = (buffer.length / 1024).toFixed(1);

    res.json({
      success: true,
      url: relativeUrl,
      filename: finalFilename,
      sizeKb: parseFloat(sizeKb),
      message: 'Imagen HD optimizada y guardada exitosamente'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar subida de imagen', details: err.message });
  }
});

// ==============================================================================
// GESTOR DE CONFIGURACIÓN DEL SISTEMA (Límite de Preguntas Aleatorias)
// ==============================================================================
const configCache = new Map();

async function initConfigTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS configuraciones_sistema (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    const rows = await query('SELECT clave, valor FROM configuraciones_sistema');
    for (const r of rows) {
      configCache.set(r.clave, r.valor);
    }
  } catch (err) {
    // Si la tabla aún no está lista en la BD remota, funciona con la memoria caché sin romper la app
    console.warn('ℹ️ Modo fallback de configuración en memoria:', err.message);
  }
}

async function getConfig(key, defaultValue = null) {
  if (configCache.has(key)) return configCache.get(key);
  try {
    const rows = await query('SELECT valor FROM configuraciones_sistema WHERE clave = ? LIMIT 1', [key]);
    if (rows && rows.length > 0) {
      configCache.set(key, rows[0].valor);
      return rows[0].valor;
    }
  } catch (e) {}
  return defaultValue;
}

async function setConfig(key, value) {
  configCache.set(key, String(value));
  try {
    await query(
      `INSERT INTO configuraciones_sistema (clave, valor, updated_at) 
       VALUES (?, ?, NOW()) 
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`,
      [key, String(value)]
    );
  } catch (e) {
    console.warn('Guardado en caché temporal:', e.message);
  }
}

// Inicializar tabla si PostgreSQL está disponible
initConfigTable().catch(() => {});

// ==============================================================================
// RUTAS DE LA API REST
// ==============================================================================

// 1. Diagnóstico y Estado de la Base de Datos
app.get('/api/status', async (req, res) => {
  const result = await testConnection();
  if (!result.success) {
    return res.status(500).json(result);
  }

  try {
    const grados = await query('SELECT COUNT(*) AS total FROM grados');
    const materias = await query('SELECT COUNT(*) AS total FROM materias');
    const unidades = await query('SELECT COUNT(*) AS total FROM unidades');
    const recursos = await query('SELECT COUNT(*) AS total FROM recursos');
    const preguntas = await query('SELECT COUNT(*) AS total FROM preguntas');
    const intentos = await query('SELECT COUNT(*) AS total FROM intentos_evaluacion');
    const actividades = await query('SELECT COUNT(*) AS total FROM actividades_unidad').catch(() => [{ total: 0 }]);

    res.json({
      ...result,
      counts: {
        grados: grados[0]?.total || 0,
        materias: materias[0]?.total || 0,
        unidades: unidades[0]?.total || 0,
        recursos: recursos[0]?.total || 0,
        preguntas: preguntas[0]?.total || 0,
        intentos: intentos[0]?.total || 0,
        actividades: actividades[0]?.total || 0
      }
    });
  } catch (err) {
    res.json({ ...result, errorContadores: err.message });
  }
});

// 2. Grados Oficiales EGB
app.get('/api/grados', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM grados ORDER BY orden ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar grados', details: error.message });
  }
});

// 3. Materias
app.get('/api/materias', async (req, res) => {
  try {
    const { gradoId } = req.query;
    let sql = `
      SELECT m.id, m.nombre, m.descripcion, m.grado_id AS "gradoId", g.codigo AS "gradoCodigo", g.nombre AS "gradoNombre"
      FROM materias m
      JOIN grados g ON m.grado_id = g.id
    `;
    const params = [];

    if (gradoId) {
      sql += ` WHERE m.grado_id = ? OR g.codigo = ?`;
      params.push(parseInt(gradoId, 10) || 0, String(gradoId));
    }

    sql += ` ORDER BY m.id ASC`;
    const rows = await query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar materias', details: error.message });
  }
});

app.post('/api/materias', async (req, res) => {
  try {
    const { nombre, gradoId, descripcion } = req.body;
    if (!nombre || !gradoId) {
      return res.status(400).json({ error: 'Nombre y gradoId son requeridos' });
    }

    // Resolver grado_id si viene como código '6' o id numérico
    const grados = await query('SELECT id FROM grados WHERE id = ? OR codigo = ? LIMIT 1', [
      parseInt(gradoId, 10) || 0,
      String(gradoId)
    ]);
    const finalGradoId = grados.length > 0 ? grados[0].id : parseInt(gradoId, 10);

    const result = await query(
      'INSERT INTO materias (nombre, grado_id, descripcion) VALUES (?, ?, ?) RETURNING id',
      [nombre.trim(), finalGradoId, descripcion || null]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      gradoId: finalGradoId,
      message: 'Materia creada exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear materia', details: error.message });
  }
});

app.delete('/api/materias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM materias WHERE id = ?', [id]);
    res.json({ message: 'Materia eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar materia', details: error.message });
  }
});

// 4. Unidades Didácticas
app.get('/api/unidades', async (req, res) => {
  try {
    const { materiaId } = req.query;
    let sql = 'SELECT id, materia_id AS "materiaId", numero_unidad AS "numeroUnidad", titulo, descripcion FROM unidades';
    const params = [];

    if (materiaId) {
      sql += ' WHERE materia_id = ?';
      params.push(parseInt(materiaId, 10));
    }

    sql += ' ORDER BY numero_unidad ASC, id ASC';
    const rows = await query(sql, params);

    // Adjuntar la configuración de cuántas preguntas presentar en cada unidad
    const globalDefault = process.env.QUIZ_QUESTIONS_LIMIT || '10';
    for (const row of rows) {
      const cfg = await getConfig(`quiz_limit_unit_${row.id}`, globalDefault);
      row.limitePreguntas = cfg === 'all' ? 'all' : parseInt(cfg, 10) || 10;
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar unidades', details: error.message });
  }
});

// Obtener configuración de límite de preguntas para una unidad específica
app.get('/api/unidades/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const globalDefault = process.env.QUIZ_QUESTIONS_LIMIT || '10';
    const limit = await getConfig(`quiz_limit_unit_${id}`, globalDefault);
    res.json({
      unidadId: id,
      limitePreguntas: limit === 'all' ? 'all' : parseInt(limit, 10) || 10
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar configuración de unidad', details: error.message });
  }
});

// Guardar configuración de cuántas preguntas aleatorias presentar en una unidad
app.post('/api/unidades/:id/config', async (req, res) => {
  try {
    const { id } = req.params;
    const { limitePreguntas } = req.body;
    const val = (limitePreguntas === 'all' || limitePreguntas === 0) ? 'all' : String(parseInt(limitePreguntas, 10) || 10);
    await setConfig(`quiz_limit_unit_${id}`, val);
    res.json({
      unidadId: id,
      limitePreguntas: val === 'all' ? 'all' : parseInt(val, 10),
      message: 'Configuración guardada exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar configuración de unidad', details: error.message });
  }
});

app.post('/api/unidades', async (req, res) => {
  try {
    const { titulo, materiaId, numeroUnidad, descripcion, limitePreguntas } = req.body;
    if (!titulo || !materiaId) {
      return res.status(400).json({ error: 'Título y materiaId son requeridos' });
    }

    const num = numeroUnidad || 1;
    const result = await query(
      'INSERT INTO unidades (titulo, materia_id, numero_unidad, descripcion) VALUES (?, ?, ?, ?) RETURNING id',
      [titulo.trim(), parseInt(materiaId, 10), num, descripcion || null]
    );

    const newId = result.insertId;

    if (limitePreguntas !== undefined) {
      const val = limitePreguntas === 'all' ? 'all' : String(parseInt(limitePreguntas, 10) || 10);
      await setConfig(`quiz_limit_unit_${newId}`, val);
    }

    res.status(201).json({
      id: newId,
      titulo,
      materiaId,
      numeroUnidad: num,
      limitePreguntas: limitePreguntas || 10,
      message: 'Unidad creada exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear unidad', details: error.message });
  }
});

app.delete('/api/unidades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM unidades WHERE id = ?', [id]);
    res.json({ message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar unidad', details: error.message });
  }
});

// 5. Recursos Didácticos (PDFs y Videos)
app.get('/api/recursos', async (req, res) => {
  try {
    const { unidadId } = req.query;
    let sql = 'SELECT id, unidad_id AS "unidadId", titulo, tipo, url FROM recursos';
    const params = [];

    if (unidadId) {
      sql += ' WHERE unidad_id = ?';
      params.push(parseInt(unidadId, 10));
    }

    sql += ' ORDER BY id ASC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar recursos', details: error.message });
  }
});

app.post('/api/recursos', async (req, res) => {
  try {
    const { titulo, tipo, url, unidadId } = req.body;
    if (!titulo || !url || !unidadId) {
      return res.status(400).json({ error: 'Título, URL y unidadId son requeridos' });
    }

    const finalTipo = tipo === 'video' ? 'video' : 'pdf';
    const result = await query(
      'INSERT INTO recursos (titulo, tipo, url, unidad_id) VALUES (?, ?, ?, ?) RETURNING id',
      [titulo.trim(), finalTipo, url.trim(), parseInt(unidadId, 10)]
    );

    res.status(201).json({
      id: result.insertId,
      titulo,
      tipo: finalTipo,
      url,
      unidadId,
      message: 'Recurso creado exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear recurso', details: error.message });
  }
});

app.delete('/api/recursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM recursos WHERE id = ?', [id]);
    res.json({ message: 'Recurso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar recurso', details: error.message });
  }
});

// 6. Preguntas y Opciones Evaluativas
app.get('/api/preguntas', async (req, res) => {
  try {
    const { unidadId } = req.query;
    let sql = `
      SELECT 
        p.id, p.unidad_id, p.tipo, p.pregunta, p.imagen, p.categoria, p.puntos,
        o.id AS opcion_id, o.texto_opcion, o.es_correcta, o.orden
      FROM preguntas p
      LEFT JOIN opciones_pregunta o ON o.pregunta_id = p.id
    `;
    const params = [];

    if (unidadId) {
      sql += ' WHERE p.unidad_id = ?';
      params.push(parseInt(unidadId, 10));
    }

    sql += ' ORDER BY p.id ASC, o.orden ASC, o.id ASC';
    const rows = await query(sql, params);

    // Agrupar preguntas con sus respectivas opciones
    const questionsMap = new Map();

    for (const row of rows) {
      if (!questionsMap.has(row.id)) {
        questionsMap.set(row.id, {
          id: String(row.id),
          unidadId: String(row.unidad_id),
          pregunta: row.pregunta,
          question: row.pregunta,
          tipo: row.tipo,
          type: row.tipo === 'fill' ? 'drag-and-drop' : 'multiple',
          imagen: row.imagen || '',
          image: row.imagen || '',
          categoria: row.categoria,
          category: row.categoria,
          puntos: row.puntos,
          opciones: [],
          options: [],
          correcta: '',
          correct: ''
        });
      }

      if (row.texto_opcion) {
        const q = questionsMap.get(row.id);
        q.opciones.push(row.texto_opcion);
        q.options.push(row.texto_opcion);
        if (row.es_correcta === 1) {
          q.correcta = row.texto_opcion;
          q.correct = row.texto_opcion;
        }
      }
    }

    const result = Array.from(questionsMap.values());
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar preguntas', details: error.message });
  }
});

app.post('/api/preguntas', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { unidadId, tipo, pregunta, imagen, opciones, correcta, categoria } = req.body;
    if (!unidadId || !pregunta || !opciones || !opciones.length) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'unidadId, pregunta y opciones son obligatorios' });
    }

    const finalTipo = tipo === 'drag-and-drop' || tipo === 'fill' ? 'fill' : 'multiple';
    const cleanPregunta = pregunta.replace(/\[box\]/g, '______').trim();
    const finalCategoria = categoria ? parseInt(categoria, 10) : 1;

    // 1. Insertar pregunta y obtener id generado
    const [resultPregunta] = await connection.execute(
      'INSERT INTO preguntas (unidad_id, tipo, pregunta, imagen, categoria) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [parseInt(unidadId, 10), finalTipo, cleanPregunta, imagen || null, finalCategoria]
    );

    const preguntaId = resultPregunta.insertId;

    // 2. Insertar opciones
    const validOptions = (opciones || []).map(o => String(o).trim()).filter(o => o.length > 0);
    const targetCorrect = (correcta || validOptions[0] || '').trim().toLowerCase();

    let orden = 1;
    for (const opt of validOptions) {
      const esCorrecta = opt.toLowerCase() === targetCorrect ? 1 : 0;
      await connection.execute(
        'INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES (?, ?, ?, ?) RETURNING id',
        [preguntaId, opt, esCorrecta, orden++]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({
      id: preguntaId,
      unidadId,
      pregunta: cleanPregunta,
      tipo: finalTipo,
      opciones: validOptions,
      correcta: correcta || validOptions[0],
      message: 'Pregunta guardada exitosamente en PostgreSQL'
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ error: 'Error al guardar pregunta', details: error.message });
  }
});

app.delete('/api/preguntas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM preguntas WHERE id = ?', [id]);
    res.json({ message: 'Pregunta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar pregunta', details: error.message });
  }
});

// ==============================================================================
// 7. ACTIVIDADES INTERACTIVAS (Memorama, Crucigrama, Sopa de Letras, Ahorcado, Fill)
// ==============================================================================
app.get('/api/actividades', async (req, res) => {
  try {
    const { unidadId, tipo } = req.query;
    let sql = 'SELECT id, unidad_id AS "unidadId", tipo, titulo, descripcion, datos, COALESCE(nivel_dificultad, 1) AS "nivelDificultad", COALESCE(aciertos_requeridos, 0) AS "aciertosRequeridos", COALESCE(puntos_recompensa, 10) AS "puntosRecompensa", activo, orden, created_at FROM actividades_unidad WHERE 1=1';
    const params = [];

    if (unidadId) {
      sql += ' AND unidad_id = ?';
      params.push(parseInt(unidadId, 10));
    }
    if (tipo) {
      sql += ' AND tipo = ?';
      params.push(tipo);
    }

    sql += ' ORDER BY orden ASC, id ASC';
    const rows = await query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar actividades', details: error.message });
  }
});

app.get('/api/actividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await query(
      'SELECT id, unidad_id AS "unidadId", tipo, titulo, descripcion, datos, COALESCE(nivel_dificultad, 1) AS "nivelDificultad", COALESCE(aciertos_requeridos, 0) AS "aciertosRequeridos", COALESCE(puntos_recompensa, 10) AS "puntosRecompensa", activo, orden, created_at FROM actividades_unidad WHERE id = ?',
      [parseInt(id, 10)]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar actividad', details: error.message });
  }
});

app.post('/api/actividades', async (req, res) => {
  try {
    const { unidadId, tipo, titulo, descripcion, datos, orden, nivelDificultad, aciertosRequeridos, puntosRecompensa } = req.body;
    if (!unidadId || !tipo || !titulo || !datos) {
      return res.status(400).json({ error: 'unidadId, tipo, titulo y datos son requeridos' });
    }

    const validTypes = ['fill', 'memorama', 'crucigrama', 'sopa_letras', 'ahorcado', 'multiple'];
    if (!validTypes.includes(tipo)) {
      return res.status(400).json({ error: `Tipo inválido. Debe ser uno de: ${validTypes.join(', ')}` });
    }

    const jsonDatos = typeof datos === 'string' ? datos : JSON.stringify(datos);
    const ord = orden ? parseInt(orden, 10) : 1;
    const lvl = nivelDificultad ? parseInt(nivelDificultad, 10) : 1;
    const reqHits = aciertosRequeridos !== undefined ? parseInt(aciertosRequeridos, 10) : 0;
    const pts = puntosRecompensa !== undefined ? parseInt(puntosRecompensa, 10) : 10;

    const result = await query(
      `INSERT INTO actividades_unidad (unidad_id, tipo, titulo, descripcion, datos, orden, nivel_dificultad, aciertos_requeridos, puntos_recompensa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [parseInt(unidadId, 10), tipo, titulo.trim(), descripcion || null, jsonDatos, ord, lvl, reqHits, pts]
    );

    res.status(201).json({
      id: result.insertId,
      unidadId,
      tipo,
      titulo,
      message: 'Actividad creada exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear actividad', details: error.message });
  }
});

app.put('/api/actividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, datos, activo, orden } = req.body;

    const fields = [];
    const params = [];

    if (titulo !== undefined) {
      fields.push('titulo = ?');
      params.push(titulo.trim());
    }
    if (descripcion !== undefined) {
      fields.push('descripcion = ?');
      params.push(descripcion);
    }
    if (datos !== undefined) {
      fields.push('datos = ?');
      params.push(typeof datos === 'string' ? datos : JSON.stringify(datos));
    }
    if (activo !== undefined) {
      fields.push('activo = ?');
      params.push(Boolean(activo));
    }
    if (orden !== undefined) {
      fields.push('orden = ?');
      params.push(parseInt(orden, 10));
    }
    if (req.body.nivelDificultad !== undefined || req.body.nivel_dificultad !== undefined) {
      fields.push('nivel_dificultad = ?');
      params.push(parseInt(req.body.nivelDificultad ?? req.body.nivel_dificultad, 10));
    }
    if (req.body.aciertosRequeridos !== undefined || req.body.aciertos_requeridos !== undefined) {
      fields.push('aciertos_requeridos = ?');
      params.push(parseInt(req.body.aciertosRequeridos ?? req.body.aciertos_requeridos, 10));
    }
    if (req.body.puntosRecompensa !== undefined || req.body.puntos_recompensa !== undefined) {
      fields.push('puntos_recompensa = ?');
      params.push(parseInt(req.body.puntosRecompensa ?? req.body.puntos_recompensa, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    params.push(parseInt(id, 10));
    await query(`UPDATE actividades_unidad SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ id, message: 'Actividad actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar actividad', details: error.message });
  }
});

app.delete('/api/actividades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM actividades_unidad WHERE id = ?', [parseInt(id, 10)]);
    res.json({ message: 'Actividad eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar actividad', details: error.message });
  }
});


// ==============================================================================
// 7.1 SISTEMA DE AUTOAPRENDIZAJE Y PROGRESO POR ACIERTOS
// ==============================================================================
app.get('/api/progreso', async (req, res) => {
  try {
    const { unidadId, usuarioId } = req.query;
    if (!unidadId) {
      return res.status(400).json({ error: 'unidadId es requerido' });
    }
    const uId = parseInt(unidadId, 10);
    const userFilter = usuarioId ? parseInt(usuarioId, 10) : null;

    let rows;
    if (userFilter) {
      rows = await query('SELECT * FROM progreso_estudiante WHERE unidad_id = ? AND usuario_id = ? LIMIT 1', [uId, userFilter]);
    } else {
      rows = await query('SELECT * FROM progreso_estudiante WHERE unidad_id = ? AND usuario_id IS NULL LIMIT 1', [uId]);
    }

    if (!rows || rows.length === 0) {
      return res.json({
        unidadId: uId,
        aciertos: 0,
        rachaActual: 0,
        rachaMaxima: 0,
        nivelActual: 1,
        actividadesCompletadas: [],
        porcentajeDominio: 0
      });
    }

    const p = rows[0];
    const rawCompleted = p.actividades_completadas;
    const completedList = typeof rawCompleted === 'string' ? JSON.parse(rawCompleted) : (rawCompleted || []);

    res.json({
      id: p.id,
      unidadId: p.unidad_id,
      aciertos: p.aciertos || 0,
      rachaActual: p.racha_actual || 0,
      rachaMaxima: p.racha_maxima || 0,
      nivelActual: p.nivel_actual || 1,
      actividadesCompletadas: completedList,
      porcentajeDominio: Math.min(100, Math.round(((p.aciertos || 0) / 20) * 100))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar progreso', details: error.message });
  }
});

app.post('/api/progreso/acierto', async (req, res) => {
  try {
    const { unidadId, usuarioId, tipoActividad, esAcierto, puntos, completada } = req.body;
    if (!unidadId) {
      return res.status(400).json({ error: 'unidadId es requerido' });
    }
    const uId = parseInt(unidadId, 10);
    const userFilter = usuarioId ? parseInt(usuarioId, 10) : null;
    const isCorrect = Boolean(esAcierto);

    let rows;
    if (userFilter) {
      rows = await query('SELECT * FROM progreso_estudiante WHERE unidad_id = ? AND usuario_id = ? LIMIT 1', [uId, userFilter]);
    } else {
      rows = await query('SELECT * FROM progreso_estudiante WHERE unidad_id = ? AND usuario_id IS NULL LIMIT 1', [uId]);
    }

    let p = rows && rows.length > 0 ? rows[0] : null;
    let currentAciertos = p ? (p.aciertos || 0) : 0;
    let currentRacha = p ? (p.racha_actual || 0) : 0;
    let currentRachaMax = p ? (p.racha_maxima || 0) : 0;
    let prevNivel = p ? (p.nivel_actual || 1) : 1;
    let rawCompleted = p ? p.actividades_completadas : [];
    let completedList = typeof rawCompleted === 'string' ? JSON.parse(rawCompleted) : (rawCompleted || []);

    if (isCorrect) {
      currentAciertos += 1;
      currentRacha += 1;
      if (currentRacha > currentRachaMax) currentRachaMax = currentRacha;
    } else {
      currentRacha = 0;
    }

    if (completada && tipoActividad && !completedList.includes(tipoActividad)) {
      completedList.push(tipoActividad);
    }

    // Algoritmo pedagógico adaptativo:
    // Nivel 1: Principiante (0-4 aciertos)
    // Nivel 2: Intermedio (5-14 aciertos o racha >= 3)
    // Nivel 3: Avanzado (15+ aciertos o racha >= 6)
    let newNivel = 1;
    if (currentAciertos >= 15 || currentRacha >= 6) {
      newNivel = 3;
    } else if (currentAciertos >= 5 || currentRacha >= 3) {
      newNivel = 2;
    }

    const nivelSubido = newNivel > prevNivel;
    const jsonCompleted = JSON.stringify(completedList);

    if (p) {
      await query(
        `UPDATE progreso_estudiante 
         SET aciertos = ?, racha_actual = ?, racha_maxima = ?, nivel_actual = ?, actividades_completadas = ?::jsonb, updated_at = NOW() 
         WHERE id = ?`,
        [currentAciertos, currentRacha, currentRachaMax, newNivel, jsonCompleted, p.id]
      );
    } else {
      await query(
        `INSERT INTO progreso_estudiante (usuario_id, unidad_id, aciertos, racha_actual, racha_maxima, nivel_actual, actividades_completadas) 
         VALUES (?, ?, ?, ?, ?, ?, ?::jsonb)`,
        [userFilter, uId, currentAciertos, currentRacha, currentRachaMax, newNivel, jsonCompleted]
      );
    }

    res.json({
      success: true,
      unidadId: uId,
      aciertos: currentAciertos,
      rachaActual: currentRacha,
      rachaMaxima: currentRachaMax,
      nivelActual: newNivel,
      nivelSubido,
      actividadesCompletadas: completedList,
      porcentajeDominio: Math.min(100, Math.round((currentAciertos / 20) * 100))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar progreso', details: error.message });
  }
});

// 7. Intentos de Evaluación (Semáforo Adaptativo)
app.post('/api/intentos', async (req, res) => {
  try {
    const {
      usuarioId,
      unidadId,
      puntajeObtenido,
      totalPreguntas,
      porcentaje,
      desempeno,
      categoriaDebil
    } = req.body;

    if (!unidadId || puntajeObtenido === undefined || !totalPreguntas) {
      return res.status(400).json({ error: 'unidadId, puntajeObtenido y totalPreguntas son requeridos' });
    }

    const pct = porcentaje !== undefined ? porcentaje : Math.round((puntajeObtenido / totalPreguntas) * 100);
    let color = desempeno;
    if (!color) {
      if (pct >= 80) color = 'verde';
      else if (pct >= 50) color = 'amarillo';
      else color = 'rojo';
    }

    const result = await query(
      `INSERT INTO intentos_evaluacion 
       (usuario_id, unidad_id, puntaje_obtenido, total_preguntas, porcentaje, desempeno, categoria_debil)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [usuarioId ? parseInt(usuarioId, 10) : null, parseInt(unidadId, 10), puntajeObtenido, totalPreguntas, pct, color, categoriaDebil || null]
    );

    res.status(201).json({
      id: result.insertId,
      desempeno: color,
      porcentaje: pct,
      message: 'Intento registrado exitosamente en PostgreSQL'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar intento', details: error.message });
  }
});

app.get('/api/intentos', async (req, res) => {
  try {
    const sql = 'SELECT * FROM vw_desempeno_estudiantes';
    const rows = await query(sql);
    res.json(rows);
  } catch (error) {
    // Si la vista aún no está compilada, consultar directo la tabla
    try {
      const rows = await query('SELECT * FROM intentos_evaluacion ORDER BY fecha_intento DESC');
      res.json(rows);
    } catch (err2) {
      res.status(500).json({ error: 'Error al consultar intentos', details: err2.message });
    }
  }
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log('\n============================================================');
  console.log('🚀 SERVIDOR SINGLING INICIADO CON ÉXITO');
  console.log('============================================================');
  console.log(`📡 URL Principal:      http://localhost:${PORT}`);
  console.log(`🎓 Portal Estudiante:  http://localhost:${PORT}/index.html`);
  console.log(`👨‍🏫 Panel Docente:     http://localhost:${PORT}/admin.html`);
  console.log(`🔍 Diagnóstico DB:     http://localhost:${PORT}/api/status`);
  console.log(`🐘 PostgreSQL Config:  ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('============================================================\n');
});
