// ==============================================================================
// GESTOR DE CONEXIÓN A POSTGRESQL CON POOLING Y COMPATIBILIDAD
// SingLing - Plataforma Educativa Interactiva de Inglés
// ==============================================================================

import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

const { Pool, types } = pg;

// Parsear tipos int8 (BIGINT de COUNT(*)) como enteros de JavaScript
types.setTypeParser(20, (val) => parseInt(val, 10));

// ==============================================================================
// PARSEO Y RESOLUCIÓN DE CONFIGURACIÓN DE BASE DE DATOS
// ==============================================================================
const parseDatabaseConfig = () => {
  const envUrl = process.env.DATABASE_URL;
  let host = process.env.DB_HOST || '38.146.27.217';
  let port = parseInt(process.env.DB_PORT || '5432', 10);
  let user = process.env.DB_USER || 'singling_app';
  let password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
  let database = process.env.DB_NAME || 'singling_db';
  let connectionString = null;

  if (envUrl && envUrl.trim().length > 0) {
    try {
      // Normalizar url
      const parsed = new URL(envUrl);
      host = parsed.hostname || host;
      port = parsed.port ? parseInt(parsed.port, 10) : port;
      user = decodeURIComponent(parsed.username || user);
      // Si la URL no contiene la palabra clave 'contraseña' genérica, usarla
      const urlPass = decodeURIComponent(parsed.password || '');
      if (urlPass && urlPass !== 'contraseña') {
        password = urlPass;
      }
      database = (parsed.pathname ? parsed.pathname.replace(/^\//, '') : database) || database;
      connectionString = envUrl;
    } catch (e) {
      // Si no es URL válida completa, usar variables individuales
    }
  }

  const ssl =
    process.env.DB_SSL === 'true' || process.env.DB_SSL === 'require'
      ? { rejectUnauthorized: false }
      : false;

  return {
    host,
    port,
    user,
    password,
    database,
    connectionString,
    ssl,
    max: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
};

export const dbConfig = parseDatabaseConfig();

// Configuración para el Pool de Postgres
const poolConfig = {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  max: dbConfig.max,
  ssl: dbConfig.ssl,
  idleTimeoutMillis: dbConfig.idleTimeoutMillis,
  connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
};

// Crear Pool de conexiones de PostgreSQL
export const pool = new Pool(poolConfig);

// Evento de error inesperado en clientes ociosos del pool
pool.on('error', (err) => {
  console.error('⚠️ Error inesperado en el cliente inactivo de PostgreSQL:', err.message);
});

// Helper para convertir marcadores '?' estilo MySQL a '$1, $2, ...' estilo PostgreSQL
export function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Identificador anónimo persistente del alumno. No contiene datos personales y
// permite separar el progreso cuando la plataforma se usa sin inicio de sesión.
export function normalizeStudentId(value) {
  const studentId = String(value || '').trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(studentId) ? studentId : null;
}

// ==============================================================================
// FUNCIÓN UNIVERSAL DE CONSULTA (query)
// Compatible con consultas directas, arrays de filas y .insertId
// ==============================================================================
export async function query(sql, params = []) {
  try {
    const finalSql = convertPlaceholders(sql);
    const result = await pool.query(finalSql, params);

    // En PostgreSQL las filas están en result.rows
    const rows = result.rows || [];

    // Asignar propiedades de compatibilidad para código que espera insertId o affectedRows
    if (rows.length > 0 && rows[0].id !== undefined) {
      rows.insertId = rows[0].id;
    }
    rows.affectedRows = result.rowCount || 0;
    rows.rowCount = result.rowCount || 0;

    return rows;
  } catch (error) {
    console.error('❌ Error ejecutando consulta SQL en PostgreSQL:', error.message);
    console.error('   SQL:', sql);
    console.error('   Parámetros:', params);
    throw error;
  }
}

// ==============================================================================
// GESTOR DE TRANSACCIONES / CONEXIÓN INDIVIDUAL
// Emula compatibilidad con pool.getConnection() y [result] = execute()
// ==============================================================================
export async function getConnection() {
  const client = await pool.connect();

  // Envolver execute para compatibilidad
  client.execute = async (sql, params = []) => {
    const finalSql = convertPlaceholders(sql);
    const result = await client.query(finalSql, params);
    const rows = result.rows || [];
    if (rows.length > 0 && rows[0].id !== undefined) {
      rows.insertId = rows[0].id;
    }
    rows.affectedRows = result.rowCount || 0;
    rows.rowCount = result.rowCount || 0;
    return [rows, result.fields];
  };

  client.beginTransaction = async () => client.query('BEGIN');
  client.commit = async () => client.query('COMMIT');
  client.rollback = async () => client.query('ROLLBACK');

  return client;
}

// Asignar getConnection a pool para compatibilidad transparente
pool.getConnection = getConnection;

// ==============================================================================
// FUNCIÓN DE DIAGNÓSTICO Y PRUEBA DE CONEXIÓN
// ==============================================================================
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT 1 + 1 AS test, current_database() as current_db, version() as version'
    );
    client.release();

    const row = result.rows[0];

    return {
      success: true,
      motor: 'PostgreSQL',
      message: 'Conexión exitosa a PostgreSQL',
      database: row.current_db,
      version: row.version,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
        ssl: Boolean(dbConfig.ssl)
      }
    };
  } catch (error) {
    let diagnosis = 'Error de conexión desconocido.';
    let tip = 'Revisa los parámetros en tu archivo .env o tu cadena de conexión.';

    if (error.code === 'ECONNREFUSED') {
      diagnosis = `No se pudo conectar a ${dbConfig.host}:${dbConfig.port}. El servicio PostgreSQL no está en línea o el puerto 5432 está bloqueado.`;
      tip = 'Verifica que el servicio PostgreSQL esté iniciado en el servidor remoto o local.';
    } else if (error.code === '28P01') {
      diagnosis = `Acceso denegado para el usuario '${dbConfig.user}'. Contraseña incorrecta.`;
      tip = 'Reemplaza la contraseña en DATABASE_URL o en DB_PASSWORD dentro del archivo .env por la contraseña real de tu base de datos.';
    } else if (error.code === '3D000') {
      diagnosis = `La base de datos '${dbConfig.database}' no existe en el servidor PostgreSQL.`;
      tip = 'Ejecuta el script "database/esquema_singling_postgresql.sql" en tu servidor para crear la estructura.';
    } else if (error.code === '28000' || (error.message && error.message.includes('pg_hba.conf'))) {
      const clientIp = error.message.match(/host "([^"]+)"/)?.[1];
      diagnosis = `El servidor PostgreSQL en ${dbConfig.host} no tiene una regla en 'pg_hba.conf' que autorice conexiones remotas desde tu IP (${clientIp || 'actual'}) para el usuario '${dbConfig.user}'.`;
      tip = `En el servidor PostgreSQL, edita el archivo 'pg_hba.conf' y añade:\n   host  ${dbConfig.database}  ${dbConfig.user}  0.0.0.0/0  scram-sha-256\n   (o md5 según el método de autenticación del usuario), y recarga con 'SELECT pg_reload_conf();'`;
    } else if (error.code === 'ETIMEDOUT') {
      diagnosis = `Tiempo de espera agotado al conectar a ${dbConfig.host}:${dbConfig.port}.`;
      tip = 'Comprueba tu conexión a Internet y que el firewall permita tráfico por el puerto 5432.';
    }

    return {
      success: false,
      motor: 'PostgreSQL',
      error: error.message,
      code: error.code || 'UNKNOWN',
      diagnosis,
      tip,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    };
  }
}

export default {
  pool,
  query,
  getConnection,
  testConnection,
  convertPlaceholders,
  normalizeStudentId,
  dbConfig
};
