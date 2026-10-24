// ==============================================================================
// SERVIDOR WEB Y API REST PARA MARIADB / MYSQL
// SingLing - Plataforma Educativa Interactiva de Inglés
// ==============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool, query, testConnection, dbConfig } from './db.js';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend (HTML, CSS, JS, Imágenes)
app.use(express.static(__dirname));

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const rows = await query('SELECT clave, valor FROM configuraciones_sistema');
    for (const r of rows) {
      configCache.set(r.clave, r.valor);
    }
  } catch (err) {
    // Si la tabla no está creada, funciona con la memoria caché sin romper nada
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
      'INSERT INTO configuraciones_sistema (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [key, String(value)]
    );
  } catch (e) {
    console.warn('Guardado en caché temporal:', e.message);
  }
}

// Inicializar tabla si MariaDB está disponible
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
    const [grados] = await pool.query('SELECT COUNT(*) AS total FROM grados');
    const [materias] = await pool.query('SELECT COUNT(*) AS total FROM materias');
    const [unidades] = await pool.query('SELECT COUNT(*) AS total FROM unidades');
    const [recursos] = await pool.query('SELECT COUNT(*) AS total FROM recursos');
    const [preguntas] = await pool.query('SELECT COUNT(*) AS total FROM preguntas');
    const [intentos] = await pool.query('SELECT COUNT(*) AS total FROM intentos_evaluacion');

    res.json({
      ...result,
      counts: {
        grados: grados[0].total,
        materias: materias[0].total,
        unidades: unidades[0].total,
        recursos: recursos[0].total,
        preguntas: preguntas[0].total,
        intentos: intentos[0].total
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
      SELECT m.id, m.nombre, m.descripcion, m.grado_id AS gradoId, g.codigo AS gradoCodigo, g.nombre AS gradoNombre
      FROM materias m
      JOIN grados g ON m.grado_id = g.id
    `;
    const params = [];

    if (gradoId) {
      sql += ` WHERE m.grado_id = ? OR g.codigo = ?`;
      params.push(gradoId, gradoId);
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
    const grados = await query('SELECT id FROM grados WHERE id = ? OR codigo = ? LIMIT 1', [gradoId, gradoId]);
    const finalGradoId = grados.length > 0 ? grados[0].id : parseInt(gradoId, 10);

    const result = await query(
      'INSERT INTO materias (nombre, grado_id, descripcion) VALUES (?, ?, ?)',
      [nombre.trim(), finalGradoId, descripcion || null]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      gradoId: finalGradoId,
      message: 'Materia creada exitosamente'
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
    let sql = 'SELECT id, materia_id AS materiaId, numero_unidad AS numeroUnidad, titulo, descripcion FROM unidades';
    const params = [];

    if (materiaId) {
      sql += ' WHERE materia_id = ?';
      params.push(materiaId);
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
      message: 'Configuración guardada exitosamente'
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
      'INSERT INTO unidades (titulo, materia_id, numero_unidad, descripcion) VALUES (?, ?, ?, ?)',
      [titulo.trim(), materiaId, num, descripcion || null]
    );

    if (limitePreguntas !== undefined) {
      const val = limitePreguntas === 'all' ? 'all' : String(parseInt(limitePreguntas, 10) || 10);
      await setConfig(`quiz_limit_unit_${result.insertId}`, val);
    }

    res.status(201).json({
      id: result.insertId,
      titulo,
      materiaId,
      numeroUnidad: num,
      limitePreguntas: limitePreguntas || 10,
      message: 'Unidad creada exitosamente'
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
    let sql = 'SELECT id, unidad_id AS unidadId, titulo, tipo, url FROM recursos';
    const params = [];

    if (unidadId) {
      sql += ' WHERE unidad_id = ?';
      params.push(unidadId);
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
      'INSERT INTO recursos (titulo, tipo, url, unidad_id) VALUES (?, ?, ?, ?)',
      [titulo.trim(), finalTipo, url.trim(), unidadId]
    );

    res.status(201).json({
      id: result.insertId,
      titulo,
      tipo: finalTipo,
      url,
      unidadId,
      message: 'Recurso creado exitosamente'
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
      params.push(unidadId);
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

    // 1. Insertar pregunta
    const [resultPregunta] = await connection.execute(
      'INSERT INTO preguntas (unidad_id, tipo, pregunta, imagen, categoria) VALUES (?, ?, ?, ?, ?)',
      [unidadId, finalTipo, cleanPregunta, imagen || null, finalCategoria]
    );

    const preguntaId = resultPregunta.insertId;

    // 2. Insertar opciones
    const validOptions = (opciones || []).map(o => String(o).trim()).filter(o => o.length > 0);
    const targetCorrect = (correcta || validOptions[0] || '').trim().toLowerCase();

    let orden = 1;
    for (const opt of validOptions) {
      const esCorrecta = opt.toLowerCase() === targetCorrect ? 1 : 0;
      await connection.execute(
        'INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES (?, ?, ?, ?)',
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
      message: 'Pregunta guardada exitosamente en MariaDB'
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
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId || null, unidadId, puntajeObtenido, totalPreguntas, pct, color, categoriaDebil || null]
    );

    res.status(201).json({
      id: result.insertId,
      desempeno: color,
      porcentaje: pct,
      message: 'Intento registrado exitosamente en MariaDB'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar intento', details: error.message });
  }
});

app.get('/api/intentos', async (req, res) => {
  try {
    const { unidadId } = req.query;
    let sql = 'SELECT * FROM vw_desempeno_estudiantes';
    const params = [];

    const rows = await query(sql, params);
    res.json(rows);
  } catch (error) {
    // Si la vista no existe, consultar directo la tabla
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
  console.log(`📁 MariaDB Config:     ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log('============================================================\n');
});
