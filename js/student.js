// Lógica del Portal del Estudiante y Motor de Evaluación Adaptativa
import { 
  db, 
  gradesData, 
  collection, 
  getDocs, 
  query, 
  where 
} from "./firebase-config.js";

// Banco Pedagógico Base (para Unidad 1 de 6to Grado y Respaldo Inteligente)
const defaultQuestionsUnit1 = {
  cat1: [
    { question: "What’s the capital of Canada?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Toronto", "Ottawa", "Vancouver"], correct: "Ottawa", category: 1, type: "multiple" },
    { question: "What’s the capital of Brazil?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Rio de Janeiro", "Brasilia", "Sao Paulo"], correct: "Brasilia", category: 1, type: "multiple" },
    { question: "What’s the capital of Australia?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Sydney", "Canberra", "Melbourne"], correct: "Canberra", category: 1, type: "multiple" },
    { question: "What’s the capital of China?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Shanghai", "Beijing", "Hong Kong"], correct: "Beijing", category: 1, type: "multiple" },
    { question: "What’s the capital of Ecuador?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Guayaquil", "Quito", "Cuenca"], correct: "Quito", category: 1, type: "multiple" },
    { question: "What’s the capital of Argentina?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Buenos Aires", "Cordoba", "Rosario"], correct: "Buenos Aires", category: 1, type: "multiple" },
    { question: "What’s the capital of Japan?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Osaka", "Kyoto", "Tokyo"], correct: "Tokyo", category: 1, type: "multiple" },
    { question: "What’s the capital of Spain?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Barcelona", "Madrid", "Sevilla"], correct: "Madrid", category: 1, type: "multiple" }
  ],
  cat2: [
    { question: "What country is this?", image: "img/6unidad/unit1/canada.jpg", options: ["USA", "Canada", "Spain"], correct: "Canada", category: 2, type: "multiple" },
    { question: "Where is Chile?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["South America", "North America", "Europe"], correct: "South America", category: 2, type: "multiple" },
    { question: "What country is this?", image: "img/6unidad/unit1/egipto.jpg", options: ["Egypt", "Australia", "China"], correct: "Egypt", category: 2, type: "multiple" },
    { question: "Where is Spain?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Africa", "Asia", "Europe"], correct: "Europe", category: 2, type: "multiple" },
    { question: "What country is this?", image: "img/6unidad/unit1/estados.jpg", options: ["USA", "Canada", "Mexico"], correct: "USA", category: 2, type: "multiple" },
    { question: "Where is China?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Asia", "Europe", "Africa"], correct: "Asia", category: 2, type: "multiple" },
    { question: "What country is this?", image: "img/6unidad/unit1/brasil.jpg", options: ["Argentina", "Brazil", "Chile"], correct: "Brazil", category: 2, type: "multiple" },
    { question: "Where is Australia?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Asia", "Africa", "South America"], correct: "Asia", category: 2, type: "multiple" },
    { question: "What country is this?", image: "img/6unidad/unit1/mexico.jpg", options: ["Mexico", "USA", "Ecuador"], correct: "Mexico", category: 2, type: "multiple" },
    { question: "Where is Japan?", image: "img/6unidad/unit1/mapamundi.jpg", options: ["Europe", "Asia", "Africa"], correct: "Asia", category: 2, type: "multiple" }
  ],
  cat3: [
    { question: "Argentina is ______ than Brazil.", image: "img/6unidad/unit1/comparar1.jpg", options: ["smaller", "bigger", "longer", "tallest"], correct: "smaller", category: 3, type: "drag-and-drop" },
    { question: "Canada is the ______ country of all.", image: "img/6unidad/unit1/comparar2.jpg", options: ["smallest", "biggest", "longer", "big"], correct: "biggest", category: 3, type: "drag-and-drop" },
    { question: "Egypt is ______ than Australia.", image: "img/6unidad/unit1/comparar3.jpg", options: ["smaller", "bigger", "fastest", "long"], correct: "smaller", category: 3, type: "drag-and-drop" },
    { question: "USA is ______", image: "img/6unidad/unit1/comparar4.jpg", options: ["smaller", "big.", "longer", "biggest."], correct: "big.", category: 3, type: "drag-and-drop" },
    { question: "Ecuador is the ______ country of all.", image: "img/6unidad/unit1/comparar5.jpg", options: ["smallest", "biggest", "longer", "big."], correct: "smallest", category: 3, type: "drag-and-drop" },
    { question: "Chile is ______.", image: "img/6unidad/unit1/comparar6.jpg", options: ["long.", "bigger", "fastest", "small"], correct: "long.", category: 3, type: "drag-and-drop" }
  ]
};

// Variables de Estado de Navegación
let currentGradeId = null;
let currentGradeName = "";
let currentSubjectId = null;
let currentSubjectName = "";
let currentUnitId = null;
let currentUnitTitle = "";

// Variables del Motor de Quiz
let quizData = [];
let currentQuestionIndex = 0;
let selectedValue = null;
let score = 0;
let wrongAnswersByCategory = { 1: 0, 2: 0, 3: 0 };
let hasTakenTestBefore = false;

// Inicialización de Pantallas
window.addEventListener("DOMContentLoaded", () => {
  setupSplashScreens();
  document.getElementById("btnEmpezar").addEventListener("click", showGrades);
  document.getElementById("btnCheckAnswer").addEventListener("click", handleCheckAnswer);
  document.getElementById("btnExitQuiz").addEventListener("click", exitQuiz);
});

function setupSplashScreens() {
  setTimeout(() => {
    const s1 = document.getElementById("splash1");
    const s2 = document.getElementById("splash2");
    if (s1 && s2) {
      s1.classList.add("opacity-0");
      setTimeout(() => {
        s1.classList.add("hidden");
        s2.classList.remove("hidden");
        setTimeout(() => s2.classList.add("opacity-100"), 50);
      }, 800);
    }
  }, 1400);
}

// Navegación entre Vistas
export function navigate(fromId, toId) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);

  if (fromEl) {
    fromEl.classList.remove("opacity-100");
    fromEl.classList.add("opacity-0");
    setTimeout(() => {
      fromEl.classList.add("hidden");
      if (toEl) {
        toEl.classList.remove("hidden");
        setTimeout(() => toEl.classList.add("opacity-100"), 40);
      }
    }, 300);
  }
}

// Mostrar Grados
export function showGrades() {
  const container = document.getElementById("lista-grados");
  container.innerHTML = "";
  
  gradesData.forEach((g) => {
    const card = document.createElement("div");
    card.className = "p-4 bg-white hover:bg-sky-50 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 cursor-pointer active:scale-98 transition group";
    card.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-[#2470BB] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
          🎓
        </div>
        <div>
          <h3 class="font-bold text-slate-800 text-base">${g.name}</h3>
          <p class="text-xs text-slate-400">${g.desc} • Inglés y Contenidos</p>
        </div>
      </div>
      <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#2470BB] group-hover:text-white transition">
        <i class="fa-solid fa-chevron-right text-xs"></i>
      </div>
    `;
    card.onclick = () => loadSubjects(g.id, g.name);
    container.appendChild(card);
  });

  navigate("splash2", "view-grades");
}

// Cargar Materias desde Firestore
export async function loadSubjects(gradeId, gradeName) {
  currentGradeId = gradeId;
  currentGradeName = gradeName;
  document.getElementById("titulo-grado-materias").innerText = gradeName;
  
  navigate("view-grades", "view-subjects");
  const container = document.getElementById("lista-materias");
  container.innerHTML = `
    <div class="col-span-full py-12 text-center text-slate-400">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2470BB] border-t-transparent mb-3"></div>
      <p class="text-sm">Cargando materias...</p>
    </div>
  `;

  try {
    const q = query(collection(db, "materias"), where("gradoId", "==", gradeId));
    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p class="text-slate-500 font-medium text-sm">No hay materias disponibles para este grado aún.</p>
          <p class="text-xs text-slate-400 mt-1">El docente puede agregarlas desde el Panel Docente.</p>
        </div>
      `;
      return;
    }

    snap.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-sky-300 hover:shadow-md cursor-pointer transition flex flex-col items-center text-center group active:scale-95";
      card.innerHTML = `
        <div class="w-16 h-16 rounded-2xl bg-sky-50 text-[#2470BB] flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition">
          📚
        </div>
        <h4 class="font-bold text-slate-800 text-sm mb-1">${data.nombre}</h4>
        <span class="text-[11px] text-sky-600 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full">Explorar Unidades</span>
      `;
      card.onclick = () => loadUnits(doc.id, data.nombre);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error al cargar materias:", err);
    container.innerHTML = `<p class="col-span-full text-red-500 text-center py-6 text-sm">Error al conectar con la base de datos.</p>`;
  }
}

// Cargar Unidades desde Firestore
export async function loadUnits(subjectId, subjectName) {
  currentSubjectId = subjectId;
  currentSubjectName = subjectName;
  document.getElementById("titulo-materia").innerText = `${currentGradeName} • ${subjectName}`;
  
  navigate("view-subjects", "view-units");
  const container = document.getElementById("lista-unidades");
  container.innerHTML = `
    <div class="py-12 text-center text-slate-400">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-400 border-t-transparent mb-3"></div>
      <p class="text-sm">Cargando unidades...</p>
    </div>
  `;

  try {
    const q = query(collection(db, "unidades"), where("materiaId", "==", subjectId));
    const snap = await getDocs(q);
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p class="text-slate-500 font-medium text-sm">No hay unidades registradas en esta materia.</p>
        </div>
      `;
      return;
    }

    snap.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-sky-300 flex items-center justify-between cursor-pointer active:scale-98 transition group";
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-sky-100 text-[#2470BB] flex items-center justify-center font-bold text-lg">
            📖
          </div>
          <div>
            <h4 class="font-bold text-slate-800 text-base group-hover:text-[#2470BB] transition">${data.titulo}</h4>
            <p class="text-xs text-slate-400 mt-0.5">Recursos educativos y retos prácticos</p>
          </div>
        </div>
        <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#2470BB] group-hover:text-white transition">
          <i class="fa-solid fa-arrow-right text-xs"></i>
        </div>
      `;
      card.onclick = () => openUnit(doc.id, data.titulo);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error al cargar unidades:", err);
    container.innerHTML = `<p class="text-red-500 text-center py-6 text-sm">Error al cargar unidades.</p>`;
  }
}

// Abrir Detalle de la Unidad
export function openUnit(id, title) {
  currentUnitId = id;
  currentUnitTitle = title;
  document.getElementById("titulo-unidad").innerText = title;
  document.getElementById("unidad-breadcrumb").innerText = `${currentSubjectName}`;
  navigate("view-units", "view-detail");
  switchTab("recursos");
}

// Alternar entre Recursos y Actividades
export async function switchTab(tab) {
  const container = document.getElementById("detail-content");
  const tabRec = document.getElementById("tab-btn-recursos");
  const tabAct = document.getElementById("tab-btn-actividades");

  if (tab === "recursos") {
    tabRec.className = "flex-1 flex flex-col items-center text-[#2470BB] font-bold text-xs py-2 border-b-2 border-[#2470BB] transition";
    tabAct.className = "flex-1 flex flex-col items-center text-slate-400 font-semibold text-xs py-2 border-b-2 border-transparent hover:text-slate-600 transition";
    
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2470BB] border-t-transparent mb-3"></div>
        <p class="text-sm">Cargando recursos...</p>
      </div>
    `;

    try {
      const q = query(collection(db, "recursos"), where("unidadId", "==", currentUnitId));
      const snap = await getDocs(q);
      container.innerHTML = "";

      if (snap.empty) {
        container.innerHTML = `
          <div class="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <span class="text-3xl mb-2 block">📂</span>
            <p class="text-slate-600 font-medium text-sm">No hay recursos adjuntos aún.</p>
            <p class="text-xs text-slate-400 mt-1">El docente puede agregar PDFs y videos desde su panel.</p>
          </div>
        `;
        return;
      }

      snap.forEach((doc) => {
        const data = doc.data();
        const isPdf = data.tipo === "pdf";
        container.innerHTML += `
          <a href="${data.url}" target="_blank" rel="noopener noreferrer" class="block p-4 bg-white rounded-2xl shadow-sm hover:shadow border border-slate-100 hover:border-sky-300 mb-3 transition group">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} flex items-center justify-center text-lg">
                  <i class="fa-solid ${isPdf ? 'fa-file-pdf' : 'fa-circle-play'}"></i>
                </div>
                <div>
                  <p class="font-bold text-slate-800 text-sm group-hover:text-[#2470BB] transition">${data.titulo}</p>
                  <p class="text-[11px] text-slate-400">${isPdf ? 'Documento de Lectura' : 'Video Interactivo'}</p>
                </div>
              </div>
              <span class="text-xs font-bold text-[#2470BB] bg-blue-50 group-hover:bg-[#2470BB] group-hover:text-white px-3 py-1.5 rounded-xl transition">
                Abrir <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ml-1"></i>
              </span>
            </div>
          </a>
        `;
      });
    } catch (err) {
      console.error("Error al cargar recursos:", err);
      container.innerHTML = `<p class="text-red-500 text-center py-6 text-sm">Error al cargar recursos.</p>`;
    }
  } else {
    tabAct.className = "flex-1 flex flex-col items-center text-orange-500 font-bold text-xs py-2 border-b-2 border-orange-500 transition";
    tabRec.className = "flex-1 flex flex-col items-center text-slate-400 font-semibold text-xs py-2 border-b-2 border-transparent hover:text-slate-600 transition";
    
    container.innerHTML = `
      <div class="space-y-4">
        <div id="card-start-test" onclick="window.startQuiz()" class="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-orange-300 hover:shadow-md cursor-pointer transition active:scale-98 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-2xl font-bold">
              📝
            </div>
            <div>
              <h4 class="font-bold text-slate-800 text-base">Evaluación Interactiva • ${currentUnitTitle}</h4>
              <p class="text-xs text-slate-400 mt-0.5">Preguntas adaptativas y ejercicios prácticos</p>
            </div>
          </div>
          <div id="status-indicator" class="flex items-center gap-2">
            <div id="status-dot" class="w-3.5 h-3.5 rounded-full bg-slate-300" title="Pendiente"></div>
            <i class="fa-solid fa-play text-orange-500 text-sm ml-1"></i>
          </div>
        </div>

        <div class="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl text-xs text-orange-800 leading-relaxed">
          <p class="font-bold mb-1"><i class="fa-solid fa-lightbulb text-orange-500 mr-1"></i> Sistema de Aprendizaje Inteligente</p>
          Si tienes dificultades en una categoría de preguntas, el sistema se adaptará automáticamente para ayudarte a reforzar ese tema específico en tu próximo intento.
        </div>
      </div>
    `;
  }
}

// MOTOR DE QUIZ INTERACTIVO Y ADAPTATIVO
export async function startQuiz() {
  const container = document.getElementById("detail-content");
  
  // 1. Consultar preguntas en Firestore para esta unidad
  let firestoreQuestions = [];
  try {
    const q = query(collection(db, "preguntas"), where("unidadId", "==", currentUnitId));
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const data = d.data();
      firestoreQuestions.push({
        question: data.pregunta,
        image: data.imagen || "img/6unidad/unit1/mapamundi.jpg",
        options: data.opciones || [],
        correct: data.correcta,
        type: data.tipo === "fill" ? "drag-and-drop" : "multiple",
        category: 1
      });
    });
  } catch (e) {
    console.warn("Firestore preguntas fetch fallback:", e);
  }

  // Si hay preguntas en Firestore, las usamos; si no, usamos el banco pedagógico de la Unidad 1
  if (firestoreQuestions.length > 0) {
    const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
    quizData = shuffle(firestoreQuestions);
  } else {
    prepareAdaptiveQuiz();
  }

  currentQuestionIndex = 0;
  score = 0;
  loadCurrentQuestion();

  // Transición a la pantalla del Quiz
  navigate("view-detail", "quiz-screen");
}

function prepareAdaptiveQuiz() {
  const shuffle = (array) => [...array].sort(() => 0.5 - Math.random());

  if (!hasTakenTestBefore) {
    // Primera vez: selección equilibrada (3 de cada categoría)
    quizData = shuffle([
      ...shuffle(defaultQuestionsUnit1.cat1).slice(0, 3),
      ...shuffle(defaultQuestionsUnit1.cat2).slice(0, 3),
      ...shuffle(defaultQuestionsUnit1.cat3).slice(0, 3)
    ]);
  } else {
    // Intentos posteriores: Evaluación adaptativa basada en errores
    let maxErrors = Math.max(wrongAnswersByCategory[1], wrongAnswersByCategory[2], wrongAnswersByCategory[3]);
    let weakCategory = Object.keys(wrongAnswersByCategory).find((key) => wrongAnswersByCategory[key] == maxErrors);

    if (maxErrors === 0) {
      quizData = shuffle([
        ...shuffle(defaultQuestionsUnit1.cat1).slice(0, 3),
        ...shuffle(defaultQuestionsUnit1.cat2).slice(0, 3),
        ...shuffle(defaultQuestionsUnit1.cat3).slice(0, 3)
      ]);
    } else {
      // Se pondera la categoría más débil con 5 preguntas para refuerzo
      const counts = { 1: 2, 2: 2, 3: 2 };
      counts[weakCategory] = 5;

      quizData = shuffle([
        ...shuffle(defaultQuestionsUnit1.cat1).slice(0, counts[1]),
        ...shuffle(defaultQuestionsUnit1.cat2).slice(0, counts[2]),
        ...shuffle(defaultQuestionsUnit1.cat3).slice(0, counts[3])
      ]);
    }
  }

  // Reiniciar contador de errores para el intento actual
  wrongAnswersByCategory = { 1: 0, 2: 0, 3: 0 };
}

function loadCurrentQuestion() {
  const data = quizData[currentQuestionIndex];
  if (!data) return;

  const total = quizData.length;
  document.getElementById("quiz-step-indicator").innerText = `Pregunta ${currentQuestionIndex + 1} de ${total}`;
  document.getElementById("quiz-progress-bar").style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;

  const qText = document.getElementById("quiz-question");
  qText.innerText = data.type === "drag-and-drop" ? "Observa y completa la frase correctamente:" : data.question;

  const imgEl = document.getElementById("quiz-image");
  if (data.image) {
    imgEl.src = data.image;
    imgEl.classList.remove("hidden");
  } else {
    imgEl.classList.add("hidden");
  }

  const optionsContainer = document.getElementById("quiz-options");
  optionsContainer.innerHTML = "";
  selectedValue = null;

  if (data.type === "drag-and-drop") {
    // Modo Completar Frase / Drag & Drop
    const sentenceBox = document.createElement("div");
    sentenceBox.className = "text-lg font-bold text-center text-slate-800 mb-6 p-4 bg-sky-50 rounded-2xl border-2 border-dashed border-sky-200";
    sentenceBox.innerHTML = data.question.replace("______", `<span id="drop-target" class="inline-block px-3 py-1 min-w-[100px] border-b-2 border-sky-500 text-sky-600 bg-white rounded-lg mx-2 shadow-sm">_______</span>`);
    optionsContainer.appendChild(sentenceBox);

    const blocksContainer = document.createElement("div");
    blocksContainer.className = "flex flex-wrap gap-2.5 justify-center mt-4";

    (data.options || []).forEach((word) => {
      const block = document.createElement("div");
      block.className = "px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm cursor-pointer font-bold text-slate-700 hover:border-sky-400 active:scale-95 transition";
      block.innerText = word;
      block.onclick = () => {
        blocksContainer.querySelectorAll("div").forEach((b) => b.classList.remove("border-sky-500", "bg-sky-500", "text-white"));
        block.classList.add("border-sky-500", "bg-sky-500", "text-white");
        const target = document.getElementById("drop-target");
        if (target) target.innerText = word;
        selectedValue = word;
        enableCheckButton();
      };
      blocksContainer.appendChild(block);
    });
    optionsContainer.appendChild(blocksContainer);
  } else {
    // Modo Selección Múltiple
    (data.options || []).forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-opt w-full p-4 text-left border border-slate-200 rounded-2xl transition active:scale-98 flex items-center justify-between group mb-2.5 bg-white hover:border-sky-400 hover:bg-sky-50/40";
      btn.innerHTML = `
        <span class="font-medium text-slate-700 text-sm">${opt}</span>
        <div class="check-circle w-5 h-5 border-2 border-slate-300 rounded-full group-hover:border-[#2470BB] flex items-center justify-center"></div>
      `;
      btn.onclick = () => {
        document.querySelectorAll(".quiz-opt").forEach((b) => {
          b.classList.remove("border-[#2470BB]", "bg-sky-50");
          const c = b.querySelector(".check-circle");
          if (c) c.innerHTML = "";
        });
        btn.classList.add("border-[#2470BB]", "bg-sky-50");
        const circle = btn.querySelector(".check-circle");
        if (circle) circle.innerHTML = `<div class="w-2.5 h-2.5 bg-[#2470BB] rounded-full"></div>`;
        selectedValue = opt;
        enableCheckButton();
      };
      optionsContainer.appendChild(btn);
    });
  }

  const checkBtn = document.getElementById("btnCheckAnswer");
  checkBtn.innerText = "Comprobar Respuesta";
  checkBtn.disabled = true;
  checkBtn.className = "w-full bg-slate-200 text-slate-400 py-3.5 rounded-2xl font-bold text-base shadow-none cursor-not-allowed transition";
}

function enableCheckButton() {
  const btn = document.getElementById("btnCheckAnswer");
  btn.disabled = false;
  btn.className = "w-full bg-[#2470BB] hover:bg-sky-600 text-white py-3.5 rounded-2xl font-bold text-base shadow-md cursor-pointer transition active:scale-98";
}

function handleCheckAnswer() {
  const btn = document.getElementById("btnCheckAnswer");

  // Si ya se respondió y el botón dice Siguiente
  if (btn.innerText.includes("Siguiente") || btn.innerText.includes("Finalizar")) {
    currentQuestionIndex++;
    if (currentQuestionIndex < quizData.length) {
      loadCurrentQuestion();
    } else {
      finishQuiz();
    }
    return;
  }

  if (!selectedValue) return;

  const data = quizData[currentQuestionIndex];
  const isCorrect = selectedValue.trim().toLowerCase() === data.correct.trim().toLowerCase();

  if (isCorrect) {
    score++;
  } else {
    if (data.category) {
      wrongAnswersByCategory[data.category] = (wrongAnswersByCategory[data.category] || 0) + 1;
    }
  }

  // Feedback visual
  const isLast = currentQuestionIndex === quizData.length - 1;
  btn.innerText = isCorrect ? (isLast ? "¡Correcto! Finalizar" : "¡Correcto! Siguiente") : (isLast ? "Incorrecto. Finalizar" : "Incorrecto. Siguiente");
  btn.className = `w-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'} text-white py-3.5 rounded-2xl font-bold text-base shadow-lg transition`;

  if (data.type === "drag-and-drop") {
    const target = document.getElementById("drop-target");
    if (target) {
      target.style.color = isCorrect ? "#10b981" : "#ef4444";
      target.style.borderColor = isCorrect ? "#10b981" : "#ef4444";
    }
  }
}

function finishQuiz() {
  hasTakenTestBefore = true;
  const total = quizData.length;
  const errors = total - score;
  const percentage = Math.round((score / total) * 100);

  // Volver a la pantalla de detalle de unidad
  navigate("quiz-screen", "view-detail");
  switchTab("actividades");

  setTimeout(() => {
    const card = document.getElementById("card-start-test");
    const dot = document.getElementById("status-dot");
    
    if (card && dot) {
      if (errors <= 2) {
        // Excelente / Verde
        dot.className = "w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm";
        dot.title = `Aprobado (${percentage}%)`;
      } else if (errors <= 4) {
        // Medio / Amarillo
        dot.className = "w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm";
        dot.title = `Requiere práctica (${percentage}%)`;
      } else {
        // Necesita refuerzo / Rojo
        dot.className = "w-3.5 h-3.5 rounded-full bg-red-500 shadow-sm";
        dot.title = `Refuerzo adaptativo activado (${percentage}%)`;
      }
    }

    alert(`¡Test finalizado!\nPuntaje: ${score} de ${total} (${percentage}%).\n${errors > 2 ? 'El sistema ha calibrado las preguntas para reforzar tus debilidades en el próximo intento.' : '¡Excelente rendimiento!'}`);
  }, 400);
}

export function exitQuiz() {
  if (confirm("¿Deseas salir de la evaluación actual? El progreso no se guardará.")) {
    navigate("quiz-screen", "view-detail");
    switchTab("actividades");
  }
}

// Global scope bindings
window.navigate = navigate;
window.showGrades = showGrades;
window.loadSubjects = loadSubjects;
window.loadUnits = loadUnits;
window.openUnit = openUnit;
window.switchTab = switchTab;
window.startQuiz = startQuiz;
window.exitQuiz = exitQuiz;
