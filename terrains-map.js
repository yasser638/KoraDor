document.addEventListener('DOMContentLoaded', async function () {

  // Les terrains sont chargés depuis Supabase (table `terrains`) plus bas,
  // juste avant l'initialisation de l'affichage.
  let allTerrains = [];
  let terrains = [];
  let selectedQuartier = '';

  // ---------- Étoiles ----------
  function renderStars(note){
    const pct = Math.max(0, Math.min(5, note)) / 5 * 100;
    return `
      <span class="kd-stars">
        <span class="kd-stars-bg">★★★★★</span>
        <span class="kd-stars-fg" style="width:${pct}%">★★★★★</span>
      </span>`;
  }

  // ---------- En-tête (chiffres) ----------
  function updateHeroStats(){
    const totalEl = document.getElementById('kd-count-total');
    const dispoEl = document.getElementById('kd-count-dispo');
    if (totalEl) totalEl.textContent = allTerrains.length;
    if (dispoEl) dispoEl.textContent = allTerrains.filter(t => t.dispo).length;
  }

  // ---------- Puces de quartier (panneau, comme sur l'accueil) ----------
  const chipsWrap = document.getElementById('kd-t-chips');
  const quartierValueEl = document.getElementById('kd-t-quartier-value');

  function renderChips(){
    if (!chipsWrap) return;
    const quartiers = [...new Set(allTerrains.map(t => t.quartier))];
    chipsWrap.innerHTML = `<button type="button" class="kd-chip active" data-quartier="">Tous</button>` +
      quartiers.map(q => `<button type="button" class="kd-chip" data-quartier="${q}">${q}</button>`).join('');

    chipsWrap.querySelectorAll('.kd-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chipsWrap.querySelectorAll('.kd-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedQuartier = chip.dataset.quartier;
        quartierValueEl.textContent = selectedQuartier === '' ? 'Tous les quartiers' : selectedQuartier;
      });
    });
  }

  // ---------- Grille de cartes ----------
  const gridEl = document.getElementById('kd-terrains-grid');
  // ---------- Petit toast de confirmation (réutilisé pour "lien copié") ----------
  function showShareToast(message){
    let toast = document.getElementById('kd-share-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'kd-share-toast';
      toast.className = 'kd-share-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('kd-show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('kd-show'), 2200);
  }

  // ---------- Partage d'un terrain (WhatsApp / Instagram / etc.) ----------
  function shareTerrain(t){
    const shareUrl = `${window.location.origin}${window.location.pathname}#terrain=${encodeURIComponent(t.nom)}`;
    const shareText = `⚽ Regarde ce terrain sur Korador : ${t.nom} (${t.quartier}) — ${t.prix} DH/heure, noté ${t.note.toFixed(1)}★`;

    // Sur mobile : ouvre le sélecteur natif du téléphone (WhatsApp, Instagram, Messages...)
    if (navigator.share) {
      navigator.share({ title: 'Korador', text: shareText, url: shareUrl }).catch(() => {
        // l'utilisateur a annulé le partage — rien à faire
      });
      return;
    }

    // Sur desktop (pas de Web Share API) : on copie le lien dans le presse-papier
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => showShareToast('Lien copié !'))
        .catch(() => {
          // dernier recours si le presse-papier est bloqué (permissions, contexte non sécurisé...)
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank', 'noopener');
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank', 'noopener');
    }
  }

  function renderGrid(){
    if (!gridEl) return;

    if (terrains.length === 0) {
      gridEl.innerHTML = `<div class="kd-no-results">Aucun terrain ne correspond à ta recherche.</div>`;
      return;
    }

    gridEl.innerHTML = terrains.map(t => `
      <div class="kd-card">
        <div class="kd-card-img">
          ${t.photo ? `<div class="kd-card-img-skeleton kd-skel-shimmer"></div>
          <img src="${t.photo}" alt="${t.nom}" loading="lazy"
               onload="this.previousElementSibling.classList.add('kd-hide')"
               onerror="this.previousElementSibling.classList.add('kd-hide'); this.style.display='none'; this.nextElementSibling.style.display='block';">
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
          <div style="display:flex; gap:8px;" class="kd-card-actions">
            <button type="button" class="kd-details-btn" data-nom="${t.nom}" style="flex:1;">Voir plus</button>
            <button type="button" class="kd-book-btn kd-reserve-btn" data-nom="${t.nom}" style="flex:1; text-align:center;">Réserver</button>
            <button type="button" class="kd-share-btn" data-nom="${t.nom}" aria-label="Partager ce terrain">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"></line><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    gridEl.querySelectorAll('.kd-details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = allTerrains.find(x => x.nom === btn.dataset.nom);
        if (t) openDetailModal(t);
      });
    });

    gridEl.querySelectorAll('.kd-reserve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = allTerrains.find(x => x.nom === btn.dataset.nom);
        if (t) openBookingModal(t);
      });
    });

    gridEl.querySelectorAll('.kd-share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = allTerrains.find(x => x.nom === btn.dataset.nom);
        if (t) shareTerrain(t);
      });
    });
  }

  // ---------- Carte Leaflet ----------
  const mapEl = document.getElementById('kd-map');
  let map, markerRefs = [];

  function initMap(){
    if (!mapEl || typeof L === 'undefined') return;
    map = L.map('kd-map').setView([33.5731, -7.6298], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    allTerrains.forEach(t => {
      const badgeIcon = L.divIcon({
        className: 'kd-map-badge-icon',
        html: `
          <div class="kd-map-rating-pill">★ ${t.note.toFixed(1)}</div>
          <div class="kd-map-name-pill">${t.nom}</div>
        `,
        iconSize: [160, 46],
        iconAnchor: [80, 46]
      });

      const marker = L.marker([t.lat, t.lng], { icon: badgeIcon }).addTo(map);
      marker.bindPopup(`
        <div class="kd-map-popup">
          <strong>${t.nom}</strong><br>
          <span>${t.quartier}</span><br>
          <span>${t.prix} DH / heure — ★ ${t.note.toFixed(1)} (${t.avis} avis)</span><br>
          <a href="#" onclick="event.preventDefault(); window.kdOpenBookingByName('${t.nom.replace(/'/g, "\\'")}')">Réserver ce terrain</a>
        </div>
      `);
      markerRefs.push({ terrain: t, marker });
    });

    // Masque le skeleton une fois les tuiles chargées (avec filet de sécurité)
    const mapSkeleton = document.getElementById('kd-map-skeleton');
    if (mapSkeleton) {
      const hideSkeleton = () => mapSkeleton.classList.add('kd-hide');
      map.whenReady(() => map.once('load', hideSkeleton));
      setTimeout(hideSkeleton, 1500); // filet de sécurité si l'évènement 'load' ne se déclenche pas (tuiles déjà en cache)
    }
  }

  function updateMapForFilter(){
    if (!map) return;

    markerRefs.forEach(({ terrain, marker }) => {
      const visible = terrains.includes(terrain);
      const el = marker.getElement();
      if (el) el.style.display = visible ? '' : 'none';
    });

    const visibleRefs = markerRefs.filter(({ terrain }) => terrains.includes(terrain));
    if (visibleRefs.length === 0) return;

    if (visibleRefs.length === 1) {
      const { terrain } = visibleRefs[0];
      map.setView([terrain.lat, terrain.lng], 14);
    } else {
      const bounds = L.latLngBounds(visibleRefs.map(({ terrain }) => [terrain.lat, terrain.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // ---------- Filtrage par quartier (déclenché par "Rechercher") ----------
  const searchMsg = document.getElementById('kd-map-search-msg');

  function applyFilters(){
    terrains = selectedQuartier === '' ? allTerrains : allTerrains.filter(t => t.quartier === selectedQuartier);

    if (searchMsg) {
      searchMsg.hidden = terrains.length !== 0;
      searchMsg.textContent = 'Aucun terrain ne correspond à ta recherche.';
    }

    renderGrid();
    updateMapForFilter();
  }

  const searchBtn = document.getElementById('kd-t-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', applyFilters);

  // ---------- Calendrier + créneaux horaires (visuel, cohérent avec l'accueil) ----------
  const calGrid = document.getElementById('kd-t-cal-grid');
  const calMonthLabel = document.getElementById('kd-t-cal-month-label');
  const calPrev = document.getElementById('kd-t-cal-prev');
  const calNext = document.getElementById('kd-t-cal-next');
  const dateValueEl = document.getElementById('kd-t-date-value');
  const timeGrid = document.getElementById('kd-t-time-grid');
  const timeValueEl = document.getElementById('kd-t-time-value');

  const today = new Date();
  today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let tSelectedDate = null;
  let tSelectedTime = null;

  const moisNoms = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const heures = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

  function renderTCalendar(){
    if (!calGrid) return;
    calMonthLabel.textContent = `${moisNoms[viewMonth]} ${viewYear}`;
    calGrid.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1);
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
        if (tSelectedDate && cellDate.getTime() === tSelectedDate.getTime()) btn.classList.add('selected');
        btn.addEventListener('click', () => {
          tSelectedDate = cellDate;
          renderTCalendar();
          dateValueEl.textContent = cellDate.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
        });
      }
      calGrid.appendChild(btn);
    }
  }

  function renderTTimeSlots(){
    if (!timeGrid) return;
    timeGrid.innerHTML = heures.map(h =>
      `<button type="button" class="kd-time-slot${h === tSelectedTime ? ' selected' : ''}" data-time="${h}">${h}</button>`
    ).join('');
    timeGrid.querySelectorAll('.kd-time-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        tSelectedTime = btn.dataset.time;
        renderTTimeSlots();
        timeValueEl.textContent = tSelectedTime;
      });
    });
  }

  if (calPrev) calPrev.addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderTCalendar();
  });
  if (calNext) calNext.addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderTCalendar();
  });

  renderTCalendar();
  renderTTimeSlots();

  // ---------- Fiche détaillée (galerie photos + description + horaires) ----------
  const detailOverlay = document.getElementById('kd-detail-overlay');
  let detailPhotos = [];
  let detailIndex = 0;

  function renderDetailPhoto(){
    const imgEl = document.getElementById('kd-detail-img');
    const counterEl = document.getElementById('kd-detail-counter');
    if (!imgEl) return;
    const src = detailPhotos[detailIndex];
    if (src) {
      imgEl.style.display = '';
      imgEl.src = src;
      imgEl.onerror = () => { imgEl.style.display = 'none'; };
    } else {
      imgEl.style.display = 'none';
    }
    if (counterEl) counterEl.textContent = `${detailIndex + 1} / ${detailPhotos.length}`;
    const prevBtn = document.getElementById('kd-detail-prev');
    const nextBtn = document.getElementById('kd-detail-next');
    const multi = detailPhotos.length > 1;
    if (prevBtn) prevBtn.style.display = multi ? '' : 'none';
    if (nextBtn) nextBtn.style.display = multi ? '' : 'none';
    if (counterEl) counterEl.style.display = multi ? '' : 'none';
  }

  function openDetailModal(t){
    if (!detailOverlay) return;
    detailPhotos = (t.photos && t.photos.length) ? t.photos : [t.photo];
    detailIndex = 0;

    document.getElementById('kd-detail-nom').textContent = t.nom;
    document.getElementById('kd-detail-quartier').textContent = t.quartier;
    document.getElementById('kd-detail-prix').textContent = `${t.prix} DH / heure`;
    document.getElementById('kd-detail-note').innerHTML = renderStars(t.note);
    document.getElementById('kd-detail-note-num').textContent = t.note.toFixed(1);
    document.getElementById('kd-detail-avis').textContent = `(${t.avis} avis)`;
    document.getElementById('kd-detail-description').textContent = t.description || '';
    document.getElementById('kd-detail-horaires').textContent = t.horaires || '';
    document.getElementById('kd-detail-badge').textContent = t.dispo ? 'Disponible' : 'Occupé';
    document.getElementById('kd-detail-badge').classList.toggle('busy', !t.dispo);

    const reserveBtn = document.getElementById('kd-detail-reserve');
    reserveBtn.href = '#';
    reserveBtn.onclick = (e) => {
      e.preventDefault();
      closeDetailModal();
      openBookingModal(t);
    };

    const shareBtn = document.getElementById('kd-detail-share');
    if (shareBtn) shareBtn.onclick = () => shareTerrain(t);

    renderDetailPhoto();
    detailOverlay.classList.add('open');
  }

  function closeDetailModal(){
    if (detailOverlay) detailOverlay.classList.remove('open');
  }

  const detailPrevBtn = document.getElementById('kd-detail-prev');
  const detailNextBtn = document.getElementById('kd-detail-next');
  const detailCloseBtn = document.getElementById('kd-detail-close');

  if (detailPrevBtn) detailPrevBtn.addEventListener('click', () => {
    detailIndex = (detailIndex - 1 + detailPhotos.length) % detailPhotos.length;
    renderDetailPhoto();
  });
  if (detailNextBtn) detailNextBtn.addEventListener('click', () => {
    detailIndex = (detailIndex + 1) % detailPhotos.length;
    renderDetailPhoto();
  });
  if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailModal);
  if (detailOverlay) detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) closeDetailModal();
  });

  // =========================================================
  // Modale de réservation multi-étapes (portée depuis script.js
  // pour pouvoir réserver directement depuis cette page)
  // =========================================================
  const modalCalGrid = document.getElementById('kd-cal-grid');
  const modalCalMonthLabel = document.getElementById('kd-cal-month-label');
  const modalCalPrev = document.getElementById('kd-cal-prev');
  const modalCalNext = document.getElementById('kd-cal-next');
  const modalTimeGrid = document.getElementById('kd-time-grid');

  let modalViewYear = today.getFullYear();
  let modalViewMonth = today.getMonth();
  let modalSelectedDate = null;
  let modalSelectedTime = null;
  let reservedSlots = [];

  function formatDateISO(d){
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getCurrentModalTerrain(){
    if (!terrainSelect || terrainSelect.value === '') return null;
    return allTerrains[parseInt(terrainSelect.value, 10)] || null;
  }

  function getCurrentModalNumeroTerrain(){
    if (subterrainSelect && !subterrainSelect.hidden && subterrainSelect.value) {
      return parseInt(subterrainSelect.value, 10);
    }
    return 1;
  }

  // Interroge Supabase pour savoir quels créneaux sont déjà pris sur ce terrain/date,
  // et met à jour l'affichage des créneaux en conséquence.
  async function refreshReservedSlots(){
    reservedSlots = [];
    const t = getCurrentModalTerrain();
    if (!t || !t.id || !modalSelectedDate || typeof kdGetReservedSlots === 'undefined') {
      renderModalTimeSlots();
      return;
    }
    try {
      reservedSlots = await kdGetReservedSlots({
        terrain_id: t.id,
        numero_terrain: getCurrentModalNumeroTerrain(),
        date_reservation: formatDateISO(modalSelectedDate)
      });
    } catch (err) {
      console.error('Korador: impossible de vérifier les créneaux réservés —', err);
    }
    if (modalSelectedTime && reservedSlots.includes(modalSelectedTime)) {
      modalSelectedTime = null; // le créneau qu'on avait choisi vient d'être pris
    }
    renderModalTimeSlots();
  }

  function renderModalCalendar(){
    modalCalMonthLabel.textContent = `${moisNoms[modalViewMonth]} ${modalViewYear}`;
    modalCalGrid.innerHTML = '';

    const firstDay = new Date(modalViewYear, modalViewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(modalViewYear, modalViewMonth + 1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
      const filler = document.createElement('button');
      filler.className = 'kd-cal-day other-month';
      filler.disabled = true;
      modalCalGrid.appendChild(filler);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(modalViewYear, modalViewMonth, d);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kd-cal-day';
      btn.textContent = d;

      if (cellDate < today) {
        btn.classList.add('disabled');
        btn.disabled = true;
      } else {
        if (modalSelectedDate && cellDate.getTime() === modalSelectedDate.getTime()) {
          btn.classList.add('selected');
        }
        btn.addEventListener('click', () => {
          modalSelectedDate = cellDate;
          renderModalCalendar();
          refreshReservedSlots();
        });
      }
      modalCalGrid.appendChild(btn);
    }
  }

  function renderModalTimeSlots(){
    modalTimeGrid.innerHTML = heures.map(h => {
      const taken = reservedSlots.includes(h);
      const classes = ['kd-time-slot'];
      if (h === modalSelectedTime) classes.push('selected');
      if (taken) classes.push('kd-time-slot-taken');
      return `<button type="button" class="${classes.join(' ')}" data-time="${h}" ${taken ? 'disabled title="Déjà réservé"' : ''}>${h}</button>`;
    }).join('');
    modalTimeGrid.querySelectorAll('.kd-time-slot:not(.kd-time-slot-taken)').forEach(btn => {
      btn.addEventListener('click', () => {
        modalSelectedTime = btn.dataset.time;
        renderModalTimeSlots();
      });
    });
  }

  if (modalCalPrev) modalCalPrev.addEventListener('click', () => {
    modalViewMonth--; if (modalViewMonth < 0) { modalViewMonth = 11; modalViewYear--; }
    renderModalCalendar();
  });
  if (modalCalNext) modalCalNext.addEventListener('click', () => {
    modalViewMonth++; if (modalViewMonth > 11) { modalViewMonth = 0; modalViewYear++; }
    renderModalCalendar();
  });

  if (modalCalGrid) renderModalCalendar();
  if (modalTimeGrid) renderModalTimeSlots();

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
  const totalSteps = stepItems.length;

  function fillModalDetails(t){
    document.getElementById('kd-modal-quartier').textContent = t.quartier;
    document.getElementById('kd-modal-prix').textContent = t.prix + ' DH / heure';
    document.getElementById('kd-modal-note').textContent = t.note.toFixed(1) + ' ★ (' + t.avis + ' avis)';

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

  function goToModalStep(n){
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

  // Affiche l'écran de succès (avec le lien d'invitation WhatsApp) à la place du formulaire
  function showBookingSuccess(detailsText, whatsappUrl){
    stepPanels.forEach(panel => { panel.hidden = true; });
    const successPanel = document.querySelector('.kd-step-panel[data-panel="success"]');
    if (successPanel) successPanel.hidden = false;

    const detailsEl = document.getElementById('kd-booking-success-details');
    if (detailsEl) detailsEl.textContent = detailsText;

    const waBtn = document.getElementById('kd-whatsapp-invite-btn');
    if (waBtn) waBtn.href = whatsappUrl;

    const footer = document.getElementById('kd-stepper-footer');
    if (footer) footer.hidden = true;

    stepItems.forEach(item => item.classList.add('done'));
  }

  // Pré-remplit nom/téléphone/CIN/email si l'utilisateur est déjà connecté
  async function prefillUserInfo(){
    if (typeof kdGetCurrentProfile === 'undefined') return;
    try {
      const profile = await kdGetCurrentProfile();
      if (!profile) return;

      const nameInput = document.getElementById('kd-modal-name');
      const phoneInput = document.getElementById('kd-modal-phone');
      const cinInput = document.getElementById('kd-modal-cin');
      const emailInput = document.getElementById('kd-modal-email');

      if (nameInput && !nameInput.value && profile.nom) nameInput.value = profile.nom;
      if (phoneInput && !phoneInput.value && profile.telephone) phoneInput.value = profile.telephone;
      if (cinInput && !cinInput.value && profile.cin) cinInput.value = profile.cin;
      if (emailInput && !emailInput.value && profile.email) emailInput.value = profile.email;
    } catch (err) {
      // Pas grave : l'utilisateur remplit simplement le formulaire manuellement.
    }
  }

  function openBookingModal(t){
    terrainSelect.innerHTML = allTerrains.map((x, i) =>
      `<option value="${i}" ${x.nom === t.nom ? 'selected' : ''}>${x.nom} — ${x.quartier}</option>`
    ).join('');
    fillModalDetails(t);
    modalSelectedDate = null;
    modalSelectedTime = null;
    renderModalCalendar();
    refreshReservedSlots();
    const footer = document.getElementById('kd-stepper-footer');
    if (footer) footer.hidden = false;
    goToModalStep(1);
    if (modalOverlay) modalOverlay.classList.add('open');
    prefillUserInfo();
  }

  function closeBookingModal(){
    if (modalOverlay) modalOverlay.classList.remove('open');
  }

  // Pont global : nécessaire car le popup Leaflet est injecté comme HTML brut
  // (pas de closure JS directe possible depuis son contenu)
  window.kdOpenBookingByName = function(nom){
    const t = allTerrains.find(x => x.nom === nom);
    if (t) openBookingModal(t);
  };

  if (terrainSelect) {
    terrainSelect.addEventListener('change', (e) => {
      const t = allTerrains[parseInt(e.target.value, 10)];
      if (t) fillModalDetails(t);
      refreshReservedSlots();
    });
  }
  if (subterrainSelect) {
    subterrainSelect.addEventListener('change', refreshReservedSlots);
  }

  // === Validation des informations (étape 3) ===
  function isValidMoroccanPhone(v){
    const cleaned = v.replace(/[\s.-]/g, '');
    return /^(?:\+212|00212|0)[5-7][0-9]{8}$/.test(cleaned);
  }
  function isValidCIN(v){
    return /^[A-Za-z]{1,2}[0-9]{1,7}$/.test(v.trim());
  }
  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }
  function setFieldState(input, errorEl, valide, message){
    if (!input) return;
    input.classList.toggle('kd-input-error', !valide);
    if (errorEl) {
      errorEl.textContent = valide ? '' : message;
      errorEl.classList.toggle('kd-show', !valide);
    }
  }
  function validateStep3(){
    const nameInput = document.getElementById('kd-modal-name');
    const phoneInput = document.getElementById('kd-modal-phone');
    const cinInput = document.getElementById('kd-modal-cin');
    const emailInput = document.getElementById('kd-modal-email');

    const nameOk = nameInput && nameInput.value.trim().length >= 2;
    const phoneOk = phoneInput && isValidMoroccanPhone(phoneInput.value);
    const cinOk = cinInput && isValidCIN(cinInput.value);
    const emailOk = emailInput && isValidEmail(emailInput.value);

    setFieldState(nameInput, document.getElementById('kd-modal-name-error'), nameOk, 'Merci d\'indiquer ton nom complet.');
    setFieldState(phoneInput, document.getElementById('kd-modal-phone-error'), phoneOk, 'Numéro invalide (ex: 06 12 34 56 78).');
    setFieldState(cinInput, document.getElementById('kd-modal-cin-error'), cinOk, 'CIN invalide (ex: AB123456).');
    setFieldState(emailInput, document.getElementById('kd-modal-email-error'), emailOk, 'Adresse email invalide.');

    return nameOk && phoneOk && cinOk && emailOk;
  }

  ['kd-modal-name', 'kd-modal-phone', 'kd-modal-cin', 'kd-modal-email'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', () => {
      if (input.classList.contains('kd-input-error')) validateStep3();
    });
  });

  // Remplace "TA_CLE_PUBLIQUE" par ta vraie clé publique EmailJS (Account > General)
  if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: 'TA_CLE_PUBLIQUE' });
  }

  function showModalError(html){
    let el = document.getElementById('kd-modal-generic-error');
    if (!el) {
      el = document.createElement('p');
      el.id = 'kd-modal-generic-error';
      el.style.cssText = 'color:#b32e2e; background:#fdecec; border-radius:8px; padding:10px 14px; font-size:13px; margin:10px 24px 0; text-align:center;';
      const footer = document.getElementById('kd-stepper-footer');
      if (footer && footer.parentNode) footer.parentNode.insertBefore(el, footer);
    }
    el.innerHTML = html;
  }
  function clearModalError(){
    const el = document.getElementById('kd-modal-generic-error');
    if (el) el.remove();
  }

  if (stepNextBtn) {
    stepNextBtn.addEventListener('click', () => {
      if (currentStep === 2 && (!modalSelectedDate || !modalSelectedTime)) {
        stepNextBtn.classList.add('kd-shake');
        setTimeout(() => stepNextBtn.classList.remove('kd-shake'), 400);
        return;
      }

      if (currentStep === 3) {
        if (!validateStep3()) {
          stepNextBtn.classList.add('kd-shake');
          setTimeout(() => stepNextBtn.classList.remove('kd-shake'), 400);
          return;
        }
      }

      if (currentStep < totalSteps) {
        goToModalStep(currentStep + 1);
      } else {
        const t = allTerrains[parseInt(terrainSelect.value, 10)];
        console.log('Korador DEBUG — terrain sélectionné:', t, '| terrainSelect.value:', terrainSelect.value);
        const subtxt = t.nbTerrains > 1 ? ` (Terrain ${subterrainSelect.value})` : '';
        const dateTxt = modalSelectedDate ? modalSelectedDate.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '—';
        const timeTxt = modalSelectedTime || '—';

        const nom = document.getElementById('kd-modal-name').value.trim();
        const telephone = document.getElementById('kd-modal-phone').value.trim();
        const cin = document.getElementById('kd-modal-cin').value.trim();
        const email = document.getElementById('kd-modal-email').value.trim();

        clearModalError();
        stepNextBtn.disabled = true;
        const originalLabel = stepNextBtn.textContent;
        stepNextBtn.textContent = 'Réservation en cours...';

        (async () => {
          try {
            if (typeof kdCreateReservation === 'undefined') {
              throw new Error("auth.js n'est pas chargé sur cette page.");
            }

            // 1) On enregistre VRAIMENT la réservation dans Supabase (bloque les doubles-réservations)
            await kdCreateReservation({
              terrain_id: t.id,
              numero_terrain: getCurrentModalNumeroTerrain(),
              date_reservation: formatDateISO(modalSelectedDate),
              heure_reservation: timeTxt,
              nom_client: nom,
              telephone_client: telephone,
              cin_client: cin,
              email_client: email
            });

            const detailsReservation = {
              to_email: email,
              client_nom: nom,
              client_telephone: telephone,
              client_cin: cin,
              terrain_nom: t.nom + subtxt,
              terrain_quartier: t.quartier,
              terrain_prix: t.prix + ' DH / heure',
              date_reservation: dateTxt,
              heure_reservation: timeTxt
            };

            const successDetails = `${t.nom}${subtxt} — ${t.quartier}, le ${dateTxt} à ${timeTxt}.`;
            const waMessage = `⚽ On joue à ${t.nom}${subtxt} (${t.quartier}) le ${dateTxt} à ${timeTxt} ! Rejoins-nous 👇\nhttps://korador.vercel.app/terrains.html`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

            if (typeof emailjs !== 'undefined') {
              // Remplace "SERVICE_ID" et "TEMPLATE_ID" par les tiens (EmailJS > Email Services / Email Templates)
              emailjs.send('SERVICE_ID', 'TEMPLATE_ID', detailsReservation)
                .then(() => {
                  showBookingSuccess(`${successDetails} Un email de confirmation a été envoyé à ${email}.`, waUrl);
                })
                .catch((err) => {
                  console.error('Erreur envoi email :', err);
                  showBookingSuccess(`${successDetails} (l'email n'a pas pu être envoyé, vérifie la config EmailJS)`, waUrl);
                });
            } else {
              showBookingSuccess(`${successDetails} (démo — EmailJS non chargé)`, waUrl);
            }

          } catch (err) {
            stepNextBtn.disabled = false;
            stepNextBtn.textContent = originalLabel;

            if (err.code === 'SLOT_TAKEN') {
              showModalError(err.message);
              await refreshReservedSlots();
              goToModalStep(2);
            } else {
              console.error('Korador: erreur création réservation —', err);
              showModalError("Une erreur est survenue, réessaie dans un instant.");
            }
          }
        })();
      }

    });
  }

  const bookingSuccessCloseBtn = document.getElementById('kd-booking-success-close');
  if (bookingSuccessCloseBtn) {
    bookingSuccessCloseBtn.addEventListener('click', closeBookingModal);
  }

  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', () => goToModalStep(Math.max(1, currentStep - 1)));
  }

  if (modalClose) modalClose.addEventListener('click', closeBookingModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeBookingModal(); });
  }

  // ---------- Chargement des terrains depuis Supabase (table `terrains`) ----------
  async function loadTerrainsFromSupabase(){
    if (typeof supabaseClient === 'undefined') {
      console.error('Korador: Supabase (auth.js) non chargé — impossible de récupérer les terrains.');
      return [];
    }

    const { data, error } = await supabaseClient
      .from('terrains')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Korador: erreur lors du chargement des terrains —', error);
      return [];
    }

    // Convertit les colonnes Supabase (snake_case) vers le format utilisé par le reste du fichier
    return (data || []).map(t => ({
      nom: t.nom,
      quartier: t.quartier,
      prix: t.prix,
      dispo: t.dispo !== false,
      note: Number(t.note) || 0,
      avis: t.avis || 0,
      nbTerrains: t.nb_terrains || 1,
      lat: t.lat !== null ? Number(t.lat) : null,
      lng: t.lng !== null ? Number(t.lng) : null,
      photo: t.photo || null,
      photos: (t.photos && t.photos.length) ? t.photos : (t.photo ? [t.photo] : []),
      description: t.description || '',
      horaires: t.horaires || ''
    }));
  }

  allTerrains = await loadTerrainsFromSupabase();
  terrains = allTerrains;

  // ---------- Initialisation ----------
  updateHeroStats();
  renderChips();
  renderGrid();
  initMap();

  // === Ouvre automatiquement la fiche détaillée si on arrive depuis un lien partagé ===
  const hash = window.location.hash; // ex: "#terrain=Stade%20Hay%20Hassani"
  if (hash.startsWith('#terrain=')) {
    const terrainName = decodeURIComponent(hash.replace('#terrain=', ''));
    const match = allTerrains.find(t => t.nom === terrainName);
    if (match) openDetailModal(match);
  }

});
