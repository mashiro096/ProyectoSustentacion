// ==============================================================================
// SCRIPT DE PRUEBA Y DIAGNÓSTICO DE CONEXIÓN A MARIADB / MYSQL
// SingLing - Plataforma Educativa Interactiva
// ==============================================================================

import { testConnection, query, dbConfig } from './db.js';

async function runDiagnostic() {
  console.log('\n============================================================');
  console.log('🔍 PRUEBA DE CONEXIÓN A BASE DE DATOS (MARIADB / MYSQL)');
  console.log('============================================================');
  console.log(`📌 Host:        ${dbConfig.host}`);
  console.log(`📌 Puerto:      ${dbConfig.port}`);
  console.log(`📌 Usuario:     ${dbConfig.user}`);
  console.log(`📌 Base Datos:  ${dbConfig.database}`);
  console.log(`📌 Password:    ${dbConfig.password ? '******** (definida)' : '(vacía)'}`);
  console.log('------------------------------------------------------------');
  console.log('⏳ Intentando conectar con el servidor...');

  const result = await testConnection();

  if (!result.success) {
    console.log('\n❌ ERROR AL CONECTAR:');
    console.log(`   Código:     ${result.code || 'N/A'}`);
    console.log(`   Mensaje:    ${result.error}`);
    console.log(`\n💡 DIAGNÓSTICO:`);
    console.log(`   ${result.diagnosis}`);
    console.log(`\n🔧 SOLUCIÓN:`);
    console.log(`   ${result.tip}`);
    console.log('============================================================\n');
    process.exit(1);
  }

  console.log('\n✅ ¡CONEXIÓN EXITOSA!');
  console.log(`   Versión Servidor: ${result.version}`);
  console.log(`   Base de Datos:    ${result.database}`);
  console.log('------------------------------------------------------------');
  console.log('📊 VERIFICANDO TABLAS Y DATOS DEL ESQUEMA SINGLING:');

  try {
    const tables = [
      'grados',
      'usuarios',
      'materias',
      'unidades',
      'recursos',
      'preguntas',
      'opciones_pregunta',
      'intentos_evaluacion',
      'configuraciones_sistema'
    ];

    for (const table of tables) {
      try {
        const rows = await query(`SELECT COUNT(*) AS total FROM ${table}`);
        console.log(`   ✔ Tabla '${table}': ${rows[0].total} registros`);
      } catch (err) {
        console.log(`   ❌ Tabla '${table}': no encontrada o con error (${err.message})`);
      }
    }

    console.log('------------------------------------------------------------');
    console.log('🎉 Todo está listo. Ya puedes iniciar tu plataforma con:');
    console.log('   npm start');
    console.log('============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Error al consultar tablas:', err.message);
    process.exit(1);
  }
}

runDiagnostic();
