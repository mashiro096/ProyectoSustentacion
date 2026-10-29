// ==============================================================================
// MOTOR DE ACTIVIDADES INTERACTIVAS SINGLING
// 1. Completar con Cuadros (Drag & Drop con Imágenes)
// 2. Memorama Educativo (Memory Match 3D)
// 3. Crucigrama de Vocabulario (Crossword Puzzle)
// 4. Sopa de Letras (Word Search)
// 5. El Ahorcado (Hangman Challenge)
// ==============================================================================

// Helper de confeti (usa canvas-confetti si existe, o fallback nativo con CSS particles)
export function triggerConfetti() {
  if (typeof window.confetti === 'function') {
    window.confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      window.confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      window.confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  } else {
    // Fallback nativo
    const count = 30;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'fixed z-50 pointer-events-none rounded-full animate-ping';
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `${Math.random() * 80}vh`;
      p.style.width = `${Math.random() * 12 + 6}px`;
      p.style.height = p.style.width;
      const colors = ['#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }
}

// ==============================================================================
// 1. ACTIVIDAD: COMPLETAR CON CUADROS (CUADROS DE TEXTOS / WORD CHIPS)
// ==============================================================================
export function renderFillActivity(container, data, onExit) {
  const rawItems = data.items || data.preguntas || [];
  // Normalizar items para admitir formato de actividades_unidad o preguntas directas
  const items = rawItems.map(it => ({
    id: it.id || Math.random(),
    sentence: it.sentence || it.pregunta || '',
    correct: (it.correct || it.correcta || '').trim(),
    hint: it.hint || '',
    translation: it.translation || '',
    options: Array.isArray(it.options) ? it.options : (Array.isArray(it.opciones) ? it.opciones : [])
  })).filter(it => it.sentence && it.correct);

  if (!items.length) {
    container.innerHTML = `
      <div class="max-w-md mx-auto p-8 bg-white rounded-3xl border shadow-sm text-center space-y-4">
        <div class="text-4xl">📝</div>
        <h3 class="font-bold text-gray-800">No hay oraciones configuradas</h3>
        <p class="text-xs text-gray-500">Crea o añade oraciones con casillas [box] desde el panel docente.</p>
        <button id="btn-fill-empty-exit" class="px-5 py-2.5 bg-sky-500 text-white rounded-xl text-xs font-bold hover:bg-sky-600 transition cursor-pointer">
          Volver
        </button>
      </div>`;
    const btn = document.getElementById('btn-fill-empty-exit');
    if (btn) btn.onclick = onExit;
    return;
  }

  // Colección global de palabras de respaldo para generar distractores si faltan
  const allWordsPool = Array.from(new Set([
    ...items.map(it => it.correct),
    'Canada', 'Brazil', 'Ecuador', 'Chile', 'Spain', 'Japan', 'Ottawa', 'Quito', 'Brasilia', 'Madrid', 'Tokyo', 'maple', 'biggest', 'smaller', 'longer'
  ]));

  let currentIndex = 0;
  let correctCount = 0;
  let isChecked = false;
  let selectedWord = null;

  function buildOptionsForCurrentItem(item) {
    let opts = [];
    if (item.options && item.options.length >= 2) {
      opts = item.options.map(o => String(o).trim()).filter(Boolean);
    }
    // Asegurar que la respuesta correcta esté en las opciones
    if (!opts.some(o => o.toLowerCase() === item.correct.toLowerCase())) {
      opts.push(item.correct);
    }
    // Si hay menos de 4 opciones, completar con palabras del pool
    if (opts.length < 4) {
      const candidates = allWordsPool.filter(w => !opts.some(o => o.toLowerCase() === w.toLowerCase()));
      // Barajar candidatos
      const shuffledCandidates = candidates.sort(() => Math.random() - 0.5);
      while (opts.length < 4 && shuffledCandidates.length > 0) {
        opts.push(shuffledCandidates.pop());
      }
    }
    // Barajar opciones
    return opts.sort(() => Math.random() - 0.5);
  }

  function drawItem() {
    const item = items[currentIndex];
    isChecked = false;
    selectedWord = null;

    const options = buildOptionsForCurrentItem(item);

    // Ranura interactiva para colocar el cuadro de texto
    const targetSlotHtml = `
      <span class="inline-flex items-center align-middle mx-2 my-1">
        <span 
          id="fill-target-slot" 
          class="fill-drop-slot group relative inline-flex items-center justify-center min-w-[150px] md:min-w-[190px] min-h-[48px] px-4 py-1.5 rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100/70 text-sky-700 font-black text-lg md:text-xl transition-all duration-200 shadow-inner cursor-pointer select-none"
          title="Pulsa aquí o arrastra un cuadro de texto para completar"
        >
          <span id="slot-placeholder" class="text-xs md:text-sm font-semibold text-sky-500 flex items-center gap-1.5 pointer-events-none">
            <i class="fa-regular fa-square-plus animate-pulse"></i>
            <span>[ Cuadro de texto ]</span>
          </span>
          <span id="slot-content" class="hidden font-black text-lg md:text-xl text-[#2470BB] uppercase tracking-wide"></span>
          <button id="slot-remove-btn" class="hidden absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center shadow hover:bg-rose-600 transition" title="Quitar cuadro">
            ✕
          </button>
        </span>
      </span>
    `;

    const sentenceHtml = item.sentence.includes('______')
      ? item.sentence.replace(/______/g, targetSlotHtml)
      : item.sentence.replace(/\[box\]/g, targetSlotHtml);

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6 pb-12 animate-fadeIn select-none">
        <!-- Barra Superior con Botón Volver y Progreso -->
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <button id="btn-fill-back" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Volver</span>
            </button>
            <span class="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-bold">Reto ${currentIndex + 1} de ${items.length}</span>
            <span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">Aciertos: ${correctCount}</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-hint-fill" class="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-lightbulb"></i>
              <span>Pista</span>
            </button>
          </div>
        </div>

        <!-- Tarjeta Principal con la Oración -->
        <div class="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6 text-center">
          <div class="inline-flex items-center gap-2 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-semibold">
            <i class="fa-solid fa-shapes text-sky-500"></i>
            <span>Responde colocando el cuadro de texto correcto</span>
          </div>

          <!-- Oración con ranura para el cuadro -->
          <div class="p-6 md:p-8 bg-gradient-to-r from-sky-50/50 via-white to-blue-50/50 rounded-2xl border border-sky-100 shadow-2xs">
            <p class="text-xl md:text-2xl font-bold text-gray-800 leading-loose">
              ${sentenceHtml}
            </p>
            ${item.translation ? `<p class="text-xs text-gray-400 mt-3 italic"><i class="fa-solid fa-language mr-1"></i>${item.translation}</p>` : ''}
          </div>

          <!-- Caja de Pista (Desplegable) -->
          <div id="fill-hint-box" class="hidden text-xs text-amber-800 bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-left space-y-1">
            <div class="font-bold flex items-center gap-1.5">
              <i class="fa-solid fa-lightbulb text-amber-500"></i>
              <span>Pista de ayuda:</span>
            </div>
            <p>${item.hint || `El cuadro correcto tiene ${item.correct.length} letras y comienza con "${item.correct.charAt(0).toUpperCase()}".`}</p>
          </div>

          <!-- Banco de Cuadros de Opciones (Text Chips) -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
              <span>Elige el cuadro de texto:</span>
              <span class="text-[11px] text-gray-400 font-normal">👆 Pulsa o arrastra el cuadro</span>
            </div>
            <div id="fill-options-bank" class="flex flex-wrap gap-2.5 md:gap-3.5 justify-center items-center py-2">
              ${options.map(opt => `
                <button 
                  type="button" 
                  class="fill-choice-card px-5 py-3 rounded-2xl bg-white border-2 border-sky-300 text-[#2470BB] font-black text-base md:text-lg shadow-sm hover:border-[#2470BB] hover:bg-sky-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer select-none"
                  data-word="${opt}"
                  draggable="true"
                >
                  ${opt}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Mensaje de Feedback -->
          <div id="fill-feedback" class="hidden text-sm font-bold py-3.5 px-4 rounded-xl transition-all"></div>
        </div>

        <!-- Botón de Acción Principal -->
        <div class="flex gap-3">
          <button id="btn-check-fill" class="flex-1 py-4 bg-[#2470BB] hover:bg-sky-600 text-white rounded-2xl font-bold text-base shadow-md cursor-pointer transition active:scale-98 flex items-center justify-center gap-2">
            <span>Comprobar Cuadro</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    const slot = document.getElementById('fill-target-slot');
    const slotPlaceholder = document.getElementById('slot-placeholder');
    const slotContent = document.getElementById('slot-content');
    const slotRemoveBtn = document.getElementById('slot-remove-btn');
    const optionsBank = document.getElementById('fill-options-bank');
    const checkBtn = document.getElementById('btn-check-fill');
    const hintBtn = document.getElementById('btn-hint-fill');
    const hintBox = document.getElementById('fill-hint-box');
    const feedback = document.getElementById('fill-feedback');
    const backBtn = document.getElementById('btn-fill-back');

    if (backBtn) backBtn.onclick = onExit;

    if (hintBtn && hintBox) {
      hintBtn.onclick = () => hintBox.classList.toggle('hidden');
    }

    // Función para colocar un cuadro en la ranura
    function placeWordInSlot(word) {
      if (isChecked) return;
      selectedWord = word;

      // Actualizar ranura
      slotPlaceholder.classList.add('hidden');
      slotContent.classList.remove('hidden');
      slotContent.innerText = word;
      slotRemoveBtn.classList.remove('hidden');

      slot.className = "fill-drop-slot group relative inline-flex items-center justify-center min-w-[150px] md:min-w-[190px] min-h-[48px] px-4 py-1.5 rounded-2xl border-2 border-[#2470BB] bg-blue-50 text-[#2470BB] font-black text-lg md:text-xl transition-all shadow-sm cursor-pointer select-none animate-scaleIn";

      // Actualizar botones del banco
      optionsBank.querySelectorAll('.fill-choice-card').forEach(btn => {
        if (btn.dataset.word.toLowerCase() === word.toLowerCase()) {
          btn.classList.add('opacity-30', 'pointer-events-none', 'border-dashed', 'scale-95');
        } else {
          btn.classList.remove('opacity-30', 'pointer-events-none', 'border-dashed', 'scale-95');
        }
      });
    }

    // Función para quitar el cuadro de la ranura
    function removeWordFromSlot() {
      if (isChecked) return;
      selectedWord = null;

      slotPlaceholder.classList.remove('hidden');
      slotContent.classList.add('hidden');
      slotContent.innerText = '';
      slotRemoveBtn.classList.add('hidden');

      slot.className = "fill-drop-slot group relative inline-flex items-center justify-center min-w-[150px] md:min-w-[190px] min-h-[48px] px-4 py-1.5 rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50/70 hover:bg-sky-100/70 text-sky-700 font-black text-lg md:text-xl transition-all shadow-inner cursor-pointer select-none";

      optionsBank.querySelectorAll('.fill-choice-card').forEach(btn => {
        btn.classList.remove('opacity-30', 'pointer-events-none', 'border-dashed', 'scale-95');
      });
    }

    // Clic en la ranura quita el cuadro
    slot.onclick = () => {
      if (selectedWord) removeWordFromSlot();
    };

    if (slotRemoveBtn) {
      slotRemoveBtn.onclick = (e) => {
        e.stopPropagation();
        removeWordFromSlot();
      };
    }

    // Clic en tarjetas del banco
    optionsBank.querySelectorAll('.fill-choice-card').forEach(card => {
      card.onclick = () => {
        placeWordInSlot(card.dataset.word);
      };

      // Soporte Drag & Drop
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.word);
        card.classList.add('opacity-50');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('opacity-50');
      });
    });

    // Zona receptora (Drop Slot)
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('border-[#2470BB]', 'bg-sky-100');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('border-[#2470BB]', 'bg-sky-100');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('border-[#2470BB]', 'bg-sky-100');
      const droppedWord = e.dataTransfer.getData('text/plain');
      if (droppedWord) {
        placeWordInSlot(droppedWord);
      }
    });

    // Comprobar
    checkBtn.onclick = () => {
      if (isChecked) {
        currentIndex++;
        if (currentIndex < items.length) {
          drawItem();
        } else {
          showFillResults();
        }
        return;
      }

      if (!selectedWord) {
        slot.classList.add('border-amber-400', 'bg-amber-50', 'animate-shake');
        setTimeout(() => slot.classList.remove('border-amber-400', 'bg-amber-50', 'animate-shake'), 700);
        return;
      }

      isChecked = true;
      const isCorrect = selectedWord.trim().toLowerCase() === item.correct.toLowerCase();

      feedback.classList.remove('hidden');

      if (isCorrect) {
        correctCount++;
        if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('fill', true, currentIndex === items.length - 1);
        slot.className = "fill-drop-slot relative inline-flex items-center justify-center min-w-[150px] md:min-w-[190px] min-h-[48px] px-4 py-1.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-black text-lg md:text-xl shadow-xs uppercase tracking-wide";
        slotRemoveBtn.classList.add('hidden');
        feedback.className = 'text-sm font-bold py-3.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200';
        feedback.innerHTML = `🎉 ¡Correcto! "${item.sentence.replace(/\[box\]|______/g, item.correct)}"`;
        triggerConfetti();
      } else {
        slot.className = "fill-drop-slot relative inline-flex items-center justify-center min-w-[150px] md:min-w-[190px] min-h-[48px] px-4 py-1.5 rounded-2xl border-2 border-rose-500 bg-rose-50 text-rose-800 font-black text-lg md:text-xl shadow-xs animate-shake uppercase tracking-wide";
        slotRemoveBtn.classList.add('hidden');
        if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('fill', false, false);
        feedback.className = 'text-sm font-bold py-3.5 px-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200';
        feedback.innerHTML = `❌ El cuadro correcto era: <b class="underline text-rose-900">${item.correct}</b>`;
      }

      const isLast = currentIndex === items.length - 1;
      checkBtn.innerHTML = `<span>${isLast ? 'Ver Resultados Finales' : 'Siguiente Oración'}</span> <i class="fa-solid fa-arrow-right"></i>`;
      checkBtn.className = `flex-1 py-4 ${isCorrect ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'} text-white rounded-2xl font-bold text-base shadow-md cursor-pointer transition flex items-center justify-center gap-2`;
    };
  }

  function showFillResults() {
    triggerConfetti();
    const pct = Math.round((correctCount / items.length) * 100);

    let stars = '⭐⭐⭐';
    if (pct < 50) stars = '⭐';
    else if (pct < 80) stars = '⭐⭐';

    container.innerHTML = `
      <div class="max-w-xl mx-auto bg-white rounded-3xl p-8 border shadow-sm text-center space-y-6 animate-fadeIn">
        <div class="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl shadow-sm">
          🏆
        </div>
        <div>
          <div class="text-3xl mb-1">${stars}</div>
          <h3 class="text-2xl font-bold text-gray-800">¡Reto de Cuadros Superado!</h3>
          <p class="text-sm text-gray-500 mt-1">Has respondido todos los enunciados con los cuadros correctos.</p>
        </div>

        <div class="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <span class="text-xs text-gray-400 font-semibold block">Aciertos</span>
            <span class="text-2xl font-bold text-[#2470BB]">${correctCount} / ${items.length}</span>
          </div>
          <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <span class="text-xs text-emerald-600 font-semibold block">Porcentaje</span>
            <span class="text-2xl font-bold text-emerald-700">${pct}%</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-4">
          <button id="btn-retry-fill" class="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1.5"></i> Intentar de nuevo
          </button>
          <button id="btn-finish-fill" class="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-bold text-sm transition cursor-pointer">
            Volver a Actividades
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-retry-fill').onclick = () => {
      currentIndex = 0;
      correctCount = 0;
      drawItem();
    };
    document.getElementById('btn-finish-fill').onclick = onExit;
  }

  drawItem();
}

// ==============================================================================
// 2. ACTIVIDAD: MEMORAMA EDUCATIVO (MEMORY MATCH 3D)
// ==============================================================================
export function renderMemoramaActivity(container, data, onExit) {
  const basePairs = data.pares || [
    { id: 1, text: 'Canada', image: 'img/6unidad/unit1/canada.jpg' },
    { id: 2, text: 'Brazil', image: 'img/6unidad/unit1/brasil.jpg' },
    { id: 3, text: 'Ecuador', image: 'img/6unidad/unit1/ecuador.jpg' },
    { id: 4, text: 'Chile', image: 'img/6unidad/unit1/chile.jpg' },
    { id: 5, text: 'Spain', image: 'img/6unidad/unit1/espana.jpg' },
    { id: 6, text: 'Japan', image: 'img/6unidad/unit1/japon.jpg' }
  ];

  // Crear 2 cartas por cada par (una con imagen y otra con texto)
  const cards = [];
  basePairs.forEach(p => {
    cards.push({
      pairId: p.id,
      type: 'image',
      content: p.image,
      word: p.text
    });
    cards.push({
      pairId: p.id,
      type: 'text',
      content: p.text,
      word: p.text
    });
  });

  // Barajar
  const deck = cards.sort(() => Math.random() - 0.5);

  let flippedCards = [];
  let matchedCount = 0;
  let moves = 0;
  let seconds = 0;
  let timerInterval = null;
  let isLocked = false;

  container.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6 pb-12 animate-fadeIn select-none">
      <!-- Barra Superior de Estadísticas -->
      <div class="bg-white p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-4">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <span class="text-sky-500 font-bold text-lg"><i class="fa-regular fa-clock"></i></span>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Tiempo</span>
              <span id="memo-timer" class="text-sm font-bold text-gray-800">00:00</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-amber-500 font-bold text-lg"><i class="fa-solid fa-arrows-rotate"></i></span>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Movimientos</span>
              <span id="memo-moves" class="text-sm font-bold text-gray-800">0</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-emerald-500 font-bold text-lg"><i class="fa-solid fa-star"></i></span>
            <div>
              <span class="text-[10px] text-gray-400 font-bold uppercase block">Parejas</span>
              <span id="memo-pairs" class="text-sm font-bold text-gray-800">0 / ${basePairs.length}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-exit-memo-top" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Volver</span>
          </button>
          <button id="btn-restart-memo" class="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
            <i class="fa-solid fa-rotate-right"></i>
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      <!-- Cuadrícula 3D de Cartas (4 columnas en md, 3 en móviles) -->
      <div id="memo-grid" class="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4"></div>
    </div>
  `;

  // Estilos 3D insertados dinámicamente si no existen
  if (!document.getElementById('memo-3d-styles')) {
    const style = document.createElement('style');
    style.id = 'memo-3d-styles';
    style.innerHTML = `
      .perspective-1000 { perspective: 1000px; }
      .transform-style-preserve { transform-style: preserve-3d; }
      .backface-hidden { backface-visibility: hidden; }
      .rotate-y-180 { transform: rotateY(180deg); }
    `;
    document.head.appendChild(style);
  }

  const grid = document.getElementById('memo-grid');

  deck.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'memo-card relative h-28 md:h-36 rounded-2xl cursor-pointer perspective-1000 transition-transform active:scale-95';
    cardEl.dataset.index = index;
    cardEl.dataset.pair = card.pairId;

    cardEl.innerHTML = `
      <div class="card-inner w-full h-full relative transition-transform duration-500 transform-style-preserve rounded-2xl shadow-sm">
        <!-- Cara Trasera (Oculta) -->
        <div class="card-back absolute inset-0 bg-gradient-to-br from-[#2470BB] to-sky-600 rounded-2xl flex flex-col items-center justify-center text-white backface-hidden border-2 border-white shadow">
          <img src="img/logo.png" class="w-8 h-8 opacity-40 mb-1" onerror="this.style.display='none'" />
          <span class="text-xl md:text-2xl font-black opacity-60">?</span>
        </div>
        <!-- Cara Frontal (Revelada) -->
        <div class="card-front absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center p-2 backface-hidden rotate-y-180 border-2 border-sky-300 shadow">
          ${card.type === 'image' ? `
            <img src="${card.content}" class="h-16 md:h-20 object-contain rounded-lg" onerror="this.src='img/logo.png'" />
            <span class="text-[10px] text-gray-400 font-bold mt-1">Bandera</span>
          ` : `
            <span class="text-base md:text-xl font-black text-[#2470BB]">${card.content}</span>
            <span class="text-[10px] text-sky-500 font-semibold mt-1">País</span>
          `}
        </div>
      </div>
    `;

    cardEl.onclick = () => handleCardClick(cardEl, card);
    grid.appendChild(cardEl);
  });

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      const el = document.getElementById('memo-timer');
      if (el) el.innerText = `${m}:${s}`;
    }, 1000);
  }

  function handleCardClick(cardEl, cardData) {
    if (isLocked) return;
    if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;

    startTimer();

    // Voltear
    cardEl.classList.add('flipped');
    const inner = cardEl.querySelector('.card-inner');
    inner.classList.add('rotate-y-180');

    flippedCards.push({ el: cardEl, data: cardData });

    if (flippedCards.length === 2) {
      moves++;
      document.getElementById('memo-moves').innerText = moves;
      isLocked = true;

      const [c1, c2] = flippedCards;

      if (c1.data.pairId === c2.data.pairId && c1.data.type !== c2.data.type) {
        // ¡Coincidencia!
        setTimeout(() => {
          c1.el.classList.add('matched');
          c2.el.classList.add('matched');
          c1.el.querySelector('.card-front').classList.add('border-emerald-500', 'bg-emerald-50');
          c2.el.querySelector('.card-front').classList.add('border-emerald-500', 'bg-emerald-50');

          matchedCount++;
          document.getElementById('memo-pairs').innerText = `${matchedCount} / ${basePairs.length}`;
          flippedCards = [];
          isLocked = false;

          if (matchedCount === basePairs.length) {
            clearInterval(timerInterval);
            showMemoVictory();
          }
        }, 500);
      } else {
        if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('memorama', false, false);
        // No coinciden, voltear de regreso
        setTimeout(() => {
          c1.el.classList.remove('flipped');
          c2.el.classList.remove('flipped');
          c1.el.querySelector('.card-inner').classList.remove('rotate-y-180');
          c2.el.querySelector('.card-inner').classList.remove('rotate-y-180');
          flippedCards = [];
          isLocked = false;
        }, 900);
      }
    }
  }

  function showMemoVictory() {
    // El tablero ya terminó: guardar la actividad como completada para que la
    // ruta de autoaprendizaje la identifique al volver al panel.
    if (typeof window.reportActivityProgress === 'function') {
      window._activityProgressPromise = window.reportActivityProgress('memorama', true, true);
    }
    triggerConfetti();
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');

    // Cálculo de estrellas
    let stars = '⭐⭐⭐';
    if (moves > 16) stars = '⭐';
    else if (moves > 11) stars = '⭐⭐';

    container.innerHTML = `
      <div class="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-sm text-center space-y-6 animate-fadeIn">
        <div class="w-20 h-20 mx-auto rounded-full bg-amber-100 text-amber-500 flex items-center justify-center text-4xl shadow-sm">
          🏆
        </div>
        <div>
          <div class="text-3xl mb-1">${stars}</div>
          <h3 class="text-2xl font-bold text-gray-800">¡Memorama Superado!</h3>
          <p class="text-sm text-gray-500 mt-1">Emparejaste todos los países con sus banderas.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
          <div class="bg-blue-50 p-3 rounded-2xl border border-blue-100">
            <span class="text-xs text-gray-400 block font-semibold">Tiempo</span>
            <span class="text-xl font-bold text-[#2470BB]">${m}:${s}</span>
          </div>
          <div class="bg-amber-50 p-3 rounded-2xl border border-amber-100">
            <span class="text-xs text-amber-600 block font-semibold">Movimientos</span>
            <span class="text-xl font-bold text-amber-700">${moves}</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-3">
          <button id="btn-replay-memo" class="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1.5"></i> Jugar otra vez
          </button>
          <button id="btn-exit-memo" class="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-bold text-sm transition cursor-pointer">
            Volver
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-memo').onclick = () => renderMemoramaActivity(container, data, onExit);
    document.getElementById('btn-exit-memo').onclick = onExit;
  }

  document.getElementById('btn-restart-memo').onclick = () => {
    if (timerInterval) clearInterval(timerInterval);
    renderMemoramaActivity(container, data, onExit);
  };

  const topExitMemo = document.getElementById('btn-exit-memo-top');
  if (topExitMemo) {
    topExitMemo.onclick = () => {
      if (timerInterval) clearInterval(timerInterval);
      if (typeof onExit === 'function') onExit();
    };
  }
}

// ==============================================================================
// 3. ACTIVIDAD: CRUCIGRAMA TEMÁTICO (CROSSWORD PUZZLE ENGINE CON AUTO-LAYOUT)
// ==============================================================================

// Helper: Generador inteligente de crucigramas mediante búsqueda multi-intento (Monte Carlo Crossword Optimization)
export function generateCrosswordLayout(rawWords, maxTrials = 300) {
  if (!rawWords || !rawWords.length) {
    return { words: [], bounds: { rows: 0, cols: 0 }, cellMap: new Map() };
  }

  // 1. Limpiar y normalizar palabras (solo letras A-Z, longitud >= 2)
  const cleanWords = rawWords.map((w, idx) => ({
    id: idx + 1,
    word: (w.word || '').trim().toUpperCase().replace(/[^A-Z]/g, ''),
    clue: (w.clue || '').trim(),
    original: w
  })).filter(w => w.word.length >= 2);

  if (!cleanWords.length) {
    return { words: [], bounds: { rows: 0, cols: 0 }, cellMap: new Map() };
  }

  // 2. Ejecutar múltiples ensayos aleatorios para encontrar la disposición con mayor interconexión y menor área
  let bestPlaced = null;
  let bestScore = -Infinity;

  for (let trial = 0; trial < maxTrials; trial++) {
    // Barajar palabras
    const words = [...cleanWords].sort(() => Math.random() - 0.5);
    // Colocar una de las palabras más largas al inicio
    const firstIdx = Math.floor(Math.random() * Math.min(3, words.length));
    const firstWord = words.splice(firstIdx, 1)[0];
    words.unshift(firstWord);

    const grid = new Map(); // "r,c" -> char
    const placed = [];

    function canPlace(wordStr, row, col, dir) {
      const dr = dir === 'down' ? 1 : 0;
      const dc = dir === 'across' ? 1 : 0;
      const len = wordStr.length;

      // Las celdas inmediatamente anterior y posterior deben estar libres (no pegarse en la misma línea)
      if (grid.has(`${row - dr},${col - dc}`) || grid.has(`${row + dr * len},${col + dc * len}`)) {
        return false;
      }

      let intersections = 0;

      for (let i = 0; i < len; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        const key = `${r},${c}`;

        if (grid.has(key)) {
          if (grid.get(key) !== wordStr[i]) return false; // Colisión de letras incompatibles
          intersections++;
        } else {
          // Verificar celdas paralelas vecinas: no deben tocarse a los lados a menos que sea intersección
          const oR1 = r + (dir === 'across' ? 1 : 0);
          const oC1 = c + (dir === 'across' ? 0 : 1);
          const oR2 = r - (dir === 'across' ? 1 : 0);
          const oC2 = c - (dir === 'across' ? 0 : 1);

          if (grid.has(`${oR1},${oC1}`) || grid.has(`${oR2},${oC2}`)) {
            return false;
          }
        }
      }

      return intersections > 0;
    }

    function place(wObj, row, col, dir) {
      const dr = dir === 'down' ? 1 : 0;
      const dc = dir === 'across' ? 1 : 0;
      const placedObj = { ...wObj, row, col, direction: dir };
      for (let i = 0; i < wObj.word.length; i++) {
        grid.set(`${row + dr * i},${col + dc * i}`, wObj.word[i]);
      }
      placed.push(placedObj);
    }

    // Colocar la primera palabra en (0, 0)
    place(words[0], 0, 0, trial % 2 === 0 ? 'across' : 'down');

    // Intentar colocar las palabras restantes buscando la mejor intersección
    for (let i = 1; i < words.length; i++) {
      const candidate = words[i];
      const validPlacements = [];

      for (const p of placed) {
        const targetDir = p.direction === 'across' ? 'down' : 'across';
        const dr = targetDir === 'down' ? 1 : 0;
        const dc = targetDir === 'across' ? 1 : 0;

        for (let ci = 0; ci < candidate.word.length; ci++) {
          const char = candidate.word[ci];
          for (let pi = 0; pi < p.word.length; pi++) {
            if (p.word[pi] === char) {
              const intR = p.row + (p.direction === 'down' ? pi : 0);
              const intC = p.col + (p.direction === 'across' ? pi : 0);
              const startR = intR - ci * dr;
              const startC = intC - ci * dc;

              if (canPlace(candidate.word, startR, startC, targetDir)) {
                validPlacements.push({ row: startR, col: startC, dir: targetDir });
              }
            }
          }
        }
      }

      if (validPlacements.length > 0) {
        // Elegir la posición que minimice el tamaño de la cuadrícula
        let bestP = validPlacements[0];
        let minArea = Infinity;
        validPlacements.forEach(pos => {
          let minR = pos.row, maxR = pos.row + (pos.dir === 'down' ? candidate.word.length - 1 : 0);
          let minC = pos.col, maxC = pos.col + (pos.dir === 'across' ? candidate.word.length - 1 : 0);
          placed.forEach(w => {
            const wDr = w.direction === 'down' ? 1 : 0;
            const wDc = w.direction === 'across' ? 1 : 0;
            minR = Math.min(minR, w.row);
            maxR = Math.max(maxR, w.row + wDr * (w.word.length - 1));
            minC = Math.min(minC, w.col);
            maxC = Math.max(maxC, w.col + wDc * (w.word.length - 1));
          });
          const area = (maxR - minR + 1) * (maxC - minC + 1);
          if (area < minArea) {
            minArea = area;
            bestP = pos;
          }
        });
        place(candidate, bestP.row, bestP.col, bestP.dir);
      }
    }

    // Calcular puntaje del ensayo basado EXCLUSIVAMENTE en palabras genuinamente conectadas
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    placed.forEach(w => {
      const dr = w.direction === 'down' ? 1 : 0;
      const dc = w.direction === 'across' ? 1 : 0;
      minR = Math.min(minR, w.row);
      maxR = Math.max(maxR, w.row + dr * (w.word.length - 1));
      minC = Math.min(minC, w.col);
      maxC = Math.max(maxC, w.col + dc * (w.word.length - 1));
    });

    const area = (maxR - minR + 1) * (maxC - minC + 1);
    // Prioridad absoluta: cantidad de palabras conectadas (factor 100,000), luego compacidad
    const score = placed.length * 100000 - area * 10;

    if (score > bestScore) {
      bestScore = score;
      bestPlaced = placed;
    }

    // Si todas las palabras están perfectamente intersectadas y compactas, terminar temprano
    if (placed.length === cleanWords.length && area <= cleanWords.length * 16) {
      break;
    }
  }

  // 3. Fallback: Si quedaron palabras que no compartían letras para intersectar, ubicarlas con margen
  if (bestPlaced.length < cleanWords.length) {
    const placedSet = new Set(bestPlaced.map(p => p.id));
    const unplaced = cleanWords.filter(w => !placedSet.has(w.id));
    let curBottom = 0;
    bestPlaced.forEach(w => {
      const dr = w.direction === 'down' ? 1 : 0;
      curBottom = Math.max(curBottom, w.row + dr * (w.word.length - 1));
    });

    unplaced.forEach(u => {
      curBottom += 2;
      bestPlaced.push({
        ...u,
        row: curBottom,
        col: 0,
        direction: 'across'
      });
    });
  }

  // 4. Normalizar coordenadas para que minRow = 1, minCol = 1
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  bestPlaced.forEach(w => {
    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    minR = Math.min(minR, w.row);
    maxR = Math.max(maxR, w.row + dr * (w.word.length - 1));
    minC = Math.min(minC, w.col);
    maxC = Math.max(maxC, w.col + dc * (w.word.length - 1));
  });

  const rowOffset = 1 - minR;
  const colOffset = 1 - minC;

  bestPlaced.forEach(w => {
    w.row += rowOffset;
    w.col += colOffset;
  });

  const totalRows = maxR + rowOffset;
  const totalCols = maxC + colOffset;

  // 5. Asignar numeración clásica de crucigrama (arriba-abajo, izquierda-derecha)
  const startCells = new Map();
  bestPlaced.forEach(w => {
    const key = `${w.row}-${w.col}`;
    if (!startCells.has(key)) {
      startCells.set(key, []);
    }
    startCells.get(key).push(w);
  });

  const sortedKeys = Array.from(startCells.keys()).sort((a, b) => {
    const [r1, c1] = a.split('-').map(Number);
    const [r2, c2] = b.split('-').map(Number);
    return r1 !== r2 ? r1 - r2 : c1 - c2;
  });

  let num = 1;
  sortedKeys.forEach(k => {
    const group = startCells.get(k);
    group.forEach(w => {
      w.number = num;
    });
    num++;
  });

  // 6. Construir mapa de celdas activas
  const cellMap = new Map();
  bestPlaced.forEach(w => {
    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + dr * i;
      const c = w.col + dc * i;
      const key = `${r}-${c}`;
      if (!cellMap.has(key)) {
        cellMap.set(key, {
          row: r,
          col: c,
          correctChar: w.word[i],
          number: (i === 0) ? w.number : null,
          words: [w]
        });
      } else {
        const existing = cellMap.get(key);
        if (i === 0) existing.number = w.number;
        existing.words.push(w);
      }
    }
  });

  return {
    words: bestPlaced,
    bounds: { rows: Math.max(totalRows, 1), cols: Math.max(totalCols, 1) },
    cellMap
  };
}

export function renderCrucigramaActivity(container, data, onExit) {
  const rawWords = data.words || [
    { word: 'CANADA', clue: 'Second largest country in the world (Capital: Ottawa)' },
    { word: 'CHILE', clue: 'Long and narrow country in South America' },
    { word: 'BRAZIL', clue: 'Largest country in South America (Famous for carnival)' },
    { word: 'QUITO', clue: 'Capital city of Ecuador located in the Andes' },
    { word: 'SPAIN', clue: 'European country where Madrid is the capital' },
    { word: 'JAPAN', clue: 'Asian island nation, land of the rising sun' }
  ];

  // Generar disposición perfecta mediante algoritmo multi-intento
  const layout = generateCrosswordLayout(rawWords);
  const words = layout.words;
  const { rows, cols } = layout.bounds;
  const cellMap = layout.cellMap;

  const handleExit = () => {
    window.removeEventListener('keydown', keydownHandler);
    if (typeof onExit === 'function') onExit();
  };

  if (!words.length) {
    container.innerHTML = `
      <div class="max-w-md mx-auto p-8 bg-white rounded-3xl border shadow-sm text-center space-y-4">
        <div class="text-4xl">✏️</div>
        <h3 class="font-bold text-gray-800">No hay palabras configuradas para el crucigrama</h3>
        <p class="text-xs text-gray-500">Agrega palabras y pistas desde el panel docente.</p>
        <button id="btn-cw-empty-exit" class="px-5 py-2.5 bg-sky-500 text-white rounded-xl text-xs font-bold hover:bg-sky-600 transition cursor-pointer">
          Volver
        </button>
      </div>`;
    const btn = document.getElementById('btn-cw-empty-exit');
    if (btn) btn.onclick = handleExit;
    return;
  }

  const acrossClues = words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

  let activeWord = words[0];
  let activeDirection = activeWord.direction;
  let activeCellKey = `${activeWord.row}-${activeWord.col}`;
  const solvedWordsSet = new Set();

  container.innerHTML = `
    <style>
      @keyframes cw-shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-4px); }
        40%, 80% { transform: translateX(4px); }
      }
      .cw-shake { animation: cw-shake 0.4s ease-in-out; }
    </style>
    <div class="max-w-5xl mx-auto space-y-4 pb-12 animate-fadeIn select-none">
      <!-- Barra Superior -->
      <div class="bg-white p-4 rounded-3xl border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button id="btn-cw-back" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Volver</span>
          </button>
          <div>
            <h3 class="font-bold text-gray-800 text-base">${data.titulo || 'Crucigrama Temático'}</h3>
            <p id="cw-progress-label" class="text-xs text-sky-600 font-semibold mt-0.5">
              <span id="cw-solved-badge" class="px-2 py-0.5 bg-sky-50 text-[#2470BB] rounded-md font-bold">0 / ${words.length} palabras resueltas</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btn-hint-letter-cw" class="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="Revela la letra de la casilla actual">
            <i class="fa-solid fa-lightbulb"></i>
            <span class="hidden sm:inline">Pista Letra</span>
          </button>
          <button id="btn-hint-word-cw" class="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="Revela la palabra activa completa">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span class="hidden sm:inline">Revelar Palabra</span>
          </button>
          <button id="btn-clear-cw" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer" title="Limpiar casillas no resueltas">
            <i class="fa-solid fa-eraser"></i>
            <span class="hidden sm:inline">Limpiar</span>
          </button>
          <button id="btn-check-cw" class="px-4 md:px-5 py-2 bg-[#2470BB] hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
            <i class="fa-solid fa-check"></i>
            <span>Comprobar</span>
          </button>
        </div>
      </div>

      <!-- Barra de Pista Activa Superior (Prominente, con navegación e interacción) -->
      <div class="bg-gradient-to-r from-sky-600 via-[#2470BB] to-blue-700 text-white p-3.5 md:p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <button id="btn-prev-clue" class="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0" title="Pista anterior (o Tecla Arriba/Shift+Tab)">
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <div id="cw-clue-banner-center" class="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 text-center md:text-left cursor-pointer" title="Pulsa para alternar orientación horizontal/vertical">
          <span id="cw-active-badge" class="px-2.5 py-1 bg-white text-[#2470BB] rounded-lg text-xs font-black uppercase tracking-wider shrink-0 shadow-xs">
            ${activeWord.number} ${activeWord.direction === 'across' ? 'Across ➡️' : 'Down ⬇️'}
          </span>
          <span id="cw-active-clue-text" class="text-sm md:text-base font-bold leading-snug line-clamp-2">
            ${activeWord.clue}
          </span>
          <span class="text-xs text-sky-200 font-semibold shrink-0">(${activeWord.word.length} letras)</span>
        </div>

        <button id="btn-next-clue" class="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0" title="Pista siguiente (o Enter/Tab)">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <!-- Tablero del Crucigrama + Panel de Pistas -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        <!-- Tablero Interactivo (7 cols) -->
        <div class="lg:col-span-7 bg-white p-3.5 md:p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center">
          
          <div class="w-full overflow-x-auto flex justify-center py-2">
            <div 
              id="cw-grid" 
              class="grid gap-1 md:gap-1.5 p-2 bg-slate-50/90 rounded-2xl border border-slate-200"
              style="grid-template-columns: repeat(${cols}, clamp(28px, 6.5vw, 40px));"
            ></div>
          </div>

          <!-- Teclado Táctil en Pantalla (Diseñado para móviles, tablets y clic rápido) -->
          <div id="cw-virtual-keypad" class="w-full max-w-lg mt-3 p-2 bg-slate-100/80 rounded-2xl border border-slate-200 space-y-1.5">
            <div class="flex justify-center gap-1" data-row="1">
              ${['Q','W','E','R','T','Y','U','I','O','P'].map(l => `
                <button type="button" class="cw-key flex-1 h-9 sm:h-10 bg-white hover:bg-sky-50 active:scale-95 text-gray-800 font-black text-xs sm:text-sm rounded-lg border border-slate-200 shadow-2xs transition select-none cursor-pointer" data-letter="${l}">${l}</button>
              `).join('')}
            </div>
            <div class="flex justify-center gap-1 px-2" data-row="2">
              ${['A','S','D','F','G','H','J','K','L'].map(l => `
                <button type="button" class="cw-key flex-1 h-9 sm:h-10 bg-white hover:bg-sky-50 active:scale-95 text-gray-800 font-black text-xs sm:text-sm rounded-lg border border-slate-200 shadow-2xs transition select-none cursor-pointer" data-letter="${l}">${l}</button>
              `).join('')}
            </div>
            <div class="flex justify-center gap-1" data-row="3">
              <button type="button" id="cw-key-backspace" class="w-11 sm:w-14 h-9 sm:h-10 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-black text-xs sm:text-sm rounded-lg border border-rose-200 shadow-2xs transition select-none flex items-center justify-center cursor-pointer" title="Borrar letra">
                <i class="fa-solid fa-delete-left"></i>
              </button>
              ${['Z','X','C','V','B','N','M'].map(l => `
                <button type="button" class="cw-key flex-1 h-9 sm:h-10 bg-white hover:bg-sky-50 active:scale-95 text-gray-800 font-black text-xs sm:text-sm rounded-lg border border-slate-200 shadow-2xs transition select-none cursor-pointer" data-letter="${l}">${l}</button>
              `).join('')}
              <button type="button" id="cw-key-next" class="w-11 sm:w-14 h-9 sm:h-10 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 font-black text-xs sm:text-sm rounded-lg border border-sky-200 shadow-2xs transition select-none flex items-center justify-center cursor-pointer" title="Siguiente palabra">
                <i class="fa-solid fa-forward-step"></i>
              </button>
            </div>
          </div>

          <div class="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-[11px] text-gray-400 font-semibold">
            <span><i class="fa-regular fa-keyboard mr-1 text-sky-500"></i>Usa teclado físico o botones en pantalla</span>
            <span><i class="fa-solid fa-arrows-rotate mr-1 text-sky-500"></i>Toca la casilla para alternar dirección</span>
          </div>
        </div>

        <!-- Panel de Pistas Clasificadas (5 cols) -->
        <div class="lg:col-span-5 bg-white p-4 md:p-5 rounded-3xl border shadow-sm space-y-4 max-h-[660px] overflow-y-auto">
          <!-- Horizontales -->
          ${acrossClues.length ? `
            <div>
              <h4 class="font-bold text-sky-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i class="fa-solid fa-arrow-right"></i>
                <span>Horizontales (Across)</span>
              </h4>
              <div class="space-y-1.5 text-xs">
                ${acrossClues.map(w => `
                  <div 
                    class="cw-clue-item p-2.5 rounded-xl border border-slate-100 hover:border-sky-300 hover:bg-sky-50/80 transition cursor-pointer flex items-start justify-between gap-2"
                    data-word-id="${w.id}"
                    data-direction="across"
                  >
                    <div class="flex-1">
                      <span class="font-bold text-[#2470BB] mr-1">${w.number}.</span>
                      <span class="text-gray-700 font-medium">${w.clue}</span>
                      <span class="text-[10px] text-gray-400 block mt-0.5">(${w.word.length} letras)</span>
                    </div>
                    <span class="cw-status-icon text-gray-300 text-xs mt-0.5"></span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Verticales -->
          ${downClues.length ? `
            <div>
              <h4 class="font-bold text-emerald-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i class="fa-solid fa-arrow-down"></i>
                <span>Verticales (Down)</span>
              </h4>
              <div class="space-y-1.5 text-xs">
                ${downClues.map(w => `
                  <div 
                    class="cw-clue-item p-2.5 rounded-xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/80 transition cursor-pointer flex items-start justify-between gap-2"
                    data-word-id="${w.id}"
                    data-direction="down"
                  >
                    <div class="flex-1">
                      <span class="font-bold text-emerald-700 mr-1">${w.number}.</span>
                      <span class="text-gray-700 font-medium">${w.clue}</span>
                      <span class="text-[10px] text-gray-400 block mt-0.5">(${w.word.length} letras)</span>
                    </div>
                    <span class="cw-status-icon text-gray-300 text-xs mt-0.5"></span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

      </div>
    </div>
  `;

  const grid = document.getElementById('cw-grid');
  const backBtn = document.getElementById('btn-cw-back');
  const checkBtn = document.getElementById('btn-check-cw');
  const hintLetterBtn = document.getElementById('btn-hint-letter-cw');
  const hintWordBtn = document.getElementById('btn-hint-word-cw');
  const clearBtn = document.getElementById('btn-clear-cw');
  const prevClueBtn = document.getElementById('btn-prev-clue');
  const nextClueBtn = document.getElementById('btn-next-clue');
  const activeBadge = document.getElementById('cw-active-badge');
  const activeClueText = document.getElementById('cw-active-clue-text');
  const clueBannerCenter = document.getElementById('cw-clue-banner-center');

  if (backBtn) backBtn.onclick = handleExit;

  // Renderizar casillas del tablero
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`;
      const cellData = cellMap.get(key);

      const cell = document.createElement('div');
      cell.className = 'w-full aspect-square rounded-xl flex items-center justify-center relative select-none transition-all';

      if (cellData) {
        cell.className += ' bg-white border-2 border-slate-300 shadow-2xs font-black text-xs sm:text-sm md:text-base text-gray-800 cursor-pointer cw-active-tile';
        cell.dataset.key = key;
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.dataset.correct = cellData.correctChar;

        cell.innerHTML = `
          ${cellData.number ? `<span class="absolute top-0.5 left-1 text-[8px] md:text-[9px] font-black text-[#2470BB] pointer-events-none">${cellData.number}</span>` : ''}
          <input 
            type="text" 
            maxlength="1" 
            data-key="${key}"
            data-row="${r}"
            data-col="${c}"
            class="cw-cell-input w-full h-full text-center uppercase font-black bg-transparent outline-none cursor-pointer rounded-xl caret-transparent"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="characters"
            spellcheck="false"
          />
        `;

        const input = cell.querySelector('input');

        // Clic directo en casilla: alterna orientación si es intersección ya activa
        cell.addEventListener('click', (e) => {
          selectCell(r, c, true);
        });

        // Evento de foco nativo
        input.addEventListener('focus', () => {
          selectCell(r, c, false);
        });

        // Evento input nativo
        input.addEventListener('input', (e) => {
          let val = input.value.trim().toUpperCase().replace(/[^A-Z]/g, '');
          if (val.length > 1) val = val.slice(-1);
          input.value = val;

          if (val) {
            handleLetterInput(val, r, c);
          }
        });

        grid.appendChild(cell);
      } else {
        // Celda vacía no jugable
        cell.className += ' invisible pointer-events-none';
        grid.appendChild(cell);
      }
    }
  }

  function selectCell(r, c, allowToggle = false) {
    const key = `${r}-${c}`;
    const cellData = cellMap.get(key);
    if (!cellData) return;

    if (activeCellKey === key && cellData.words.length > 1 && allowToggle) {
      activeDirection = activeDirection === 'across' ? 'down' : 'across';
    }

    activeCellKey = key;

    const match = cellData.words.find(w => w.direction === activeDirection) || cellData.words[0];
    if (match) {
      activeWord = match;
      activeDirection = match.direction;
    }

    updateBoardUI();

    const inp = document.querySelector(`.cw-cell-input[data-key="${key}"]`);
    if (inp && document.activeElement !== inp) {
      inp.focus();
    }
  }

  function handleLetterInput(letter, r, c) {
    const key = `${r}-${c}`;
    const inp = document.querySelector(`.cw-cell-input[data-key="${key}"]`);
    if (inp) {
      inp.value = letter;
      inp.classList.remove('text-rose-600', 'bg-rose-50', 'border-rose-400', 'cw-shake');
    }

    // Avanzar a la siguiente celda en la palabra activa
    advanceNextInWord(r, c);

    // Verificar en tiempo real si se completó la palabra activa
    checkWordRealtime(activeWord);

    // Verificar también la palabra transversal si esta celda es una intersección
    const cellData = cellMap.get(key);
    if (cellData && cellData.words.length > 1) {
      const crossWord = cellData.words.find(w => w.id !== activeWord.id);
      if (crossWord) checkWordRealtime(crossWord);
    }
  }

  function deleteCurrentLetter() {
    const inp = document.querySelector(`.cw-cell-input[data-key="${activeCellKey}"]`);
    if (inp && inp.value) {
      inp.value = '';
      inp.classList.remove('text-rose-600', 'bg-rose-50', 'border-rose-400', 'text-emerald-700', 'bg-emerald-50');
    } else {
      // Si ya estaba vacía, retroceder a la celda anterior y limpiarla
      const [r, c] = activeCellKey.split('-').map(Number);
      retreatPrevInWord(r, c);
    }
  }

  function advanceNextInWord(r, c) {
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;

    // Buscar la siguiente celda de la palabra que esté VACÍA
    let foundEmpty = false;
    for (let i = 0; i < activeWord.word.length; i++) {
      const cellR = activeWord.row + dr * i;
      const cellC = activeWord.col + dc * i;
      const isAfterCurrent = (activeWord.direction === 'across' && cellC > c) || (activeWord.direction === 'down' && cellR > r);

      if (isAfterCurrent) {
        const checkInp = document.querySelector(`.cw-cell-input[data-key="${cellR}-${cellC}"]`);
        if (checkInp && !checkInp.value) {
          moveToCell(cellR, cellC);
          foundEmpty = true;
          break;
        }
      }
    }

    // Si todas las siguientes están llenas, avanzar a la celda inmediatamente posterior si existe
    if (!foundEmpty) {
      const endR = activeWord.row + dr * (activeWord.word.length - 1);
      const endC = activeWord.col + dc * (activeWord.word.length - 1);
      const nextR = r + dr;
      const nextC = c + dc;

      if ((activeWord.direction === 'across' && nextC <= endC) || (activeWord.direction === 'down' && nextR <= endR)) {
        moveToCell(nextR, nextC);
      }
    }
  }

  function retreatPrevInWord(r, c) {
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;

    const prevR = r - dr;
    const prevC = c - dc;

    if ((activeWord.direction === 'across' && prevC >= activeWord.col) || (activeWord.direction === 'down' && prevR >= activeWord.row)) {
      const prevInp = document.querySelector(`.cw-cell-input[data-key="${prevR}-${prevC}"]`);
      if (prevInp) {
        prevInp.value = '';
        prevInp.classList.remove('text-rose-600', 'bg-rose-50', 'border-rose-400');
        moveToCell(prevR, prevC);
      }
    }
  }

  function moveToCell(r, c) {
    const target = document.querySelector(`.cw-cell-input[data-key="${r}-${c}"]`);
    if (target) {
      selectCell(r, c, false);
      target.focus();
    }
  }

  function checkWordRealtime(w) {
    if (solvedWordsSet.has(w.id)) return;

    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    let fullWordTyped = '';
    let isFullyTyped = true;

    for (let i = 0; i < w.word.length; i++) {
      const k = `${w.row + dr * i}-${w.col + dc * i}`;
      const inp = document.querySelector(`.cw-cell-input[data-key="${k}"]`);
      const val = (inp?.value || '').trim().toUpperCase();
      if (!val) {
        isFullyTyped = false;
        break;
      }
      fullWordTyped += val;
    }

    if (isFullyTyped && fullWordTyped === w.word) {
      // ¡Palabra completada correctamente en tiempo real!
      solvedWordsSet.add(w.id);

      // Resaltar celdas en verde esmeralda
      for (let i = 0; i < w.word.length; i++) {
        const k = `${w.row + dr * i}-${w.col + dc * i}`;
        const inp = document.querySelector(`.cw-cell-input[data-key="${k}"]`);
        if (inp) {
          inp.classList.remove('text-rose-600', 'bg-rose-50', 'border-rose-400');
          inp.classList.add('text-emerald-700', 'bg-emerald-50', 'border-emerald-400');
        }
      }

      // Marcar en la lista de pistas
      const clueItem = container.querySelector(`.cw-clue-item[data-word-id="${w.id}"]`);
      if (clueItem) {
        const statusIcon = clueItem.querySelector('.cw-status-icon');
        if (statusIcon) statusIcon.innerHTML = `<span class="text-emerald-600 font-bold">✓</span>`;
        clueItem.classList.add('line-through', 'opacity-70');
      }

      if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('crucigrama', true, solvedWordsSet.size === words.length);

      // Actualizar contador
      const badge = document.getElementById('cw-solved-badge');
      if (badge) {
        badge.innerText = `${solvedWordsSet.size} / ${words.length} palabras resueltas`;
      }

      // Comprobar victoria global
      if (solvedWordsSet.size === words.length) {
        triggerConfetti();
        setTimeout(() => {
          showCrosswordVictory(words.length);
        }, 500);
      }
    }
  }

  function updateBoardUI() {
    // 1. Celdas de la palabra activa
    const activeWordKeys = new Set();
    const dr = activeWord.direction === 'down' ? 1 : 0;
    const dc = activeWord.direction === 'across' ? 1 : 0;
    for (let i = 0; i < activeWord.word.length; i++) {
      activeWordKeys.add(`${activeWord.row + dr * i}-${activeWord.col + dc * i}`);
    }

    // 2. Resaltar celdas en el tablero
    container.querySelectorAll('.cw-active-tile').forEach(tile => {
      const key = tile.dataset.key;
      const isSelected = key === activeCellKey;
      const isWordActive = activeWordKeys.has(key);

      tile.classList.remove('border-[#2470BB]', 'bg-sky-100', 'bg-sky-50', 'border-sky-400', 'ring-2', 'ring-[#2470BB]');

      if (isSelected) {
        tile.classList.add('border-[#2470BB]', 'bg-sky-100', 'ring-2', 'ring-[#2470BB]');
      } else if (isWordActive) {
        tile.classList.add('border-sky-400', 'bg-sky-50');
      } else {
        tile.classList.add('border-slate-300', 'bg-white');
      }
    });

    // 3. Actualizar Barra de Pista Activa Superior
    if (activeBadge) {
      const dirTxt = activeWord.direction === 'across' ? 'Across ➡️' : 'Down ⬇️';
      activeBadge.innerText = `${activeWord.number} ${dirTxt}`;
    }
    if (activeClueText) {
      activeClueText.innerText = activeWord.clue;
    }

    // 4. Actualizar lista lateral de pistas
    container.querySelectorAll('.cw-clue-item').forEach(clueEl => {
      const id = parseInt(clueEl.dataset.wordId, 10);
      const isClueActive = id === activeWord.id;

      clueEl.classList.remove('bg-sky-100', 'border-[#2470BB]', 'bg-emerald-100', 'border-emerald-600', 'shadow-xs');

      if (isClueActive) {
        if (activeWord.direction === 'across') {
          clueEl.classList.add('bg-sky-100', 'border-[#2470BB]', 'shadow-xs');
        } else {
          clueEl.classList.add('bg-emerald-100', 'border-emerald-600', 'shadow-xs');
        }
        clueEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function stepClue(step) {
    const curIdx = words.findIndex(w => w.id === activeWord.id);
    let nextIdx = (curIdx + step + words.length) % words.length;
    const nextWord = words[nextIdx];
    activeWord = nextWord;
    activeDirection = nextWord.direction;
    activeCellKey = `${nextWord.row}-${nextWord.col}`;
    updateBoardUI();
    moveToCell(nextWord.row, nextWord.col);
  }

  // Navegación de pistas
  if (prevClueBtn) prevClueBtn.onclick = () => stepClue(-1);
  if (nextClueBtn) nextClueBtn.onclick = () => stepClue(1);

  if (clueBannerCenter) {
    clueBannerCenter.onclick = () => {
      const currCell = cellMap.get(activeCellKey);
      if (currCell && currCell.words.length > 1) {
        activeDirection = activeDirection === 'across' ? 'down' : 'across';
        activeWord = currCell.words.find(w => w.direction === activeDirection) || currCell.words[0];
        updateBoardUI();
      } else {
        stepClue(1);
      }
    };
  }

  // Clic en pistas de la barra lateral
  container.querySelectorAll('.cw-clue-item').forEach(clueEl => {
    clueEl.onclick = () => {
      const id = parseInt(clueEl.dataset.wordId, 10);
      const w = words.find(item => item.id === id);
      if (w) {
        activeWord = w;
        activeDirection = w.direction;
        activeCellKey = `${w.row}-${w.col}`;
        updateBoardUI();
        moveToCell(w.row, w.col);
      }
    };
  });

  // Conectar Teclado Táctil Virtual en Pantalla
  container.querySelectorAll('.cw-key').forEach(btn => {
    btn.onclick = () => {
      const letter = btn.dataset.letter;
      const [r, c] = activeCellKey.split('-').map(Number);
      handleLetterInput(letter, r, c);
    };
  });

  const virtualBackspace = document.getElementById('cw-key-backspace');
  if (virtualBackspace) {
    virtualBackspace.onclick = () => deleteCurrentLetter();
  }

  const virtualNext = document.getElementById('cw-key-next');
  if (virtualNext) {
    virtualNext.onclick = () => stepClue(1);
  }

  // Botón Pista Letra
  if (hintLetterBtn) {
    hintLetterBtn.onclick = () => {
      let targetInput = document.querySelector(`.cw-cell-input[data-key="${activeCellKey}"]`);
      if (!targetInput || targetInput.value) {
        // Buscar la primera casilla vacía en la palabra activa
        const dr = activeWord.direction === 'down' ? 1 : 0;
        const dc = activeWord.direction === 'across' ? 1 : 0;
        for (let i = 0; i < activeWord.word.length; i++) {
          const k = `${activeWord.row + dr * i}-${activeWord.col + dc * i}`;
          const inp = document.querySelector(`.cw-cell-input[data-key="${k}"]`);
          if (inp && !inp.value) {
            targetInput = inp;
            activeCellKey = k;
            break;
          }
        }
      }

      if (targetInput) {
        const correct = cellMap.get(targetInput.dataset.key)?.correctChar;
        if (correct) {
          targetInput.value = correct;
          targetInput.classList.remove('text-rose-600', 'bg-rose-50');
          targetInput.classList.add('text-amber-600', 'bg-amber-50', 'border-amber-300');
          const [r, c] = targetInput.dataset.key.split('-').map(Number);
          advanceNextInWord(r, c);
          checkWordRealtime(activeWord);
        }
      }
    };
  }

  // Botón Revelar Palabra
  if (hintWordBtn) {
    hintWordBtn.onclick = () => {
      const dr = activeWord.direction === 'down' ? 1 : 0;
      const dc = activeWord.direction === 'across' ? 1 : 0;
      for (let i = 0; i < activeWord.word.length; i++) {
        const k = `${activeWord.row + dr * i}-${activeWord.col + dc * i}`;
        const inp = document.querySelector(`.cw-cell-input[data-key="${k}"]`);
        if (inp) {
          inp.value = activeWord.word[i];
          inp.classList.remove('text-rose-600', 'bg-rose-50');
          inp.classList.add('text-amber-600', 'bg-amber-50', 'border-amber-300');
        }
      }
      checkWordRealtime(activeWord);
      stepClue(1);
    };
  }

  // Botón Limpiar (solo limpia casillas que no estén ya resueltas)
  if (clearBtn) {
    clearBtn.onclick = () => {
      words.forEach(w => {
        if (!solvedWordsSet.has(w.id)) {
          const dr = w.direction === 'down' ? 1 : 0;
          const dc = w.direction === 'across' ? 1 : 0;
          for (let i = 0; i < w.word.length; i++) {
            const k = `${w.row + dr * i}-${w.col + dc * i}`;
            const cellData = cellMap.get(k);
            const isSharedWithSolved = cellData?.words.some(sw => sw.id !== w.id && solvedWordsSet.has(sw.id));
            if (!isSharedWithSolved) {
              const inp = document.querySelector(`.cw-cell-input[data-key="${k}"]`);
              if (inp) {
                inp.value = '';
                inp.classList.remove('text-emerald-700', 'bg-emerald-50', 'text-rose-600', 'bg-rose-50', 'text-amber-600', 'bg-amber-50');
              }
            }
          }
        }
      });
      moveToCell(activeWord.row, activeWord.col);
    };
  }

  // Botón Comprobar (marca errores en rojo con animación de sacudida)
  if (checkBtn) {
    checkBtn.onclick = () => {
      let totalFilled = 0;
      let totalCorrect = 0;

      cellMap.forEach((cData, key) => {
        const inp = document.querySelector(`.cw-cell-input[data-key="${key}"]`);
        const val = inp?.value?.trim().toUpperCase();

        if (val) {
          totalFilled++;
          if (val === cData.correctChar) {
            totalCorrect++;
            inp.classList.remove('text-rose-600', 'bg-rose-50', 'border-rose-400', 'cw-shake');
            inp.classList.add('text-emerald-700', 'bg-emerald-50');
          } else {
            inp.classList.remove('text-emerald-700', 'bg-emerald-50');
            inp.classList.add('text-rose-600', 'bg-rose-50', 'border-rose-400', 'cw-shake');
            setTimeout(() => inp.classList.remove('cw-shake'), 500);
          }
        }
      });

      // Chequear todas las palabras
      words.forEach(w => checkWordRealtime(w));

      if (solvedWordsSet.size === words.length) {
        triggerConfetti();
        showCrosswordVictory(words.length);
      }
    };
  }

  function showCrosswordVictory(totalWords) {
    window.removeEventListener('keydown', keydownHandler);
    container.innerHTML = `
      <div class="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-sm text-center space-y-6 animate-fadeIn">
        <div class="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl shadow-sm">
          🏆
        </div>
        <div>
          <div class="text-3xl mb-1">⭐⭐⭐</div>
          <h3 class="text-2xl font-bold text-gray-800">¡Crucigrama Completado!</h3>
          <p class="text-sm text-gray-500 mt-1">Has resuelto todas las palabras del crucigrama con éxito.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
          <div class="bg-blue-50 p-3 rounded-2xl border border-blue-100">
            <span class="text-xs text-gray-400 block font-semibold">Palabras</span>
            <span class="text-xl font-bold text-[#2470BB]">${totalWords} / ${totalWords}</span>
          </div>
          <div class="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
            <span class="text-xs text-emerald-600 block font-semibold">Precisión</span>
            <span class="text-xl font-bold text-emerald-700">100%</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-3">
          <button id="btn-replay-cw" class="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1.5"></i> Jugar otra vez
          </button>
          <button id="btn-exit-cw" class="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-bold text-sm transition cursor-pointer">
            Volver a Actividades
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-cw').onclick = () => renderCrucigramaActivity(container, data, onExit);
    document.getElementById('btn-exit-cw').onclick = handleExit;
  }

  // Manejador de teclado físico
  const keydownHandler = (e) => {
    // Si el usuario está interactuando con otro formulario o elemento fuera del crucigrama, no interferir
    if (e.target && e.target.tagName === 'INPUT' && !e.target.classList.contains('cw-cell-input')) {
      return;
    }

    const key = e.key;

    if (/^[a-zA-Z]$/.test(key)) {
      e.preventDefault();
      const [r, c] = activeCellKey.split('-').map(Number);
      handleLetterInput(key.toUpperCase(), r, c);
    } else if (key === 'Backspace') {
      e.preventDefault();
      deleteCurrentLetter();
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      const [r, c] = activeCellKey.split('-').map(Number);
      moveToCell(r, c + 1);
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      const [r, c] = activeCellKey.split('-').map(Number);
      moveToCell(r, c - 1);
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      const [r, c] = activeCellKey.split('-').map(Number);
      moveToCell(r + 1, c);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      const [r, c] = activeCellKey.split('-').map(Number);
      moveToCell(r - 1, c);
    } else if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      const currCell = cellMap.get(activeCellKey);
      if (currCell && currCell.words.length > 1) {
        activeDirection = activeDirection === 'across' ? 'down' : 'across';
        activeWord = currCell.words.find(w => w.direction === activeDirection) || currCell.words[0];
        updateBoardUI();
      }
    } else if (key === 'Tab' || key === 'Enter') {
      e.preventDefault();
      stepClue(e.shiftKey ? -1 : 1);
    }
  };

  window.addEventListener('keydown', keydownHandler);

  // Iniciar con la primera palabra enfocada
  updateBoardUI();
  setTimeout(() => {
    moveToCell(words[0].row, words[0].col);
  }, 100);
}

// ==============================================================================
// 4. ACTIVIDAD: SOPA DE LETRAS (WORD SEARCH)
// ==============================================================================
export function renderSopaLetrasActivity(container, data, onExit) {
  const defaultWords = data.palabras || [
    { word: 'CANADA', translation: 'Canadá' },
    { word: 'BRAZIL', translation: 'Brasil' },
    { word: 'ECUADOR', translation: 'Ecuador' },
    { word: 'CHILE', translation: 'Chile' },
    { word: 'SPAIN', translation: 'España' },
    { word: 'JAPAN', translation: 'Japón' },
    { word: 'OTTAWA', translation: 'Capital de Canadá' },
    { word: 'QUITO', translation: 'Capital de Ecuador' }
  ];

  const size = data.gridSize || 10;
  const grid = Array.from({ length: size }, () => Array(size).fill(''));

  // Algoritmo de incrustación de palabras
  const directions = [
    { dr: 0, dc: 1 },  // horizontal
    { dr: 1, dc: 0 },  // vertical
    { dr: 1, dc: 1 }   // diagonal
  ];

  const placedWords = [];

  defaultWords.forEach(item => {
    const word = item.word.toUpperCase();
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * size);

      const endR = startR + dir.dr * (word.length - 1);
      const endC = startC + dir.dc * (word.length - 1);

      if (endR >= 0 && endR < size && endC >= 0 && endC < size) {
        // Verificar si choca con letras incompatibles
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const r = startR + dir.dr * i;
          const c = startC + dir.dc * i;
          if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          const cells = [];
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir.dr * i;
            const c = startC + dir.dc * i;
            grid[r][c] = word[i];
            cells.push(`${r}-${c}`);
          }
          placedWords.push({
            ...item,
            word,
            cells
          });
          placed = true;
        }
      }
    }
  });

  // Rellenar espacios vacíos con letras aleatorias A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  let foundWords = new Set();
  let selectedCells = [];
  let isSelecting = false;

  container.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn select-none">
      <!-- Barra Superior -->
      <div class="bg-white p-4 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button id="btn-ws-back" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Volver</span>
          </button>
          <div>
            <h3 class="font-bold text-gray-800 text-base">Sopa de Letras: Countries & Capitals</h3>
            <p class="text-xs text-gray-400">Toca la primera y última letra de cada palabra oculta.</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold px-3 py-1.5 bg-sky-50 text-[#2470BB] rounded-xl border border-sky-100">
            Encontradas: <b id="ws-found-count">0</b> / ${placedWords.length}
          </span>
          <button id="btn-restart-ws" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer" title="Reiniciar sopa">
            <i class="fa-solid fa-rotate-right"></i>
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Cuadrícula (7 cols) -->
        <div class="lg:col-span-7 bg-white p-4 md:p-6 rounded-3xl border shadow-sm flex items-center justify-center overflow-x-auto">
          <div 
            id="ws-grid" 
            class="grid gap-1 md:gap-1.5 p-2 bg-slate-50 rounded-2xl border"
            style="grid-template-columns: repeat(${size}, minmax(28px, 36px));"
          ></div>
        </div>

        <!-- Lista de Palabras (5 cols) -->
        <div class="lg:col-span-5 bg-white p-5 rounded-3xl border shadow-sm space-y-3">
          <h4 class="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Palabras a encontrar:</h4>
          <div id="ws-word-list" class="grid grid-cols-2 gap-2 text-xs">
            ${placedWords.map(w => `
              <div 
                id="ws-item-${w.word}" 
                class="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group hover:bg-sky-50 transition"
              >
                <div>
                  <span class="font-black text-gray-800 group-hover:text-[#2470BB]">${w.word}</span>
                  <span class="text-[10px] text-gray-400 block">${w.translation}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const wsGrid = document.getElementById('ws-grid');
  const backBtn = document.getElementById('btn-ws-back');
  if (backBtn) backBtn.onclick = onExit;

  // Paleta de colores para palabras encontradas
  const wordColors = [
    'bg-emerald-200 text-emerald-900 border-emerald-400',
    'bg-sky-200 text-sky-900 border-sky-400',
    'bg-amber-200 text-amber-900 border-amber-400',
    'bg-purple-200 text-purple-900 border-purple-400',
    'bg-rose-200 text-rose-900 border-rose-400',
    'bg-teal-200 text-teal-900 border-teal-400',
    'bg-indigo-200 text-indigo-900 border-indigo-400',
    'bg-orange-200 text-orange-900 border-orange-400'
  ];

  // Renderizar celdas
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'ws-cell w-7 h-7 md:w-9 md:h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs md:text-sm text-gray-700 cursor-pointer hover:bg-sky-100 transition shadow-2xs select-none';
      cell.innerText = grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.dataset.key = `${r}-${c}`;

      cell.onclick = () => handleCellClick(r, c, cell);

      wsGrid.appendChild(cell);
    }
  }

  let startCell = null;

  function handleCellClick(r, c, cellEl) {
    if (!startCell) {
      // Primer clic
      startCell = { r, c, el: cellEl };
      cellEl.classList.add('bg-sky-400', 'text-white', 'border-sky-500');
    } else {
      // Segundo clic: trazado de línea
      const endCell = { r, c, el: cellEl };
      const path = getCellsBetween(startCell.r, startCell.c, endCell.r, endCell.c);

      if (path.length > 0) {
        checkSelectedPath(path);
      }

      startCell.el.classList.remove('bg-sky-400', 'text-white', 'border-sky-500');
      startCell = null;
    }
  }

  function getCellsBetween(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    // Debe ser estrictamente horizontal, vertical o diagonal a 45 grados
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) {
      return [];
    }

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    const path = [];

    for (let i = 0; i <= steps; i++) {
      path.push(`${r1 + stepR * i}-${c1 + stepC * i}`);
    }

    return path;
  }

  function checkSelectedPath(pathKeys) {
    // Buscar si coincide con alguna palabra colocada
    const matched = placedWords.find(w => {
      if (foundWords.has(w.word)) return false;
      const fwd = w.cells.join(',') === pathKeys.join(',');
      const rev = [...w.cells].reverse().join(',') === pathKeys.join(',');
      return fwd || rev;
    });

    if (matched) {
      foundWords.add(matched.word);
      if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('sopa_letras', true, foundWords.size === placedWords.length);

      const colorClass = wordColors[foundWords.size % wordColors.length];

      // Marcar celdas
      pathKeys.forEach(k => {
        const el = document.querySelector(`.ws-cell[data-key="${k}"]`);
        if (el) {
          el.className = `ws-cell w-7 h-7 md:w-9 md:h-9 rounded-lg border flex items-center justify-center font-black text-xs md:text-sm shadow-2xs select-none ${colorClass}`;
        }
      });

      // Tachar palabra en la lista
      const listItem = document.getElementById(`ws-item-${matched.word}`);
      if (listItem) {
        listItem.className = 'p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 line-through font-bold';
        listItem.innerHTML += `<span class="text-emerald-600 text-xs ml-2">✓</span>`;
      }

      document.getElementById('ws-found-count').innerText = foundWords.size;

      if (foundWords.size === placedWords.length) {
        triggerConfetti();
        setTimeout(() => {
          showWordSearchVictory();
        }, 400);
      }
    }
  }

  function showWordSearchVictory() {
    container.innerHTML = `
      <div class="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-sm text-center space-y-6 animate-fadeIn">
        <div class="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-4xl shadow-sm">
          🏆
        </div>
        <div>
          <div class="text-3xl mb-1">⭐⭐⭐</div>
          <h3 class="text-2xl font-bold text-gray-800">¡Sopa de Letras Completada!</h3>
          <p class="text-sm text-gray-500 mt-1">Has encontrado todas las palabras ocultas en la cuadrícula.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto text-sm">
          <div class="bg-blue-50 p-3 rounded-2xl border border-blue-100">
            <span class="text-xs text-gray-400 block font-semibold">Palabras</span>
            <span class="text-xl font-bold text-[#2470BB]">${placedWords.length} / ${placedWords.length}</span>
          </div>
          <div class="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
            <span class="text-xs text-emerald-600 block font-semibold">Precisión</span>
            <span class="text-xl font-bold text-emerald-700">100%</span>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-3">
          <button id="btn-replay-ws" class="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
            <i class="fa-solid fa-rotate-right mr-1.5"></i> Jugar otra vez
          </button>
          <button id="btn-exit-ws" class="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-bold text-sm transition cursor-pointer">
            Volver a Actividades
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-replay-ws').onclick = () => renderSopaLetrasActivity(container, data, onExit);
    document.getElementById('btn-exit-ws').onclick = onExit;
  }

  document.getElementById('btn-restart-ws').onclick = () => renderSopaLetrasActivity(container, data, onExit);
}

// ==============================================================================
// 5. ACTIVIDAD: EL AHORCADO (HANGMAN CHALLENGE)
// ==============================================================================
export function renderAhorcadoActivity(container, data, onExit) {
  const words = data.palabras || [
    { word: 'ECUADOR', category: 'Countries', hint: 'Country on the equator line with the Galapagos Islands.', image: 'img/6unidad/unit1/ecuador.jpg' },
    { word: 'CANADA', category: 'Countries', hint: 'Northern American nation with maple leaf flag. Capital is Ottawa.', image: 'img/6unidad/unit1/canada.jpg' },
    { word: 'AUSTRALIA', category: 'Countries', hint: 'Island continent known for kangaroos, koalas and the Outback.', image: 'img/6unidad/unit1/australia.jpg' },
    { word: 'BRAZIL', category: 'Countries', hint: 'Largest South American nation, home of the Amazon rainforest.', image: 'img/6unidad/unit1/brasil.jpg' },
    { word: 'CAPITAL', category: 'Vocabulary', hint: 'The most important city of a country where government is located.', image: 'img/6unidad/unit1/mapamundi.jpg' }
  ];

  let currentWordIdx = 0;
  let wordData = words[currentWordIdx];
  let targetWord = wordData.word.toUpperCase();
  let guessedLetters = new Set();
  let mistakes = 0;
  const maxMistakes = data.vidas || 6;

  const handleExit = () => {
    window.removeEventListener('keydown', keyHandler);
    if (typeof onExit === 'function') onExit();
  };

  function drawHangman() {
    wordData = words[currentWordIdx];
    targetWord = wordData.word.toUpperCase();
    guessedLetters.clear();
    mistakes = 0;

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6 pb-12 animate-fadeIn select-none">
        <!-- Barra Superior -->
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2">
            <button id="btn-hang-back" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-arrow-left"></i>
              <span>Volver</span>
            </button>
            <span class="px-2.5 py-1 bg-sky-100 text-sky-800 rounded-lg text-xs font-bold">
              Palabra ${currentWordIdx + 1} de ${words.length}
            </span>
            <span class="text-xs text-gray-400 font-semibold uppercase">(${wordData.category})</span>
          </div>
          <!-- Vidas / Corazones -->
          <div id="hang-lives" class="flex gap-1 text-base text-rose-500">
            ${Array.from({ length: maxMistakes }).map(() => '❤️').join('')}
          </div>
        </div>

        <!-- Tarjeta Central con SVG del Ahorcado e Imagen -->
        <div class="bg-white rounded-3xl p-6 border shadow-sm flex flex-col md:flex-row items-center justify-center gap-6">
          <!-- Canvas SVG del Ahorcado -->
          <div class="w-48 h-48 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center p-2">
            <svg id="hangman-svg" viewBox="0 0 160 160" class="w-full h-full stroke-slate-700 stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round">
              <!-- Horca fija -->
              <line x1="20" y1="150" x2="140" y2="150" />
              <line x1="40" y1="150" x2="40" y2="20" />
              <line x1="40" y1="20" x2="100" y2="20" />
              <line x1="100" y1="20" x2="100" y2="40" />
              <line x1="40" y1="45" x2="65" y2="20" />

              <!-- Partes del cuerpo añadidas por fallos -->
              <!-- 1. Cabeza -->
              <circle id="part-head" cx="100" cy="52" r="12" class="hidden stroke-amber-500 fill-amber-50" />
              <!-- 2. Cuerpo -->
              <line id="part-body" x1="100" y1="64" x2="100" y2="100" class="hidden stroke-slate-700" />
              <!-- 3. Brazo Izquierdo -->
              <line id="part-arm-left" x1="100" y1="72" x2="80" y2="88" class="hidden stroke-slate-700" />
              <!-- 4. Brazo Derecho -->
              <line id="part-arm-right" x1="100" y1="72" x2="120" y2="88" class="hidden stroke-slate-700" />
              <!-- 5. Pierna Izquierda -->
              <line id="part-leg-left" x1="100" y1="100" x2="85" y2="130" class="hidden stroke-slate-700" />
              <!-- 6. Pierna Derecha -->
              <line id="part-leg-right" x1="100" y1="100" x2="115" y2="130" class="hidden stroke-slate-700" />
            </svg>
          </div>

          <!-- Pista y Miniatura -->
          <div class="flex-1 space-y-3 text-center md:text-left">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-[#2470BB] rounded-xl text-xs font-bold">
              <i class="fa-solid fa-circle-info"></i>
              <span>Pista de Vocabulario</span>
            </div>
            <p class="text-sm font-semibold text-gray-700 leading-relaxed">${wordData.hint}</p>

            ${wordData.image ? `
              <div class="inline-block mt-2">
                <img src="${wordData.image}" class="h-16 rounded-xl border object-contain" onerror="this.style.display='none'" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Casillas de Letras Ocultas -->
        <div id="hang-word-slots" class="flex flex-wrap gap-2 md:gap-3 justify-center py-4"></div>

        <!-- Teclado Virtual A-Z -->
        <div id="hang-keyboard" class="bg-white p-4 rounded-3xl border shadow-sm max-w-xl mx-auto space-y-2"></div>
      </div>
    `;

    const backBtn = document.getElementById('btn-hang-back');
    if (backBtn) backBtn.onclick = handleExit;

    renderWordSlots();
    renderKeyboard();
  }

  function renderWordSlots() {
    const slots = document.getElementById('hang-word-slots');
    slots.innerHTML = '';

    targetWord.split('').forEach(char => {
      const slot = document.createElement('div');
      slot.className = 'w-10 h-12 md:w-12 md:h-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl md:text-2xl transition shadow-2xs select-none';

      if (char === ' ') {
        slot.className += ' border-transparent';
      } else if (guessedLetters.has(char)) {
        slot.className += ' border-sky-400 bg-sky-50 text-[#2470BB] animate-bounce';
        slot.innerText = char;
      } else {
        slot.className += ' border-slate-200 bg-slate-50 text-transparent';
        slot.innerText = '_';
      }

      slots.appendChild(slot);
    });
  }

  function renderKeyboard() {
    const kb = document.getElementById('hang-keyboard');
    kb.innerHTML = '';

    const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

    rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'flex justify-center gap-1.5';

      row.split('').forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'hang-key w-8 h-10 sm:w-10 sm:h-12 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border shadow-2xs select-none';
        btn.innerText = letter;

        if (guessedLetters.has(letter)) {
          btn.disabled = true;
          if (targetWord.includes(letter)) {
            btn.className += ' bg-emerald-100 border-emerald-300 text-emerald-800 opacity-80';
          } else {
            btn.className += ' bg-slate-100 border-slate-200 text-slate-400 opacity-40';
          }
        } else {
          btn.className += ' bg-white border-slate-200 text-gray-700 hover:bg-sky-50 hover:border-sky-300';
          btn.onclick = () => handleGuess(letter);
        }

        rowEl.appendChild(btn);
      });

      kb.appendChild(rowEl);
    });
  }

  function handleGuess(letter) {
    if (guessedLetters.has(letter) || mistakes >= maxMistakes) return;

    guessedLetters.add(letter);

    if (targetWord.includes(letter)) {
      renderWordSlots();
      renderKeyboard();

      const isWon = targetWord.split('').every(c => c === ' ' || guessedLetters.has(c));
      if (isWon) {
        if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('ahorcado', true, currentWordIdx === words.length - 1);
        triggerConfetti();
        setTimeout(() => {
          showRoundResult(true);
        }, 500);
      }
    } else {
      mistakes++;
      updateHangmanSvg();
      updateLivesDisplay();
      renderKeyboard();

      if (mistakes >= maxMistakes) {
        if (typeof window.reportActivityProgress === 'function') window.reportActivityProgress('ahorcado', false, false);
        setTimeout(() => {
          showRoundResult(false);
        }, 500);
      }
    }
  }

  function updateHangmanSvg() {
    const partIds = ['part-head', 'part-body', 'part-arm-left', 'part-arm-right', 'part-leg-left', 'part-leg-right'];
    for (let i = 0; i < mistakes && i < partIds.length; i++) {
      const part = document.getElementById(partIds[i]);
      if (part) part.classList.remove('hidden');
    }
  }

  function updateLivesDisplay() {
    const livesContainer = document.getElementById('hang-lives');
    if (!livesContainer) return;
    const remaining = Math.max(0, maxMistakes - mistakes);
    let html = '';
    for (let i = 0; i < maxMistakes; i++) {
      html += i < remaining ? '❤️' : '🖤';
    }
    livesContainer.innerHTML = html;
  }

  function showRoundResult(won) {
    container.innerHTML = `
      <div class="max-w-md mx-auto bg-white rounded-3xl p-8 border shadow-sm text-center space-y-6 animate-fadeIn">
        <div class="w-20 h-20 mx-auto rounded-full ${won ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center text-4xl shadow-sm">
          ${won ? '🎉' : '💀'}
        </div>
        <div>
          <h3 class="text-2xl font-bold text-gray-800">${won ? '¡Acertaste la Palabra!' : '¡Ahorcado!'}</h3>
          <p class="text-sm text-gray-500 mt-1">La palabra era: <b class="text-[#2470BB] text-base">${targetWord}</b></p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 pt-3">
          ${currentWordIdx < words.length - 1 ? `
            <button id="btn-next-hang" class="flex-1 py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
              Siguiente Palabra →
            </button>
          ` : `
            <button id="btn-restart-hang" class="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow transition cursor-pointer">
              Volver a Jugar
            </button>
          `}
          <button id="btn-exit-hang" class="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-bold text-sm transition cursor-pointer">
            Volver
          </button>
        </div>
      </div>
    `;

    const nextBtn = document.getElementById('btn-next-hang');
    if (nextBtn) {
      nextBtn.onclick = () => {
        currentWordIdx++;
        drawHangman();
      };
    }

    const restartBtn = document.getElementById('btn-restart-hang');
    if (restartBtn) {
      restartBtn.onclick = () => {
        currentWordIdx = 0;
        drawHangman();
      };
    }

    document.getElementById('btn-exit-hang').onclick = handleExit;
  }

  // Teclado físico
  const keyHandler = (e) => {
    const key = e.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      handleGuess(key);
    }
  };
  window.addEventListener('keydown', keyHandler);

  drawHangman();
}

// Objeto global de integración
export const activitiesEngine = {
  confetti: triggerConfetti,
  renderFill: renderFillActivity,
  renderMemorama: renderMemoramaActivity,
  renderCrucigrama: renderCrucigramaActivity,
  renderSopaLetras: renderSopaLetrasActivity,
  renderAhorcado: renderAhorcadoActivity
};

if (typeof window !== 'undefined') {
  window.activitiesEngine = activitiesEngine;
}
