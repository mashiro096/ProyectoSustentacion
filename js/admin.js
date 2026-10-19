// Lógica del Panel Docente / Administrador
import { 
  db, 
  gradesData, 
  cleanDriveLink, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  deleteDoc 
} from "./firebase-config.js";

let currentGradeId = null;
let currentGradeName = "";
let currentSubjectId = null;
let currentSubjectName = "";
let currentUnitId = null;
let currentUnitTitle = "";

let unsubscribeSubjects = null;
let unsubscribeUnits = null;
let unsubscribeResources = null;
let unsubscribeQuestions = null;

// Inicialización
window.addEventListener("DOMContentLoaded", () => {
  renderGrades();
  setupEventListeners();
});

function setupEventListeners() {
  const qType = document.getElementById("q-type");
  if (qType) {
    qType.addEventListener("change", toggleQuestionType);
  }
}

// Renderizar Grados
export function renderGrades() {
  const container = document.getElementById("grades-container");
  if (!container) return;
  
  container.innerHTML = "";
  gradesData.forEach((grade) => {
    const card = document.createElement("div");
    card.className = "bg-white p-6 rounded-2xl shadow-sm border-t-4 border-[#2470BB] hover:shadow-md hover:-translate-y-1 transition duration-200 cursor-pointer flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">${grade.desc}</span>
          <i class="fa-solid fa-folder text-blue-300 text-xl"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800">${grade.name}</h3>
        <p class="text-xs text-gray-500 mt-1">Materias, unidades y banco de actividades</p>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-[#2470BB] font-semibold">
        <span>Gestionar contenidos</span>
        <i class="fa-solid fa-arrow-right text-xs"></i>
      </div>
    `;
    card.onclick = () => openGrade(grade.id, grade.name);
    container.appendChild(card);
  });
}

// Navegación de Vistas
export function openGrade(id, name) {
  currentGradeId = id;
  currentGradeName = name;
  document.getElementById("subject-grade-title").innerText = name;
  switchView("view-subjects");
  loadSubjects(id);
}

export function openUnits(id, name) {
  currentSubjectId = id;
  currentSubjectName = name;
  document.getElementById("unit-subject-title").innerText = `${currentGradeName} • ${name}`;
  switchView("view-units");
  loadUnits(id);
}

export function openContent(id, title) {
  currentUnitId = id;
  currentUnitTitle = title;
  document.getElementById("content-unit-title").innerText = title;
  document.getElementById("content-breadcrumb").innerText = `${currentGradeName} > ${currentSubjectName}`;
  switchView("view-content");
  loadResources(id);
  loadQuestions(id);
}

export function switchView(viewId) {
  ["view-dashboard", "view-subjects", "view-units", "view-content"].forEach((v) => {
    const el = document.getElementById(v);
    if (el) {
      el.classList.add("hidden");
      el.classList.add("opacity-0");
    }
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove("hidden");
    setTimeout(() => target.classList.remove("opacity-0"), 50);
  }
}

export function goBackToDashboard() {
  if (unsubscribeSubjects) unsubscribeSubjects();
  switchView("view-dashboard");
}

export function goBackToSubjects() {
  if (unsubscribeUnits) unsubscribeUnits();
  switchView("view-subjects");
}

export function goBackToUnits() {
  if (unsubscribeResources) unsubscribeResources();
  if (unsubscribeQuestions) unsubscribeQuestions();
  switchView("view-units");
}

// Pestañas Recursos / Actividades en la vista de unidad
export function switchTab(tab) {
  const pRec = document.getElementById("panel-recursos");
  const pAct = document.getElementById("panel-actividades");
  const tRec = document.getElementById("tab-rec");
  const tAct = document.getElementById("tab-act");

  if (tab === "recursos") {
    pRec.classList.remove("hidden");
    pAct.classList.add("hidden");
    tRec.className = "pb-4 px-2 border-b-2 border-[#2470BB] text-[#2470BB] font-bold flex items-center gap-2";
    tAct.className = "pb-4 px-2 border-b-2 border-transparent text-gray-400 font-bold flex items-center gap-2 hover:text-gray-600";
  } else {
    pRec.classList.add("hidden");
    pAct.classList.remove("hidden");
    tAct.className = "pb-4 px-2 border-b-2 border-orange-500 text-orange-500 font-bold flex items-center gap-2";
    tRec.className = "pb-4 px-2 border-b-2 border-transparent text-gray-400 font-bold flex items-center gap-2 hover:text-gray-600";
  }
}

// Carga en tiempo real de Materias
function loadSubjects(gradeId) {
  if (unsubscribeSubjects) unsubscribeSubjects();
  const q = query(collection(db, "materias"), where("gradoId", "==", gradeId));
  
  unsubscribeSubjects = onSnapshot(q, (snap) => {
    const container = document.getElementById("subjects-grid");
    container.innerHTML = "";
    
    if (snap.empty) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300">
          <p class="text-gray-400 mb-2">No hay materias registradas aún para este grado.</p>
          <span class="text-xs text-gray-400">Haz clic en "+ Añadir Materia" para crear la primera.</span>
        </div>
      `;
    }

    snap.forEach((d) => {
      const data = d.data();
      const item = document.createElement("div");
      item.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition group";
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
            <i class="fa-solid fa-book"></i>
          </div>
          <div>
            <span class="font-bold text-gray-800 group-hover:text-[#2470BB] transition">${data.nombre}</span>
            <p class="text-xs text-gray-400">Ver unidades y recursos</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="event.stopPropagation(); window.deleteItem('materias', '${d.id}')" title="Eliminar materia" class="p-2 text-gray-300 hover:text-red-500 transition">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <i class="fa-solid fa-chevron-right text-gray-300 group-hover:text-[#2470BB] group-hover:translate-x-1 transition"></i>
        </div>
      `;
      item.onclick = () => openUnits(d.id, data.nombre);
      container.appendChild(item);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "border-2 border-dashed border-sky-200 rounded-2xl p-5 text-sky-600 font-semibold hover:bg-sky-50 transition flex items-center justify-center gap-2";
    addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir Materia`;
    addBtn.onclick = () => openModal("modal-subject");
    container.appendChild(addBtn);
  });
}

// Carga en tiempo real de Unidades
function loadUnits(subId) {
  if (unsubscribeUnits) unsubscribeUnits();
  const q = query(collection(db, "unidades"), where("materiaId", "==", subId));
  
  unsubscribeUnits = onSnapshot(q, (snap) => {
    const container = document.getElementById("units-grid");
    container.innerHTML = "";

    if (snap.empty) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300">
          <p class="text-gray-400 mb-2">No hay unidades para esta materia.</p>
          <span class="text-xs text-gray-400">Crea una unidad para empezar a organizar temas y retos.</span>
        </div>
      `;
    }

    snap.forEach((d) => {
      const data = d.data();
      const item = document.createElement("div");
      item.className = "bg-white p-5 rounded-2xl shadow-sm border-l-4 border-sky-500 border-t border-r border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-sky-50/50 transition group";
      item.innerHTML = `
        <div>
          <span class="font-bold text-gray-800 group-hover:text-[#2470BB] transition">${data.titulo}</span>
          <p class="text-xs text-gray-400 mt-1">Recursos didácticos y actividades</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="event.stopPropagation(); window.deleteItem('unidades', '${d.id}')" title="Eliminar unidad" class="p-2 text-gray-300 hover:text-red-500 transition">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <div class="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
            <i class="fa-solid fa-arrow-right text-xs"></i>
          </div>
        </div>
      `;
      item.onclick = () => openContent(d.id, data.titulo);
      container.appendChild(item);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "border-2 border-dashed border-sky-300 rounded-2xl p-5 text-sky-600 font-semibold hover:bg-sky-50 transition flex items-center justify-center gap-2";
    addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Crear Nueva Unidad`;
    addBtn.onclick = () => openModal("modal-unit");
    container.appendChild(addBtn);
  });
}

// Carga en tiempo real de Recursos
function loadResources(unitId) {
  if (unsubscribeResources) unsubscribeResources();
  const q = query(collection(db, "recursos"), where("unidadId", "==", unitId));
  
  unsubscribeResources = onSnapshot(q, (snapshot) => {
    const list = document.getElementById("resources-list");
    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = `
        <div class="p-6 bg-white rounded-2xl border border-gray-100 text-center text-gray-400 text-sm">
          No hay recursos subidos aún para esta unidad. Añade uno arriba.
        </div>
      `;
      return;
    }

    snapshot.forEach((d) => {
      const res = d.data();
      const isPdf = res.tipo === "pdf";
      list.innerHTML += `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#2470BB] transition">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'} flex items-center justify-center rounded-xl transition">
              <i class="fa-solid ${isPdf ? 'fa-file-lines' : 'fa-circle-play'}"></i>
            </div>
            <div>
              <span class="font-bold text-gray-700 block">${res.titulo}</span>
              <span class="text-[11px] text-gray-400 uppercase tracking-wider">${isPdf ? 'Documento PDF' : 'Video Tutorial'}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <a href="${res.url}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-blue-50 text-[#2470BB] hover:bg-[#2470BB] hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5">
              <span>ABRIR</span> <i class="fa-solid fa-up-right-from-square text-[10px]"></i>
            </a>
            <button class="p-2 text-gray-300 hover:text-red-500 transition" onclick="window.deleteItem('recursos', '${d.id}')" title="Eliminar">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    });
  });
}

// Guardar nuevo Recurso
export async function saveResource() {
  const title = document.getElementById("res-title").value.trim();
  const rawUrl = document.getElementById("res-url").value.trim();
  const type = document.getElementById("res-type").value;

  if (!title || !rawUrl) {
    alert("Por favor completa el título y el enlace.");
    return;
  }

  try {
    await addDoc(collection(db, "recursos"), {
      titulo: title,
      url: cleanDriveLink(rawUrl),
      tipo: type,
      unidadId: currentUnitId,
      createdAt: new Date().toISOString()
    });
    document.getElementById("res-title").value = "";
    document.getElementById("res-url").value = "";
    alert("¡Material guardado correctamente!");
  } catch (err) {
    console.error("Error guardando recurso:", err);
    alert("Error al guardar: " + err.message);
  }
}

// Alternar interfaz de preguntas según el tipo
export function toggleQuestionType() {
  const type = document.getElementById("q-type").value;
  const hint = document.getElementById("fill-hint");
  const optLabel = document.getElementById("opt-correct-label");
  
  if (type === "fill") {
    if (hint) hint.classList.remove("hidden");
    if (optLabel) optLabel.innerText = "Palabra correcta que completa la frase";
  } else {
    if (hint) hint.classList.add("hidden");
    if (optLabel) optLabel.innerText = "Opción CORRECTA";
  }
}

// Guardar nueva Pregunta / Reto
export async function saveQuestion() {
  const type = document.getElementById("q-type").value;
  const text = document.getElementById("q-text").value.trim();
  const imageRaw = document.getElementById("q-image").value.trim();
  const opts = [
    document.getElementById("opt-1").value.trim(),
    document.getElementById("opt-2").value.trim(),
    document.getElementById("opt-3").value.trim(),
    document.getElementById("opt-4").value.trim()
  ];

  if (!text || !opts[0] || !opts[1]) {
    alert("Por favor completa el enunciado y al menos dos opciones (incluyendo la correcta).");
    return;
  }

  if (type === "fill" && !text.includes("______") && !text.includes("[box]")) {
    alert("Para actividades de completar, incluye '[box]' o '______' en la frase donde el estudiante deba rellenar.");
    return;
  }

  try {
    const cleanSentence = text.replace(/\[box\]/g, "______");
    await addDoc(collection(db, "preguntas"), {
      unidadId: currentUnitId,
      tipo: type,
      pregunta: cleanSentence,
      imagen: cleanDriveLink(imageRaw),
      opciones: opts.filter((o) => o !== ""),
      correcta: opts[0],
      createdAt: new Date().toISOString()
    });

    document.getElementById("q-text").value = "";
    document.getElementById("q-image").value = "";
    [1, 2, 3, 4].forEach((i) => (document.getElementById(`opt-${i}`).value = ""));
    alert("¡Desafío educativo añadido con éxito!");
  } catch (err) {
    console.error("Error al guardar pregunta:", err);
    alert("Error al guardar: " + err.message);
  }
}

// Carga en tiempo real de Preguntas
function loadQuestions(unitId) {
  if (unsubscribeQuestions) unsubscribeQuestions();
  const q = query(collection(db, "preguntas"), where("unidadId", "==", unitId));
  
  unsubscribeQuestions = onSnapshot(q, (snapshot) => {
    const list = document.getElementById("questions-list");
    const badge = document.getElementById("badge-count");
    list.innerHTML = "";
    let count = 0;

    if (snapshot.empty) {
      list.innerHTML = `
        <div class="p-8 bg-white rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
          <i class="fa-solid fa-puzzle-piece text-3xl mb-2 text-gray-300"></i>
          <p class="font-medium text-gray-600">No hay desafíos aún en esta unidad.</p>
          <p class="text-xs text-gray-400 mt-1">Usa el formulario superior para crear preguntas de selección o completar.</p>
        </div>
      `;
      if (badge) badge.innerText = "0 Desafíos";
      return;
    }

    snapshot.forEach((d) => {
      count++;
      const qData = d.data();
      const isFill = qData.tipo === "fill";
      
      list.innerHTML += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 md:gap-6 items-center">
          <div class="relative shrink-0">
            ${
              qData.imagen
                ? `<img src="${qData.imagen}" class="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl shadow-inner border border-gray-100" onerror="this.src='img/grado6.jpg'">`
                : `<div class="w-20 h-20 md:w-24 md:h-24 bg-gray-100 flex items-center justify-center rounded-xl text-gray-300"><i class="fa-solid fa-image text-2xl"></i></div>`
            }
            <div class="absolute -top-2 -right-2 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] shadow-lg" title="${isFill ? 'Completar con cuadros' : 'Selección Múltiple'}">
              <i class="fa-solid ${isFill ? 'fa-puzzle-piece' : 'fa-list-check'}"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start">
              <h5 class="font-bold text-gray-800 text-sm md:text-base leading-snug break-words">${qData.pregunta}</h5>
              <button onclick="window.deleteItem('preguntas', '${d.id}')" class="text-gray-300 hover:text-red-500 transition ml-3 shrink-0" title="Eliminar desafío">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              ${(qData.opciones || [])
                .map(
                  (o) => `
                <span class="text-[11px] px-2.5 py-1 rounded-lg font-bold border ${
                  o === qData.correcta
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }">
                  ${o === qData.correcta ? '✓ ' : ''}${o}
                </span>`
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    });

    if (badge) badge.innerText = `${count} Desafíos`;
  });
}

// Modales y CRUD genérico
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

export async function addNewSubject() {
  const name = document.getElementById("input-subject-name").value.trim();
  if (!name) return alert("Ingresa el nombre de la materia");
  
  try {
    await addDoc(collection(db, "materias"), {
      nombre: name,
      gradoId: currentGradeId,
      createdAt: new Date().toISOString()
    });
    closeModal("modal-subject");
    document.getElementById("input-subject-name").value = "";
  } catch (err) {
    alert("Error al crear materia: " + err.message);
  }
}

export async function addNewUnit() {
  const name = document.getElementById("input-unit-name").value.trim();
  if (!name) return alert("Ingresa el título de la unidad");

  try {
    await addDoc(collection(db, "unidades"), {
      titulo: name,
      materiaId: currentSubjectId,
      createdAt: new Date().toISOString()
    });
    closeModal("modal-unit");
    document.getElementById("input-unit-name").value = "";
  } catch (err) {
    alert("Error al crear unidad: " + err.message);
  }
}

export async function deleteItem(col, id) {
  if (confirm("¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.")) {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  }
}

// Hacer funciones accesibles globalmente para handlers inline de HTML
window.openGrade = openGrade;
window.openUnits = openUnits;
window.openContent = openContent;
window.goBackToDashboard = goBackToDashboard;
window.goBackToSubjects = goBackToSubjects;
window.goBackToUnits = goBackToUnits;
window.switchTab = switchTab;
window.toggleQuestionType = toggleQuestionType;
window.saveResource = saveResource;
window.saveQuestion = saveQuestion;
window.openModal = openModal;
window.closeModal = closeModal;
window.addNewSubject = addNewSubject;
window.addNewUnit = addNewUnit;
window.deleteItem = deleteItem;
