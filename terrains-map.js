document.addEventListener('DOMContentLoaded', function () {

  // === Remplace ce tableau par tes vrais terrains ===
  const allTerrains = [
    { nom:"Terrain Al Amal",      quartier:"Sidi Maarouf", prix:250, dispo:true,  note:4.5, avis:28, nbTerrains:2, lat:33.5340, lng:-7.6398, photo:"https://fr.reformsports.com/oachoata/2020/09/mini-futbol-sahasi-ozellikleri-ve-olculeri.jpg" },
    { nom:"Complexe Anfa Foot",   quartier:"Anfa",         prix:300, dispo:true,  note:4.8, avis:52, nbTerrains:4, lat:33.5931, lng:-7.6478, photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT80W-XTaACYEw02TDddAE3yQ5p4IKdnMui9M5_e-5KhGbMrRYErTatqw&s=10" },
    { nom:"Green Arena",          quartier:"Bourgogne",    prix:220, dispo:false, note:4.1, avis:19, nbTerrains:3, lat:33.5950, lng:-7.6180, photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTBNI-zlqi0Zoe7VFz1mUnzssjXQmFcqAlViDB4larZV6jHGrG9R6mYN5E&s=10" },
    { nom:"Stade Hay Hassani",    quartier:"Hay Hassani",  prix:180, dispo:true,  note:3.9, avis:34, nbTerrains:1, lat:33.5588, lng:-7.6647, photo:"https://www.hatkosport.com/wp-content/uploads/2020/03/outdoor-field.jpg" },
    { nom:"City Foot Maarif",     quartier:"Maarif",       prix:280, dispo:true,  note:4.6, avis:41, nbTerrains:5, lat:33.5731, lng:-7.6299, photo:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRoI5T_63KeH8gmjYqne64wWZTEgvG6yz_kNyEAEwTC9kDv3B7TlofT8w-f&s=10" },
    { nom:"Terrain Oasis Club",   quartier:"Oasis",        prix:240, dispo:false, note:4.3, avis:23, nbTerrains:2, lat:33.5462, lng:-7.6297, photo:"https://quintessia.ma/wp-content/uploads/2024/11/WhatsApp-Image-2024-10-15-a-11.05.40_5ce343f8.jpg" }
  ];

  let terrains = allTerrains;
  let selectedQuartier = '';
  let searchQuery = '';

  // ---------- Étoiles ----------
  function renderStars(note){
    const pct = Math.max(0, Math.min(5, note)) / 5 * 100;
    return `
      <span class="kd-stars">
        <span class="kd-stars-bg">★★★★★</span>
        <span class="kd-stars-fg" style="width:${pct}%">★★★★★</span>
      </span>`;
  }

  function normalize(str){
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ---------- En-tête (chiffres) ----------
  function updateHeroStats(){
    const totalEl = document.getElementById('kd-count-total');
    const dispoEl = document.getElementById('kd-count-dispo');
    if (totalEl) totalEl.textContent = allTerrains.length;
    if (dispoEl) dispoEl.textContent = allTerrains.filter(t => t.dispo).length;
  }

  // ---------- Puces de quartier (générées depuis les données) ----------
  const chipsWrap = document.getElementById('kd-filter-chips');
  function renderChips(){
    if (!chipsWrap) return;
    const quartiers = [...new Set(allTerrains.map(t => t.quartier))];
    chipsWrap.innerHTML = `<button type="button" class="kd-chip active" data-quartier="">Tous les quartiers</button>` +
      quartiers.map(q => `<button type="button" class="kd-chip" data-quartier="${q}">${q}</button>`).join('');

    chipsWrap.querySelectorAll('.kd-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chipsWrap.querySelectorAll('.kd-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedQuartier = chip.dataset.quartier;
        applyFilters();
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
          <a href="index.html#reserve=${encodeURIComponent(t.nom)}" class="kd-book-btn" style="display:block; text-align:center; text-decoration:none;">Réserver</a>
        </div>
      </div>
    `).join('');
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

  // ---------- Filtrage combiné (quartier + recherche texte) ----------
  const searchMsg = document.getElementById('kd-map-search-msg');

  function applyFilters(){
    terrains = allTerrains.filter(t => {
      const matchQuartier = selectedQuartier === '' || t.quartier === selectedQuartier;
      const matchSearch = searchQuery === '' ||
        normalize(t.nom).includes(searchQuery) || normalize(t.quartier).includes(searchQuery);
      return matchQuartier && matchSearch;
    });

    if (searchMsg) {
      searchMsg.hidden = terrains.length !== 0;
      searchMsg.textContent = 'Aucun terrain ne correspond à ta recherche.';
    }

    renderGrid();
    updateMapForFilter();
  }

  const searchInput = document.getElementById('kd-map-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = normalize(e.target.value.trim());
      applyFilters();
    });
  }

  // ---------- Initialisation ----------
  updateHeroStats();
  renderChips();
  renderGrid();
  initMap();

});
