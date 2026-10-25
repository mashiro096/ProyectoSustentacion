# 🎓 SingLing - Plataforma Educativa Interactiva de Inglés con Evaluación Adaptativa

> **Proyecto de Sustentación Académica**  
> **Directorio Centralizado:** `C:\Users\LENOVO\Documents\ProyectoSustentacion`

---

## 📌 1. Resumen Ejecutivo del Proyecto

**SingLing** (anteriormente conocido durante el prototipado como *SinLing* / *empi* / *Appe*) es una aplicación web educativa interactiva desarrollada para optimizar el proceso de enseñanza-aprendizaje del idioma inglés en los niveles de Educación General Básica (con énfasis curricular en 6to Grado).

El sistema integra dos entornos complementarios:
1. **Portal del Estudiante (`index.html`)**: Interfaz móvil/web orientada al alumno que permite explorar grados, materias y unidades, acceder a recursos multimedia (PDFs y videos explicativos) y poner a prueba sus conocimientos a través de un **motor de evaluación interactivo y adaptativo** (preguntas de opción múltiple y ejercicios tipo *drag & drop* con completado de frases).
2. **Panel del Docente / Administrador (`admin.html`)**: Módulo administrativo en tiempo real para que los profesores gestionen materias, unidades temáticas, enlaces didácticos de Google Drive y el banco de preguntas/desafíos evaluativos.

Ambos módulos se encuentran sincronizados en la nube mediante **Google Firebase Firestore**.

---

## 🏗️ 2. Arquitectura del Proyecto

```
C:\Users\LENOVO\Documents\ProyectoSustentacion\
├── index.html                 # Vista del Estudiante (Navegación + Motor de Quiz Adaptativo)
├── admin.html                 # Vista del Docente / Administrador (Gestión Curricular en tiempo real)
├── js/
│   ├── firebase-config.js     # Configuración centralizada de Firebase y utilidades compartidas
│   ├── student.js             # Lógica del estudiante, consumo de Firestore y evaluación interactiva
│   └── admin.js               # Lógica administrativa, creación de materias/unidades/recursos/retos
├── img/                       # Banco de recursos gráficos del proyecto (27 imágenes)
│   ├── logo.png               # Logotipo institucional
│   ├── bienvenido.png         # Ilustración de onboarding
│   ├── grado6.jpg             # Portada de nivel académico
│   └── 6unidad/               # Mapas, banderas, comparativos y material de apoyo
│       ├── unit1/             # Banderas e imágenes de ejercicios (Argentina, Canadá, etc.)
│       └── ...
└── README.md                  # Documentación técnica para la defensa / sustentación
```

---

## 🗄️ 3. Estructura de la Base de Datos (Cloud Firestore)

El proyecto utiliza una base de datos NoSQL documental estructurada con relaciones lógicas por identificadores:

```mermaid
erDiagram
    GRADOS ||--o{ MATERIAS : "gradoId (1 al 7)"
    MATERIAS ||--o{ UNIDADES : "materiaId"
    UNIDADES ||--o{ RECURSOS : "unidadId"
    UNIDADES ||--o{ PREGUNTAS : "unidadId"

    MATERIAS {
        string id PK
        string nombre "Ej: Inglés"
        string gradoId "1, 2, ..., 6, 7"
        timestamp createdAt
    }
    UNIDADES {
        string id PK
        string titulo "Ej: Unit 1: Countries around the world"
        string materiaId FK
        timestamp createdAt
    }
    RECURSOS {
        string id PK
        string titulo "Ej: Guía de Países"
        string url "Enlace directo / Drive"
        string tipo "pdf | video"
        string unidadId FK
    }
    PREGUNTAS {
        string id PK
        string pregunta "Enunciado o frase con [box]"
        string tipo "multiple | fill"
        string imagen "Ruta o link a imagen"
        array opciones "Lista de respuestas posibles"
        string correcta "Opción que valida el acierto"
        string unidadId FK
    }
```

---

## 🧠 4. Motor de Evaluación Automático (Cloud Firestore)

A diferencia de los prototipos iniciales que contenían bancos de preguntas estáticos manuales, la versión definitiva implementa un **motor 100% automático**:

1. **Carga en Tiempo Real desde Firestore**:
   - Al seleccionar una unidad, el sistema consulta dinámicamente la colección `preguntas` filtrando por `unidadId`.
   - Si la unidad está vacía (sin preguntas en la base de datos), el sistema lo indica limpiamente evitando ejecuciones erróneas.
   - Si existen preguntas en Firestore, el test se genera y calibra automáticamente según la cantidad de preguntas disponibles.

2. **Soporte Dinámico de Tipos de Pregunta**:
   - **Selección Múltiple (`multiple`)**: Muestra el enunciado, imagen opcional y alternativas aleatorias con validación de opción correcta.
   - **Completar con Bloques (`fill` / `drag-and-drop`)**: Convierte automáticamente etiquetas como `[box]` o `______` en campos interactivos donde el alumno inserta palabras clave mediante bloques dinámicos.

3. **Cálculo Automático de Desempeño (Semáforo Inteligente)**:
   - Al finalizar, el sistema computa el porcentaje de aciertos en tiempo real:
     - 🟢 **Verde**: Dominio del tema (80% o más de aciertos).
     - 🟡 **Amarillo**: Requiere práctica moderada (entre 50% y 79%).
     - 🔴 **Rojo**: Refuerzo necesario (menos del 50%).
   - Actualiza el indicador visual (`status-dot`) en la tarjeta de la unidad de forma instantánea.

---

## 🚀 5. Cómo Ejecutar el Proyecto con PostgreSQL

### Paso 1: Configurar Variables de Entorno (`.env`)
Abre el archivo [`.env`](file:///c:/Users/LENOVO/Documents/ProyectoSustentacion/.env) y coloca la contraseña real en la cadena de conexión o parámetros individuales:
```ini
PORT=3000

# Cadena de conexión directa a PostgreSQL
DATABASE_URL=postgresql://singling_app:tu_password_real@38.146.27.217:5432/singling_db

# O parámetros desglosados:
DB_HOST=38.146.27.217
DB_PORT=5432
DB_USER=singling_app
DB_PASSWORD=tu_password_real
DB_NAME=singling_db
DB_SSL=false
```

### Paso 2: Importar el Esquema en PostgreSQL (si no está importado)
Importa el archivo [`database/esquema_singling_postgresql.sql`](file:///c:/Users/LENOVO/Documents/ProyectoSustentacion/database/esquema_singling_postgresql.sql) en tu cliente PostgreSQL (DBeaver, pgAdmin, DataGrip o psql):
```bash
psql -h 38.146.27.217 -p 5432 -U singling_app -d singling_db -f database/esquema_singling_postgresql.sql
```

### Paso 3: Probar la Conexión a PostgreSQL
Ejecuta el script de prueba y diagnóstico:
```bash
npm run test:db
```
El script diagnosticará la conexión, validará que las tablas existan y mostrará el conteo de registros en consola.

### Paso 4: Iniciar el Servidor Web
Ejecuta en tu terminal:
```bash
npm start
```

Luego abre en tu navegador:
- 🎓 **Portal del Estudiante:** `http://localhost:3000/index.html`
- 👨‍🏫 **Panel del Docente:** `http://localhost:3000/admin.html`
- 🔍 **Endpoint Diagnóstico DB:** `http://localhost:3000/api/status`

---

## 🎯 6. Guía Rápida para el Guion de Sustentación

1. **Introducción**: Presentar *SingLing* como una respuesta digital interactiva para modernizar la enseñanza del inglés escolar.
2. **Demostración Docente (`admin.html`)**:
   - Mostrar cómo un profesor selecciona 6to Grado, accede a la materia *Inglés* y crea un nuevo recurso o desafío interactivo.
   - Resaltar la función de conversión automática de enlaces de Google Drive.
3. **Demostración Estudiante (`index.html`)**:
   - Mostrar la experiencia del alumno desde la bienvenida fluida hasta la navegación por grados.
   - Abrir los recursos subidos por el profesor.
   - Ejecutar la evaluación interactiva respondiendo preguntas y completando oraciones con bloques dinámicos.
4. **Cierre y Preguntas**: Explicar la arquitectura desacoplada y la capacidad del algoritmo para adaptarse a las necesidades pedagógicas de cada estudiante.
