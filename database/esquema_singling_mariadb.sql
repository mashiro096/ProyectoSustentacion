-- ==============================================================================
-- SISTEMA DE GESTIÓN EDUCATIVA SINGLING
-- Plataforma Educativa Interactiva de Inglés con Evaluación Adaptativa
-- Esquema de Base de Datos Relacional para MySQL / MariaDB (InnoDB, UTF8mb4)
-- Generado para Sustentación Académica de Grado
-- ==============================================================================

-- 1. CREACIÓN Y SELECCIÓN DE BASE DE DATOS
DROP DATABASE IF EXISTS singling_db;
CREATE DATABASE singling_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE singling_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 2. TABLA: grados
-- Descripción: Almacena los 7 niveles oficiales de Educación General Básica (EGB).
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS grados;
CREATE TABLE grados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE COMMENT 'Identificador de nivel (1, 2, ..., 7)',
  nombre VARCHAR(100) NOT NULL COMMENT 'Ej: 6to de Básica',
  subnivel VARCHAR(100) NOT NULL COMMENT 'Preparatoria, Básica Elemental, Básica Media',
  orden INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABLA: usuarios
-- Descripción: Docentes, estudiantes y administradores de la plataforma.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL COMMENT 'Contraseña encriptada (bcrypt / sha256)',
  rol ENUM('administrador', 'docente', 'estudiante') NOT NULL DEFAULT 'estudiante',
  grado_id INT NULL COMMENT 'Grado en el que se encuentra si es estudiante',
  estado ENUM('activo', 'inactivo') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_grado FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABLA: materias
-- Descripción: Materias curriculares asociadas a un grado específico.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS materias;
CREATE TABLE materias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grado_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL COMMENT 'Ej: Inglés, Matemáticas, etc.',
  descripcion VARCHAR(255) NULL,
  docente_id INT NULL COMMENT 'Docente asignado a la materia',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_materias_grado FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE CASCADE,
  CONSTRAINT fk_materias_docente FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABLA: unidades
-- Descripción: Unidades temáticas o módulos de aprendizaje dentro de cada materia.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS unidades;
CREATE TABLE unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  materia_id INT NOT NULL,
  numero_unidad INT NOT NULL DEFAULT 1,
  titulo VARCHAR(200) NOT NULL COMMENT 'Ej: Unit 1: Countries around the world',
  descripcion TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_unidades_materia FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABLA: recursos
-- Descripción: Material didáctico (PDFs y videos) enlazados a Google Drive / Web.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS recursos;
CREATE TABLE recursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  tipo ENUM('pdf', 'video') NOT NULL,
  url TEXT NOT NULL COMMENT 'Enlace directo o Google Drive convertido',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recursos_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABLA: preguntas
-- Descripción: Banco de ítems evaluativos (Selección Múltiple y Drag & Drop).
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS preguntas;
CREATE TABLE preguntas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  tipo ENUM('multiple', 'fill') NOT NULL DEFAULT 'multiple' COMMENT 'multiple: selección múltiple, fill: completar con bloques/drag-and-drop',
  pregunta TEXT NOT NULL COMMENT 'Enunciado. Para tipo fill contiene ______ donde se inserta el bloque',
  imagen VARCHAR(500) NULL COMMENT 'Ruta relativa local o enlace web',
  categoria TINYINT NOT NULL DEFAULT 1 COMMENT '1: Capitales, 2: Países/Continentes, 3: Comparativos y Gramática',
  puntos INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_preguntas_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABLA: opciones_pregunta
-- Descripción: Opciones de respuesta para cada pregunta, marcando la correcta.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS opciones_pregunta;
CREATE TABLE opciones_pregunta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pregunta_id INT NOT NULL,
  texto_opcion VARCHAR(255) NOT NULL,
  es_correcta TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 si es la respuesta correcta, 0 si es distractor',
  orden TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_opciones_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABLA: intentos_evaluacion
-- Descripción: Registro histórico de cada evaluación rendida por un estudiante.
-- Almacena los resultados del semáforo adaptativo (verde, amarillo, rojo).
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS intentos_evaluacion;
CREATE TABLE intentos_evaluacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL COMMENT 'Estudiante que realizó la prueba',
  unidad_id INT NOT NULL,
  puntaje_obtenido INT NOT NULL,
  total_preguntas INT NOT NULL,
  porcentaje DECIMAL(5,2) NOT NULL,
  desempeno ENUM('verde', 'amarillo', 'rojo') NOT NULL COMMENT 'verde >= 80%, amarillo 50-79%, rojo < 50%',
  categoria_debil TINYINT NULL COMMENT 'Categoría que requirió refuerzo adaptativo en el algoritmo',
  fecha_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_intentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_intentos_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABLA: respuestas_intento
-- Descripción: Detalle de las respuestas específicas seleccionadas en un intento.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS respuestas_intento;
CREATE TABLE respuestas_intento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  intento_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  opcion_seleccionada_id INT NULL,
  texto_respuesta VARCHAR(255) NULL,
  es_correcta TINYINT(1) NOT NULL,
  CONSTRAINT fk_respuestas_intento FOREIGN KEY (intento_id) REFERENCES intentos_evaluacion(id) ON DELETE CASCADE,
  CONSTRAINT fk_respuestas_pregunta FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE,
  CONSTRAINT fk_respuestas_opcion FOREIGN KEY (opcion_seleccionada_id) REFERENCES opciones_pregunta(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 11. ÍNDICES DE OPTIMIZACIÓN
-- ==============================================================================
CREATE INDEX idx_materias_grado ON materias(grado_id);
CREATE INDEX idx_unidades_materia ON unidades(materia_id);
CREATE INDEX idx_recursos_unidad ON recursos(unidad_id);
CREATE INDEX idx_preguntas_unidad ON preguntas(unidad_id);
CREATE INDEX idx_preguntas_categoria ON preguntas(categoria);
CREATE INDEX idx_opciones_pregunta ON opciones_pregunta(pregunta_id);
CREATE INDEX idx_intentos_usuario ON intentos_evaluacion(usuario_id);
CREATE INDEX idx_intentos_unidad ON intentos_evaluacion(unidad_id);

-- ==============================================================================
-- 12. VISTAS ANALÍTICAS PARA REPORTES Y SUSTENTACIÓN
-- ==============================================================================

-- Vista 1: Resumen curricular consolidado (Grados, Materias, Unidades y Contadores)
CREATE OR REPLACE VIEW vw_resumen_curricular AS
SELECT 
    g.nombre AS grado,
    g.subnivel,
    m.id AS materia_id,
    m.nombre AS materia,
    u.id AS unidad_id,
    u.numero_unidad,
    u.titulo AS unidad_titulo,
    (SELECT COUNT(*) FROM recursos r WHERE r.unidad_id = u.id) AS total_recursos,
    (SELECT COUNT(*) FROM preguntas p WHERE p.unidad_id = u.id) AS total_preguntas
FROM grados g
JOIN materias m ON m.grado_id = g.id
JOIN unidades u ON u.materia_id = m.id
ORDER BY g.orden ASC, u.numero_unidad ASC;

-- Vista 2: Banco de preguntas con su respuesta correcta asociada
CREATE OR REPLACE VIEW vw_banco_preguntas AS
SELECT 
    p.id AS pregunta_id,
    u.titulo AS unidad,
    p.tipo,
    p.categoria,
    p.pregunta,
    p.imagen,
    o.texto_opcion AS respuesta_correcta
FROM preguntas p
JOIN unidades u ON p.unidad_id = u.id
JOIN opciones_pregunta o ON o.pregunta_id = p.id AND o.es_correcta = 1;

-- Vista 3: Métricas de desempeño estudiantil (Semáforo Inteligente)
CREATE OR REPLACE VIEW vw_desempeno_estudiantes AS
SELECT 
    i.id AS intento_id,
    COALESCE(u.nombre_completo, 'Estudiante Anónimo') AS estudiante,
    uni.titulo AS unidad,
    i.puntaje_obtenido,
    i.total_preguntas,
    i.porcentaje,
    i.desempeno AS semaforo,
    CASE 
        WHEN i.categoria_debil = 1 THEN 'Capitales del Mundo'
        WHEN i.categoria_debil = 2 THEN 'Identificación de Países y Continentes'
        WHEN i.categoria_debil = 3 THEN 'Comparativos y Estructura Gramatical'
        ELSE 'Sin debilidad crítica'
    END AS refuerzo_aplicado,
    i.fecha_intento
FROM intentos_evaluacion i
LEFT JOIN usuarios u ON i.usuario_id = u.id
JOIN unidades uni ON i.unidad_id = uni.id
ORDER BY i.fecha_intento DESC;

-- ==============================================================================
-- 13. DATOS SEMILLA (SEED DATA) OFICIALES DEL PROYECTO
-- ==============================================================================

-- A. Grados Oficiales EGB
INSERT INTO grados (codigo, nombre, subnivel, orden) VALUES
('1', '1ero de Básica', 'Preparatoria', 1),
('2', '2do de Básica', 'Básica Elemental', 2),
('3', '3ero de Básica', 'Básica Elemental', 3),
('4', '4to de Básica', 'Básica Elemental', 4),
('5', '5to de Básica', 'Básica Media', 5),
('6', '6to de Básica', 'Básica Media', 6),
('7', '7mo de Básica', 'Básica Media', 7);

-- B. Usuarios Iniciales (Administrador, Docente y Estudiante Modelo)
INSERT INTO usuarios (nombre_completo, email, password_hash, rol, grado_id, estado) VALUES
('Administrador SingLing', 'admin@singling.edu.ec', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'administrador', NULL, 'activo'),
('Profesor de Inglés', 'docente@singling.edu.ec', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'docente', NULL, 'activo'),
('Estudiante Demo', 'estudiante@singling.edu.ec', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'estudiante', 6, 'activo');

-- C. Materia Principal para 6to de Básica
INSERT INTO materias (id, grado_id, nombre, descripcion, docente_id) VALUES
(1, 6, 'Inglés', 'Currículo Nacional de Inglés para 6to Grado EGB - Nivel A1/A2', 2);

-- D. Unidades Didácticas
INSERT INTO unidades (id, materia_id, numero_unidad, titulo, descripcion) VALUES
(1, 1, 1, 'Unit 1: Countries around the world', 'Capitals, continents and comparative adjectives for 6th grade.'),
(2, 1, 2, 'Unit 2: Daily Routines and Hobbies', 'Present simple, daily actions and leisure activities.');

-- E. Recursos Didácticos de Ejemplo
INSERT INTO recursos (unidad_id, titulo, tipo, url) VALUES
(1, 'World Map & Countries Guide (PDF)', 'pdf', 'https://drive.google.com/uc?export=view&id=sample_countries_guide'),
(1, 'Video Tutorial: Comparative Adjectives in English', 'video', 'https://www.youtube.com/watch?v=sample_comparatives');

-- F. Banco Pedagógico Oficial de la Unidad 1 (24 Preguntas y Desafíos del Código)

-- ---- CATEGORÍA 1: CAPITALES DEL MUNDO (Selección Múltiple) ----
-- 1. Canada
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (1, 1, 'multiple', 'What’s the capital of Canada?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(1, 'Ottawa', 1, 1), (1, 'Toronto', 0, 2), (1, 'Vancouver', 0, 3);

-- 2. Brazil
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (2, 1, 'multiple', 'What’s the capital of Brazil?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(2, 'Brasilia', 1, 1), (2, 'Rio de Janeiro', 0, 2), (2, 'Sao Paulo', 0, 3);

-- 3. Australia
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (3, 1, 'multiple', 'What’s the capital of Australia?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(3, 'Canberra', 1, 1), (3, 'Sydney', 0, 2), (3, 'Melbourne', 0, 3);

-- 4. China
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (4, 1, 'multiple', 'What’s the capital of China?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(4, 'Beijing', 1, 1), (4, 'Shanghai', 0, 2), (4, 'Hong Kong', 0, 3);

-- 5. Ecuador
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (5, 1, 'multiple', 'What’s the capital of Ecuador?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(5, 'Quito', 1, 1), (5, 'Guayaquil', 0, 2), (5, 'Cuenca', 0, 3);

-- 6. Argentina
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (6, 1, 'multiple', 'What’s the capital of Argentina?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(6, 'Buenos Aires', 1, 1), (6, 'Cordoba', 0, 2), (6, 'Rosario', 0, 3);

-- 7. Japan
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (7, 1, 'multiple', 'What’s the capital of Japan?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(7, 'Tokyo', 1, 1), (7, 'Osaka', 0, 2), (7, 'Kyoto', 0, 3);

-- 8. Spain
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (8, 1, 'multiple', 'What’s the capital of Spain?', 'img/6unidad/unit1/mapamundi.jpg', 1, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(8, 'Madrid', 1, 1), (8, 'Barcelona', 0, 2), (8, 'Sevilla', 0, 3);

-- ---- CATEGORÍA 2: PAÍSES Y UBICACIÓN GEOGRÁFICA (Selección Múltiple) ----
-- 9. Canada Flag
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (9, 1, 'multiple', 'What country is this?', 'img/6unidad/unit1/canada.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(9, 'Canada', 1, 1), (9, 'USA', 0, 2), (9, 'Spain', 0, 3);

-- 10. Where is Chile?
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (10, 1, 'multiple', 'Where is Chile?', 'img/6unidad/unit1/mapamundi.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(10, 'South America', 1, 1), (10, 'North America', 0, 2), (10, 'Europe', 0, 3);

-- 11. Egypt Flag
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (11, 1, 'multiple', 'What country is this?', 'img/6unidad/unit1/egipto.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(11, 'Egypt', 1, 1), (11, 'Australia', 0, 2), (11, 'China', 0, 3);

-- 12. Where is Spain?
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (12, 1, 'multiple', 'Where is Spain?', 'img/6unidad/unit1/mapamundi.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(12, 'Europe', 1, 1), (12, 'Africa', 0, 2), (12, 'Asia', 0, 3);

-- 13. USA Flag
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (13, 1, 'multiple', 'What country is this?', 'img/6unidad/unit1/estados.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(13, 'USA', 1, 1), (13, 'Canada', 0, 2), (13, 'Mexico', 0, 3);

-- 14. Where is China?
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (14, 1, 'multiple', 'Where is China?', 'img/6unidad/unit1/mapamundi.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(14, 'Asia', 1, 1), (14, 'Europe', 0, 2), (14, 'Africa', 0, 3);

-- 15. Brazil Flag
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (15, 1, 'multiple', 'What country is this?', 'img/6unidad/unit1/brasil.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(15, 'Brazil', 1, 1), (15, 'Argentina', 0, 2), (15, 'Chile', 0, 3);

-- 16. Where is Australia?
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (16, 1, 'multiple', 'Where is Australia?', 'img/6unidad/unit1/mapamundi.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(16, 'Asia', 1, 1), (16, 'Africa', 0, 2), (16, 'South America', 0, 3);

-- 17. Mexico Flag
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (17, 1, 'multiple', 'What country is this?', 'img/6unidad/unit1/mexico.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(17, 'Mexico', 1, 1), (17, 'USA', 0, 2), (17, 'Ecuador', 0, 3);

-- 18. Where is Japan?
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (18, 1, 'multiple', 'Where is Japan?', 'img/6unidad/unit1/mapamundi.jpg', 2, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(18, 'Asia', 1, 1), (18, 'Europe', 0, 2), (18, 'Africa', 0, 3);

-- ---- CATEGORÍA 3: COMPARATIVOS Y GRAMÁTICA (Completar Frase / Drag & Drop) ----
-- 19. Argentina vs Brazil
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (19, 1, 'fill', 'Argentina is ______ than Brazil.', 'img/6unidad/unit1/comparar1.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(19, 'smaller', 1, 1), (19, 'bigger', 0, 2), (19, 'longer', 0, 3), (19, 'tallest', 0, 4);

-- 20. Canada superlative
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (20, 1, 'fill', 'Canada is the ______ country of all.', 'img/6unidad/unit1/comparar2.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(20, 'biggest', 1, 1), (20, 'smallest', 0, 2), (20, 'longer', 0, 3), (20, 'big', 0, 4);

-- 21. Egypt vs Australia
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (21, 1, 'fill', 'Egypt is ______ than Australia.', 'img/6unidad/unit1/comparar3.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(21, 'smaller', 1, 1), (21, 'bigger', 0, 2), (21, 'fastest', 0, 3), (21, 'long', 0, 4);

-- 22. USA
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (22, 1, 'fill', 'USA is ______', 'img/6unidad/unit1/comparar4.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(22, 'big.', 1, 1), (22, 'smaller', 0, 2), (22, 'longer', 0, 3), (22, 'biggest.', 0, 4);

-- 23. Ecuador superlative
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (23, 1, 'fill', 'Ecuador is the ______ country of all.', 'img/6unidad/unit1/comparar5.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(23, 'smallest', 1, 1), (23, 'biggest', 0, 2), (23, 'longer', 0, 3), (23, 'big.', 0, 4);

-- 24. Chile
INSERT INTO preguntas (id, unidad_id, tipo, pregunta, imagen, categoria, puntos) 
VALUES (24, 1, 'fill', 'Chile is ______.', 'img/6unidad/unit1/comparar6.jpg', 3, 1);
INSERT INTO opciones_pregunta (pregunta_id, texto_opcion, es_correcta, orden) VALUES
(24, 'long.', 1, 1), (24, 'bigger', 0, 2), (24, 'fastest', 0, 3), (24, 'small', 0, 4);

-- G. Intento Evaluativo Modelo (Para demostración del Semáforo Adaptativo)
INSERT INTO intentos_evaluacion (id, usuario_id, unidad_id, puntaje_obtenido, total_preguntas, porcentaje, desempeno, categoria_debil)
VALUES (1, 3, 1, 8, 9, 88.89, 'verde', NULL);

-- Fin del script SQL
