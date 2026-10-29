// Migra instalaciones existentes para que el avance sea individual por navegador.
import { query, pool } from '../db.js';

try {
  await query('ALTER TABLE progreso_estudiante ADD COLUMN IF NOT EXISTS perfil_id VARCHAR(80)');
  await query('CREATE UNIQUE INDEX IF NOT EXISTS idx_progreso_perfil_unidad ON progreso_estudiante(perfil_id, unidad_id) WHERE perfil_id IS NOT NULL');
  console.log('✓ Progreso individual preparado correctamente.');
} catch (error) {
  console.error('No se pudo preparar el progreso individual:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
