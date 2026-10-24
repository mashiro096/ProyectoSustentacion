// ==============================================================================
// GESTOR DE CONEXIÓN A MARIADB / MYSQL CON POOLING Y PROMESAS
// SingLing - Plataforma Educativa Interactiva
// ==============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'singling_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  charset: 'utf8mb4'
};

// Crear Pool de Conexiones
export const pool = mysql.createPool(dbConfig);

// Helper para ejecutar consultas preparadas
export async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Error ejecutando consulta SQL:', error.message);
    console.error('   SQL:', sql);
    console.error('   Parámetros:', params);
    throw error;
  }
}

// Función de diagnóstico para probar la conexión
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS test, DATABASE() as current_db, VERSION() as version');
    connection.release();

    return {
      success: true,
      message: 'Conexión exitosa a MariaDB / MySQL',
      database: rows[0].current_db,
      version: rows[0].version,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
      }
    };
  } catch (error) {
    let diagnosis = 'Error de conexión desconocido.';
    let tip = 'Revisa los parámetros en tu archivo .env.';

    if (error.code === 'ECONNREFUSED') {
      diagnosis = `No se pudo conectar a ${dbConfig.host}:${dbConfig.port}. El servicio MariaDB / MySQL no está iniciado.`;
      tip = 'Inicia tu servidor MySQL/MariaDB (desde XAMPP, Laragon, WampServer o la ventana de Servicios de Windows).';
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      diagnosis = `Acceso denegado para el usuario '${dbConfig.user}'. Contraseña incorrecta o permisos insuficientes.`;
      tip = 'Verifica el usuario y la contraseña en tu archivo .env.';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      diagnosis = `La base de datos '${dbConfig.database}' no existe en el servidor.`;
      tip = 'Importa el archivo "database/esquema_singling_mariadb.sql" en tu cliente MySQL (phpMyAdmin, HeidiSQL, DBeaver, Workbench).';
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
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
  testConnection,
  dbConfig
};
