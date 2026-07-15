document.addEventListener('DOMContentLoaded', function () {

  // === Remplace ce tableau par tes vrais terrains ===
  // "photos" : mets ici toutes les photos du terrain (la 1ère sert de couverture sur la carte).
  // "description" et "horaires" s'affichent dans la fiche détaillée (bouton "Voir plus").
  const allTerrains = [
    { nom:"Terrain Al Amal",      quartier:"Sidi Maarouf", prix:250, dispo:true,  note:4.5, avis:28, nbTerrains:2, lat:33.5340, lng:-7.6398,
      photo:"https://fr.reformsports.com/oachoata/2020/09/mini-futbol-sahasi-ozellikleri-ve-olculeri.jpg",
      photos:["https://fr.reformsports.com/oachoata/2020/09/mini-futbol-sahasi-ozellikleri-ve-olculeri.jpg"],
      description:"Terrain en gazon synthétique dernière génération, éclairage LED pour les matchs en soirée. Ambiance conviviale, idéal pour les matchs entre potes.",
      horaires:"Tous les jours : 08h00 – 23h00" },
    { nom:"Complexe Anfa Foot",   quartier:"Anfa",         prix:300, dispo:true,  note:4.8, avis:52, nbTerrains:4, lat:33.5931, lng:-7.6478,
      photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT80W-XTaACYEw02TDddAE3yQ5p4IKdnMui9M5_e-5KhGbMrRYErTatqw&s=10",
      photos:["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT80W-XTaACYEw02TDddAE3yQ5p4IKdnMui9M5_e-5KhGbMrRYErTatqw&s=10"],
      description:"4 terrains disponibles, vestiaires avec douches chaudes et parking gratuit surveillé. Le complexe le plus complet du quartier Anfa.",
      horaires:"Lun–Sam : 07h00 – 00h00 · Dim : 09h00 – 22h00" },
    { nom:"Green Arena",          quartier:"Bourgogne",    prix:220, dispo:false, note:4.1, avis:19, nbTerrains:3, lat:33.5950, lng:-7.6180,
      photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBNI-zlqi0Zoe7VFz1mUnzssjXQmFcqAlViDB4larZV6jHGrG9R6mYN5E&s=10",
      photos:["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBNI-zlqi0Zoe7VFz1mUnzssjXQmFcqAlViDB4larZV6jHGrG9R6mYN5E&s=10"],
      description:"Ambiance arena couverte, protégée du vent et de la pluie. Parfait pour jouer toute l'année sans interruption.",
      horaires:"Tous les jours : 09h00 – 23h30" },
    { nom:"Stade Hay Hassani",    quartier:"Hay Hassani",  prix:180, dispo:true,  note:3.9, avis:34, nbTerrains:1, lat:33.5588, lng:-7.6647,
      photo:"https://www.hatkosport.com/wp-content/uploads/2020/03/outdoor-field.jpg",
      photos:["https://www.hatkosport.com/wp-content/uploads/2020/03/outdoor-field.jpg"],
      description:"Le terrain le plus abordable du quartier, ambiance populaire et chaleureuse. Bon rapport qualité-prix pour les matchs réguliers.",
      horaires:"Tous les jours : 08h00 – 22h00" },
    { nom:"City Foot Maarif",     quartier:"Maarif",       prix:280, dispo:true,  note:4.6, avis:41, nbTerrains:5, lat:33.5731, lng:-7.6299,
      photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoI5T_63KeH8gmjYqne64wWZTEgvG6yz_kNyEAEwTC9kDv3B7TlofT8w-f&s=10",
      photos:["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoI5T_63KeH8gmjYqne64wWZTEgvG6yz_kNyEAEwTC9kDv3B7TlofT8w-f&s=10"],
      description:"5 terrains sur un même site, tribune pour les spectateurs et buvette sur place. Idéal pour les tournois entre équipes.",
      horaires:"Tous les jours : 07h30 – 00h00" },
    { nom:"Terrain Oasis Club",   quartier:"Oasis",        prix:240, dispo:false, note:4.3, avis:23, nbTerrains:2, lat:33.5462, lng:-7.6297,
      photo:"https://quintessia.ma/wp-content/uploads/2024/11/WhatsApp-Image-2024-10-15-a-11.05.40_5ce343f8.jpg",
      photos:["https://quintessia.ma/wp-content/uploads/2024/11/WhatsApp-Image-2024-10-15-a-11.05.40_5ce343f8.jpg"],
      description:"Cadre calme et résidentiel, gazon bien entretenu. Accès facile et places de parking à proximité immédiate.",
      horaires:"Tous les jours : 08h00 – 22h30" }
  ];

  let terrains = allTerrains;
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
            <a href="index.html#reserve=${encodeURIComponent(t.nom)}" class="kd-book-btn" style="flex:1; text-align:center; text-decoration:none;">Réserver</a>
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
          <a href="index.html#reserve=${encodeURIComponent(t.nom)}">Réserver ce terrain</a>
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
    imgEl.src = detailPhotos[detailIndex] || '';
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
    document.getElementById('kd-detail-reserve').href = `index.html#reserve=${encodeURIComponent(t.nom)}`;

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

  // ---------- Initialisation ----------
  updateHeroStats();
  renderChips();
  renderGrid();
  initMap();

});
