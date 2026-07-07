document.addEventListener('DOMContentLoaded', function () {

  // === Remplace ce tableau par tes vrais terrains ===
  const allTerrains = [
    { nom:"Terrain Al Amal",      quartier:"Sidi Maarouf", prix:250, dispo:true,  note:4.5, avis:28, nbTerrains:2, photo:"https://github.com/yasser638/KoraDor/blob/main/images%20(1).jpg?raw=true" },
    { nom:"Complexe Anfa Foot",   quartier:"Anfa",         prix:300, dispo:true,  note:4.8, avis:52, nbTerrains:4, photo:"https://github.com/yasser638/KoraDor/blob/main/WhatsApp-Image-2024-10-15-a-11.05.40_5ce343f8.jpg?raw=true" },
    { nom:"Green Arena",          quartier:"Bourgogne",    prix:220, dispo:false, note:4.1, avis:19, nbTerrains:3, photo:"images/green-arena.jpg" },
    { nom:"Stade Hay Hassani",    quartier:"Hay Hassani",  prix:180, dispo:true,  note:3.9, avis:34, nbTerrains:1, photo:"images/hay-hassani.jpg" },
    { nom:"City Foot Maarif",     quartier:"Maarif",       prix:280, dispo:true,  note:4.6, avis:41, nbTerrains:5, photo:"images/city-foot.jpg" },
    { nom:"Terrain Oasis Club",   quartier:"Oasis",        prix:240, dispo:false, note:4.3, avis:23, nbTerrains:2, photo:"images/oasis-club.jpg" }
  ];

  function renderStars(note){
    const pct = Math.max(0, Math.min(5, note)) / 5 * 100;
    return `
      <span class="kd-stars">
        <span class="kd-stars-bg">★★★★★</span>
        <span class="kd-stars-fg" style="width:${pct}%">★★★★★</span>
      </span>`;
  }

  const track = document.getElementById('kd-track');
  const dotsWrap = document.getElementById('kd-dots');

  if (!track || !dotsWrap) {
    console.error('Korador carousel: éléments #kd-track ou #kd-dots introuvables dans la page.');
    return;
  }

  let terrains = allTerrains;
  let index = 0;
  let timer;

  const visibleCount = () => window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3;
  const slideCount = () => Math.max(1, terrains.length - visibleCount() + 1);

  function renderCards(){
    if (terrains.length === 0) {
      track.innerHTML = `<div class="kd-no-results">Aucun terrain ne correspond à ta recherche.</div>`;
      dotsWrap.innerHTML = '';
      return;
    }

    track.innerHTML = terrains.map((t, i) => `
      <div class="kd-slide">
        <div class="kd-card">
          <div class="kd-card-img">
            ${t.photo ? `<img src="${t.photo}" alt="${t.nom}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="kd-img-fallback" style="display:none;"></div>` : `<div class="kd-img-fallback"></div>`}
            <span class="kd-badge ${t.dispo ? '' : 'busy'}">${t.dispo ? 'Disponible' : 'Occupé'}</span>
          </div>
          <div class="kd-card-body">
            <h3>${t.nom}</h3>
            <div class="kd-quartier"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>${t.quartier}</div>
            <div class="kd-rating">
              ${renderStars(t.note)}
              <span class="kd-rating-num">${t.note.toFixed(1)}</span>
              <span class="kd-rating-count">(${t.avis} avis)</span>
            </div>
            <div class="kd-meta">
              <div class="kd-price">${t.prix} DH <span>/heure</span></div>
            </div>
            <button class="kd-book-btn" data-index="${i}">Réserver</button>
          </div>
        </div>
      </div>
    `).join('');

    // brancher les boutons Réserver sur la modale
    track.querySelectorAll('.kd-book-btn').forEach(btn => {
      btn.addEventListener('click', () => openBookingModal(terrains[parseInt(btn.dataset.index, 10)]));
    });

    renderDots();
    update();
  }

  function renderDots(){
    dotsWrap.innerHTML = '';
    for(let i=0; i<slideCount(); i++){
      const d = document.createElement('div');
      d.className = 'kd-dot' + (i === index ? ' active' : '');
      d.addEventListener('click', () => { index = i; update(); resetTimer(); });
      dotsWrap.appendChild(d);
    }
  }

  function update(){
    if (terrains.length === 0) return;
    const slideWidth = 100 / visibleCount();
    track.style.transform = `translateX(-${index * slideWidth}%)`;
    [...dotsWrap.children].forEach((d,i) => d.classList.toggle('active', i === index));
  }

  function next(){ if (terrains.length === 0) return; index = (index + 1) % slideCount(); update(); }
  function prev(){ if (terrains.length === 0) return; index = (index - 1 + slideCount()) % slideCount(); update(); }

  function resetTimer(){
    clearInterval(timer);
    timer = setInterval(next, 3500);
  }

  // === Recherche par quartier ===
  const chips = document.querySelectorAll('.kd-chip');
  const quartierValueEl = document.getElementById('kd-quartier-value');
  const quartierWrap = document.querySelector('.kd-quartier-wrap');
  const chipsPanel = document.getElementById('kd-chips');
  const searchBtn = document.getElementById('kd-search-btn');
  let selectedQuartier = '';

  function applySearch(quartier){
    selectedQuartier = quartier;
    if (quartierValueEl) quartierValueEl.textContent = quartier === '' ? 'Tous les quartiers' : quartier;
    terrains = quartier === '' ? allTerrains : allTerrains.filter(t => t.quartier === quartier);
    index = 0;
    renderCards();
    resetTimer();
  }

  function closeAllSearchPanels(){
    document.querySelectorAll('.kd-chips-panel.open, .kd-date-panel.open').forEach(p => p.classList.remove('open'));
  }

  // tap sur le champ = ouvre/ferme son panneau (utile sur mobile, où le survol ne marche pas)
  if (quartierWrap && chipsPanel) {
    quartierWrap.addEventListener('click', (e) => {
      const wasOpen = chipsPanel.classList.contains('open');
      closeAllSearchPanels();
      if (!wasOpen) chipsPanel.classList.add('open');
      e.stopPropagation();
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applySearch(chip.dataset.quartier);
      closeAllSearchPanels();
    });
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', () => applySearch(selectedQuartier));
  }

  // referme tous les panneaux si on tape ailleurs sur la page
  document.addEventListener('click', closeAllSearchPanels);

  // === Carrousel : boutons + auto-défilement ===
  const nextBtn = document.getElementById('kd-next');
  const prevBtn = document.getElementById('kd-prev');
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetTimer(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetTimer(); });

  const viewport = document.querySelector('.kd-viewport');
  if (viewport) {
    viewport.addEventListener('mouseenter', () => clearInterval(timer));
    viewport.addEventListener('mouseleave', resetTimer);
  }

  window.addEventListener('resize', () => { index = 0; renderDots(); update(); });

  // === Calendrier visuel ===
  const calGrid = document.getElementById('kd-cal-grid');
  const calMonthLabel = document.getElementById('kd-cal-month-label');
  const calPrev = document.getElementById('kd-cal-prev');
  const calNext = document.getElementById('kd-cal-next');
  const timeGrid = document.getElementById('kd-time-grid');

  const today = new Date();
  today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedDate = null;
  let selectedTime = null;

  const moisNoms = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const heures = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

  function renderCalendar(){
    calMonthLabel.textContent = `${moisNoms[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
    // lundi = 0 ... dimanche = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const filler = document.createElement('button');
      filler.className = 'kd-cal-day other-month';
      filler.disabled = true;
      calGrid.appendChild(filler);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(viewYear, viewMonth, d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kd-cal-day';
      btn.textContent = d;

      if (cellDate < today) {
        btn.classList.add('disabled');
        btn.disabled = true;
      } else {
        if (selectedDate && cellDate.getTime() === selectedDate.getTime()) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', () => {
          selectedDate = cellDate;
          renderCalendar();
        });
      }
      calGrid.appendChild(btn);
    }
  }

  function renderTimeSlots(){
    timeGrid.innerHTML = heures.map(h =>
      `<button type="button" class="kd-time-slot${h === selectedTime ? ' selected' : ''}" data-time="${h}">${h}</button>`
    ).join('');
    timeGrid.querySelectorAll('.kd-time-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTime = btn.dataset.time;
        renderTimeSlots();
      });
    });
  }

  if (calPrev) calPrev.addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  if (calNext) calNext.addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  if (calGrid) renderCalendar();
  if (timeGrid) renderTimeSlots();

  // === Calendrier et heures de la barre de recherche (haut de page, clic pour ouvrir) ===
  const searchCalGrid = document.getElementById('kd-search-cal-grid');
  const searchCalMonthLabel = document.getElementById('kd-search-cal-month-label');
  const searchCalPrev = document.getElementById('kd-search-cal-prev');
  const searchCalNext = document.getElementById('kd-search-cal-next');
  const searchTimeGrid = document.getElementById('kd-search-time-grid');
  const searchDateValueEl = document.getElementById('kd-search-date-value');
  const searchTimeValueEl = document.getElementById('kd-search-time-value');
  const searchDateWrap = document.getElementById('kd-search-date-wrap');
  const searchTimeWrap = document.getElementById('kd-search-time-wrap');
  const searchCalPanel = document.getElementById('kd-search-cal-panel');
  const searchTimePanel = document.getElementById('kd-search-time-panel');

  let searchViewYear = today.getFullYear();
  let searchViewMonth = today.getMonth();
  let searchSelectedDate = null;
  let searchSelectedTime = null;

  function renderSearchCalendar(){
    if (!searchCalGrid) return;
    searchCalMonthLabel.textContent = `${moisNoms[searchViewMonth]} ${searchViewYear}`;
    searchCalGrid.innerHTML = '';

    const firstDay = new Date(searchViewYear, searchViewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(searchViewYear, searchViewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const filler = document.createElement('button');
      filler.className = 'kd-cal-day other-month';
      filler.disabled = true;
      searchCalGrid.appendChild(filler);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(searchViewYear, searchViewMonth, d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kd-cal-day';
      btn.textContent = d;

      if (cellDate < today) {
        btn.classList.add('disabled');
        btn.disabled = true;
      } else {
        if (searchSelectedDate && cellDate.getTime() === searchSelectedDate.getTime()) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          searchSelectedDate = cellDate;
          renderSearchCalendar();
          searchDateValueEl.textContent = cellDate.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
          closeAllSearchPanels();
        });
      }
      searchCalGrid.appendChild(btn);
    }
  }

  function renderSearchTimeSlots(){
    if (!searchTimeGrid) return;
    searchTimeGrid.innerHTML = heures.map(h =>
      `<button type="button" class="kd-time-slot${h === searchSelectedTime ? ' selected' : ''}" data-time="${h}">${h}</button>`
    ).join('');
    searchTimeGrid.querySelectorAll('.kd-time-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        searchSelectedTime = btn.dataset.time;
        renderSearchTimeSlots();
        searchTimeValueEl.textContent = searchSelectedTime;
        closeAllSearchPanels();
      });
    });
  }

  if (searchCalPrev) searchCalPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    searchViewMonth--; if (searchViewMonth < 0) { searchViewMonth = 11; searchViewYear--; }
    renderSearchCalendar();
  });
  if (searchCalNext) searchCalNext.addEventListener('click', (e) => {
    e.stopPropagation();
    searchViewMonth++; if (searchViewMonth > 11) { searchViewMonth = 0; searchViewYear++; }
    renderSearchCalendar();
  });

  // tap sur Date / Heure = ouvre/ferme son panneau (utile sur mobile)
  if (searchDateWrap && searchCalPanel) {
    searchDateWrap.addEventListener('click', (e) => {
      const wasOpen = searchCalPanel.classList.contains('open');
      closeAllSearchPanels();
      if (!wasOpen) searchCalPanel.classList.add('open');
      e.stopPropagation();
    });
  }
  if (searchTimeWrap && searchTimePanel) {
    searchTimeWrap.addEventListener('click', (e) => {
      const wasOpen = searchTimePanel.classList.contains('open');
      closeAllSearchPanels();
      if (!wasOpen) searchTimePanel.classList.add('open');
      e.stopPropagation();
    });
  }

  renderSearchCalendar();
  renderSearchTimeSlots();

  // === Modale de réservation (multi-étapes) ===
  const modalOverlay = document.getElementById('kd-modal-overlay');
  const modalClose = document.getElementById('kd-modal-close');
  const terrainSelect = document.getElementById('kd-modal-terrain-select');
  const subterrainLabel = document.getElementById('kd-modal-subterrain-label');
  const subterrainSelect = document.getElementById('kd-modal-subterrain-select');
  const stepItems = document.querySelectorAll('.kd-step-item');
  const stepPanels = document.querySelectorAll('.kd-step-panel');
  const stepBackBtn = document.getElementById('kd-step-back');
  const stepNextBtn = document.getElementById('kd-step-next');
  let currentStep = 1;
  const totalSteps = stepPanels.length;

  function fillModalDetails(t){
    document.getElementById('kd-modal-quartier').textContent = t.quartier;
    document.getElementById('kd-modal-prix').textContent = t.prix + ' DH / heure';
    document.getElementById('kd-modal-note').textContent = t.note.toFixed(1) + ' ★ (' + t.avis + ' avis)';

    // liste "Terrain 1 / Terrain 2 ..." si le complexe a plusieurs terrains
    if (t.nbTerrains > 1) {
      subterrainSelect.innerHTML = Array.from({ length: t.nbTerrains }, (_, i) =>
        `<option value="${i + 1}">Terrain ${i + 1}</option>`
      ).join('');
      subterrainLabel.hidden = false;
      subterrainSelect.hidden = false;
    } else {
      subterrainLabel.hidden = true;
      subterrainSelect.hidden = true;
    }
  }

  function goToStep(n){
    currentStep = n;
    stepItems.forEach(item => {
      const s = parseInt(item.dataset.step, 10);
      item.classList.toggle('active', s === n);
      item.classList.toggle('done', s < n);
    });
    stepPanels.forEach(panel => {
      panel.hidden = parseInt(panel.dataset.panel, 10) !== n;
    });
    stepBackBtn.hidden = n === 1;
    stepNextBtn.textContent = n === totalSteps ? 'Confirmer la réservation' : 'Continuer';
  }

  function openBookingModal(t){
    // remplit la liste déroulante avec tous les terrains, celui cliqué pré-sélectionné
    terrainSelect.innerHTML = allTerrains.map((x, i) =>
      `<option value="${i}" ${x.nom === t.nom ? 'selected' : ''}>${x.nom} — ${x.quartier}</option>`
    ).join('');
    fillModalDetails(t);
    goToStep(1);
    if (modalOverlay) modalOverlay.classList.add('open');
  }

  function closeBookingModal(){
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  if (terrainSelect) {
    terrainSelect.addEventListener('change', (e) => {
      const t = allTerrains[parseInt(e.target.value, 10)];
      if (t) fillModalDetails(t);
    });
  }

  if (stepNextBtn) {
    stepNextBtn.addEventListener('click', () => {
      if (currentStep === 2 && (!selectedDate || !selectedTime)) {
        stepNextBtn.classList.add('kd-shake');
        setTimeout(() => stepNextBtn.classList.remove('kd-shake'), 400);
        return;
      }
      if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
      } else {
        const t = allTerrains[parseInt(terrainSelect.value, 10)];
        const subtxt = t.nbTerrains > 1 ? ` (Terrain ${subterrainSelect.value})` : '';
        const dateTxt = selectedDate ? selectedDate.toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '—';
        const timeTxt = selectedTime || '—';
        alert(`Réservation confirmée pour ${t.nom}${subtxt} le ${dateTxt} à ${timeTxt} ! (démo — à relier à un vrai système de paiement)`);
        closeBookingModal();
      }
    });
  }

  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', () => goToStep(Math.max(1, currentStep - 1)));
  }

  if (modalClose) modalClose.addEventListener('click', closeBookingModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeBookingModal(); });
  }

  renderCards();
  resetTimer();

  // === Ouvre automatiquement la réservation si on arrive depuis la carte (index.html#reserve=...) ===
  const hash = window.location.hash; // ex: "#reserve=Stade%20Hay%20Hassani"
  if (hash.startsWith('#reserve=')) {
    const terrainName = decodeURIComponent(hash.replace('#reserve=', ''));
    const match = allTerrains.find(t => t.nom === terrainName);
    if (match) {
      openBookingModal(match);
      const section = document.getElementById('kd-terrains');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
  }

});
