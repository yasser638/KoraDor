document.addEventListener('DOMContentLoaded', function () {

  // === Coordonnées approximatives de chaque terrain à Casablanca ===
  // Remplace lat/lng par les vraies coordonnées GPS de chaque terrain (clic droit sur Google Maps > "Que se trouve ici ?")
  const terrains = [
    { nom:"Terrain Al Amal",      quartier:"Sidi Maarouf", prix:250, note:4.5, avis:28, lat:33.5340, lng:-7.6398 },
    { nom:"Complexe Anfa Foot",   quartier:"Anfa",         prix:300, note:4.8, avis:52, lat:33.5931, lng:-7.6478 },
    { nom:"Green Arena",          quartier:"Bourgogne",    prix:220, note:4.1, avis:19, lat:33.5950, lng:-7.6180 },
    { nom:"Stade Hay Hassani",    quartier:"Hay Hassani",  prix:180, note:3.9, avis:34, lat:33.5588, lng:-7.6647 },
    { nom:"City Foot Maarif",     quartier:"Maarif",       prix:280, note:4.6, avis:41, lat:33.5731, lng:-7.6299 },
    { nom:"Terrain Oasis Club",   quartier:"Oasis",        prix:240, note:4.3, avis:23, lat:33.5462, lng:-7.6297 }
  ];

  const mapEl = document.getElementById('kd-map');
  if (!mapEl || typeof L === 'undefined') return;

  const map = L.map('kd-map').setView([33.5731, -7.6298], 12); // centré sur Casablanca

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const listEl = document.getElementById('kd-map-list');
  const markerRefs = []; // { terrain, marker }

  terrains.forEach(t => {
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

    if (listEl) {
      const card = document.createElement('div');
      card.className = 'kd-map-list-item';
      card.innerHTML = `
        <div>
          <strong>${t.nom}</strong>
          <span>${t.quartier} — ${t.prix} DH/heure</span>
        </div>
        <button type="button" class="kd-btn-back" style="background:var(--cream-2);">Voir sur la carte</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        map.setView([t.lat, t.lng], 15);
        marker.openPopup();
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      listEl.appendChild(card);
    }
  });

  // === Recherche d'un terrain par nom ou quartier ===
  const searchInput = document.getElementById('kd-map-search');
  const searchMsg = document.getElementById('kd-map-search-msg');

  function normalize(str){
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = normalize(e.target.value.trim());

      if (q === '') {
        searchMsg.hidden = true;
        map.setView([33.5731, -7.6298], 12);
        return;
      }

      const matches = markerRefs.filter(({ terrain }) =>
        normalize(terrain.nom).includes(q) || normalize(terrain.quartier).includes(q)
      );

      if (matches.length === 0) {
        searchMsg.hidden = false;
        searchMsg.textContent = 'Aucun terrain ne correspond à ta recherche.';
        return;
      }

      searchMsg.hidden = true;

      if (matches.length === 1) {
        const { terrain, marker } = matches[0];
        map.setView([terrain.lat, terrain.lng], 15);
        marker.openPopup();
      } else {
        const bounds = L.latLngBounds(matches.map(({ terrain }) => [terrain.lat, terrain.lng]));
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    });
  }

});
