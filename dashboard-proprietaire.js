// ==========================================================
// KORADOR — Tableau de bord propriétaire
// ==========================================================

document.addEventListener('DOMContentLoaded', async function () {

  const loadingEl = document.getElementById('kd-dash-loading');
  const contentEl = document.getElementById('kd-dash-content');
  const logoutBtn = document.getElementById('kd-logout-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof kdSignOut === 'function') kdSignOut();
    });
  }

  function showMessage(text){
    loadingEl.textContent = text;
  }

  // ---------- 1) Vérifie la connexion ----------
  const session = await kdCheckSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // ---------- 2) Vérifie que c'est bien un compte propriétaire ----------
  let profile;
  try {
    profile = await kdGetProfile(session.user.id);
  } catch (err) {
    showMessage("Impossible de charger ton profil. Réessaie dans un instant.");
    return;
  }

  if (profile.role !== 'proprietaire') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('kd-dash-greeting').textContent =
    profile.nom ? `Bienvenue ${profile.nom.split(' ')[0]}` : 'Bienvenue';

  // ---------- 3) Récupère les terrains de ce propriétaire ----------
  const { data: terrains, error: terrainsError } = await supabaseClient
    .from('terrains')
    .select('id, nom, quartier, prix, nb_terrains')
    .eq('proprietaire_id', session.user.id);

  if (terrainsError) {
    showMessage("Erreur lors du chargement de tes terrains.");
    console.error('Korador:', terrainsError);
    return;
  }

  document.getElementById('kd-dash-stat-terrains').textContent = terrains.length;

  if (!terrains.length) {
    loadingEl.hidden = true;
    contentEl.hidden = false;
    document.getElementById('kd-dash-reservations-wrap').innerHTML =
      `<div class="kd-dash-empty">Aucun terrain n'est encore associé à ton compte. Contacte l'équipe Korador pour lier ton/tes terrain(s).</div>`;
    return;
  }

  const terrainsById = {};
  terrains.forEach(t => { terrainsById[t.id] = t; });
  const terrainIds = terrains.map(t => t.id);

  setupOnSiteBooking(terrains);

  // ---------- 4) Récupère les réservations de ces terrains ----------
  const { data: reservations, error: resError } = await supabaseClient
    .from('reservations')
    .select('*')
    .in('terrain_id', terrainIds)
    .order('date_reservation', { ascending: false })
    .order('heure_reservation', { ascending: false });

  if (resError) {
    showMessage("Erreur lors du chargement des réservations.");
    console.error('Korador:', resError);
    return;
  }

  // ---------- 5) Calcule les statistiques ----------
  const confirmed = reservations.filter(r => r.statut === 'confirmee');
  const revenue = reservations
    .filter(r => r.statut !== 'annulee')
    .reduce((sum, r) => sum + (terrainsById[r.terrain_id]?.prix || 0), 0);

  document.getElementById('kd-dash-stat-count').textContent = reservations.length;
  document.getElementById('kd-dash-stat-confirmed').textContent = confirmed.length;
  document.getElementById('kd-dash-stat-revenue').textContent = revenue.toLocaleString('fr-FR') + ' DH';

  // ---------- 5b) Graphique du revenu par mois (courbe + dégradé + badge de tendance) ----------
  renderRevenueChart(reservations, terrainsById);

  // ---------- 5c) Export PDF (liste des clients ayant réservé) ----------
  const exportBtn = document.getElementById('kd-dash-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportClientsToPDF(reservations, terrainsById, profile));
  }

  function renderRevenueChart(reservations, terrainsById){
    const container = document.getElementById('kd-dash-revenue-chart');
    const trendBadge = document.getElementById('kd-dash-trend-badge');
    if (!container) return;

    const byMonth = {};
    reservations
      .filter(r => r.statut !== 'annulee')
      .forEach(r => {
        const monthKey = r.date_reservation.slice(0, 7);
        const prix = terrainsById[r.terrain_id]?.prix || 0;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + prix;
      });

    const months = Object.keys(byMonth).sort().slice(-6);

    if (!months.length) {
      container.innerHTML = `<div class="kd-dash-chart-empty">Pas encore assez de données pour afficher un graphique.</div>`;
      if (trendBadge) trendBadge.textContent = '';
      return;
    }

    const values = months.map(m => byMonth[m]);
    const maxVal = Math.max(...values, 1);
    const width = 640, height = 200, padding = 34;
    const stepX = months.length > 1 ? (width - padding * 2) / (months.length - 1) : 0;

    const points = values.map((val, i) => {
      const x = months.length > 1 ? padding + i * stepX : width / 2;
      const y = height - padding - (val / maxVal) * (height - padding * 2 - 20);
      return { x, y, val };
    });

    // Courbe lissée : on relie les points avec des courbes de Bézier plutôt que des lignes droites
    let linePath = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1], curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      linePath += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
    }
    const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

    const monthLabel = (key) => {
      const [y, m] = key.split('-');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
    };

    const dots = points.map((p, i) => `
      <circle class="kd-dash-chart-dot" cx="${p.x}" cy="${p.y}" r="4"></circle>
      <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" class="kd-dash-chart-value-label">${p.val.toLocaleString('fr-FR')}</text>
      <text x="${p.x}" y="${height - padding + 20}" text-anchor="middle" class="kd-dash-chart-bar-label">${monthLabel(months[i])}</text>
    `).join('');

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; max-height:220px;">
        <defs>
          <linearGradient id="kd-chart-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2F5D34" stop-opacity="0.28"></stop>
            <stop offset="100%" stop-color="#2F5D34" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#kd-chart-fade)"></path>
        <path d="${linePath}" fill="none" stroke="#2F5D34" stroke-width="2.5" stroke-linecap="round"></path>
        ${dots}
      </svg>
    `;

    // Badge de tendance : compare le dernier mois au précédent
    if (trendBadge) {
      if (values.length < 2) {
        trendBadge.textContent = '';
      } else {
        const last = values[values.length - 1];
        const prev = values[values.length - 2];
        const diff = prev === 0 ? 100 : Math.round(((last - prev) / prev) * 100);
        const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        const arrow = diff > 0 ? '↗' : diff < 0 ? '↘' : '→';
        trendBadge.innerHTML = `<span class="kd-dash-trend-badge ${cls}">${arrow} ${diff > 0 ? '+' : ''}${diff}% vs mois précédent</span>`;
      }
    }
  }

  function exportClientsToPDF(reservations, terrainsById, profile){
    if (typeof window.jspdf === 'undefined') {
      alert("Le module PDF n'a pas pu se charger. Réessaie dans un instant.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(30, 70, 32);
    doc.text('Korador — Clients ayant réservé', 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${profile?.nom || ''}`, 40, 58);

    const headers = ['Date', 'Heure', 'Terrain', 'Client', 'Téléphone', 'Email', 'Statut', 'Montant (DH)'];
    const colWidths = [65, 50, 130, 110, 90, 140, 80, 80];
    let colX = [];
    let acc = 40;
    colWidths.forEach(w => { colX.push(acc); acc += w; });

    let y = 90;
    doc.setFillColor(226, 244, 230);
    doc.rect(40, y - 14, pageWidth - 80, 20, 'F');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 70, 32);
    headers.forEach((h, i) => doc.text(h, colX[i] + 4, y));
    y += 20;

    doc.setFontSize(9);
    reservations.forEach((r, idx) => {
      if (y > 560) { doc.addPage(); y = 50; }
      const t = terrainsById[r.terrain_id];
      if (idx % 2 === 0) {
        doc.setFillColor(250, 246, 226);
        doc.rect(40, y - 13, pageWidth - 80, 18, 'F');
      }
      doc.setTextColor(50, 50, 50);
      const row = [
        r.date_reservation,
        r.heure_reservation,
        t ? t.nom : '—',
        r.nom_client,
        r.telephone_client,
        r.email_client || '—',
        statutLabel(r.statut),
        r.statut !== 'annulee' ? String(t?.prix || 0) : '0',
      ];
      row.forEach((val, i) => doc.text(String(val).slice(0, 28), colX[i] + 4, y));
      y += 18;
    });

    doc.save(`korador-clients-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // ---------- 6) Affiche les réservations, avec filtres (statut / terrain / recherche) ----------
  const wrap = document.getElementById('kd-dash-reservations-wrap');

  if (!reservations.length) {
    wrap.innerHTML = `<div class="kd-dash-empty">Aucune réservation pour l'instant sur tes terrains.</div>`;
  } else {

    let statutFilter = 'all';
    let terrainFilter = 'all';
    let searchQuery = '';

    function getFilteredReservations(){
      return reservations.filter(r => {
        if (statutFilter !== 'all' && r.statut !== statutFilter) return false;
        if (terrainFilter !== 'all' && r.terrain_id !== terrainFilter) return false;
        if (searchQuery) {
          const haystack = `${r.nom_client} ${r.telephone_client}`.toLowerCase();
          if (!haystack.includes(searchQuery.toLowerCase())) return false;
        }
        return true;
      });
    }

    function tabCount(statut){
      return statut === 'all' ? reservations.length : reservations.filter(r => r.statut === statut).length;
    }

    const terrainOptions = terrains.length > 1
      ? `<select class="kd-res-terrain-select" id="kd-res-terrain-select">
          <option value="all">Tous les terrains</option>
          ${terrains.map(t => `<option value="${t.id}">${t.nom}</option>`).join('')}
        </select>`
      : '';

    function renderFilterBar(){
      return `
        <div class="kd-res-filterbar">
          <div class="kd-res-tabs" id="kd-res-tabs">
            <button type="button" class="kd-res-tab ${statutFilter === 'all' ? 'active' : ''}" data-statut="all">Toutes (${tabCount('all')})</button>
            <button type="button" class="kd-res-tab ${statutFilter === 'en_attente' ? 'active' : ''}" data-statut="en_attente">En attente (${tabCount('en_attente')})</button>
            <button type="button" class="kd-res-tab ${statutFilter === 'confirmee' ? 'active' : ''}" data-statut="confirmee">Confirmées (${tabCount('confirmee')})</button>
            <button type="button" class="kd-res-tab ${statutFilter === 'annulee' ? 'active' : ''}" data-statut="annulee">Annulées (${tabCount('annulee')})</button>
          </div>
          ${terrainOptions}
          <input type="text" class="kd-res-search" id="kd-res-search" placeholder="Chercher un client (nom, téléphone)..." value="${searchQuery}">
        </div>
      `;
    }

    function renderTableRows(list){
      if (!list.length) {
        return `<div class="kd-res-empty-filtered">Aucune réservation ne correspond à ce filtre.</div>`;
      }
      return `
        <table class="kd-res-table">
          <thead>
            <tr>
              <th>Date &amp; heure</th>
              <th>Terrain</th>
              <th>Client</th>
              <th>Contact</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(r => {
              const t = terrainsById[r.terrain_id];
              const dateTxt = new Date(r.date_reservation + 'T00:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
              return `
                <tr data-id="${r.id}">
                  <td data-label="Date">${dateTxt}<span class="kd-res-sub">${r.heure_reservation}</span></td>
                  <td data-label="Terrain">${t ? t.nom : '—'}${t && t.quartier ? `<span class="kd-res-sub">${t.quartier}${r.numero_terrain > 1 ? ' · Terrain ' + r.numero_terrain : ''}</span>` : ''}</td>
                  <td data-label="Client">${r.nom_client}<span class="kd-res-sub">${r.cin_client || ''}</span></td>
                  <td data-label="Contact">${r.telephone_client}<span class="kd-res-sub">${r.email_client || ''}</span></td>
                  <td data-label="Statut"><span class="kd-res-badge ${r.statut}">${statutLabel(r.statut)}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    function attachFilterHandlers(){
      document.querySelectorAll('.kd-res-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          statutFilter = tab.dataset.statut;
          renderAll();
        });
      });
      const terrainSelect = document.getElementById('kd-res-terrain-select');
      if (terrainSelect) {
        terrainSelect.value = terrainFilter;
        terrainSelect.addEventListener('change', () => {
          terrainFilter = terrainSelect.value;
          renderAll();
        });
      }
      const searchInput = document.getElementById('kd-res-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          searchQuery = searchInput.value;
          renderAll();
        });
      }
    }

    function renderAll(){
      const activeElementWasSearch = document.activeElement && document.activeElement.id === 'kd-res-search';
      const cursorPos = activeElementWasSearch ? document.activeElement.selectionStart : null;

      wrap.innerHTML = renderFilterBar() + renderTableRows(getFilteredReservations());
      attachFilterHandlers();

      if (activeElementWasSearch) {
        const input = document.getElementById('kd-res-search');
        if (input) { input.focus(); input.setSelectionRange(cursorPos, cursorPos); }
      }
    }

    renderAll();
  }

  function statutLabel(statut){
    if (statut === 'confirmee') return 'Confirmée';
    if (statut === 'annulee') return 'Annulée';
    return 'En attente';
  }

  const HEURES = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

  function setupOnSiteBooking(monTerrains){
    let selectedTerrain = monTerrains[0];
    let selectedNumeroTerrain = 1;
    let selectedDate = new Date();
    let reservedSlots = [];
    let todayBookedCount = 0;

    function formatDateISO(d){
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    const countBadge = document.getElementById('kdop-count-badge');
    function updateCountBadge(){
      countBadge.textContent = `⚡ ${todayBookedCount} réservé(s) aujourd'hui`;
    }

    // ---------- Sélecteur de terrain (affiché seulement si le propriétaire en gère plusieurs) ----------
    const terrainPicker = document.getElementById('kdop-terrain-picker');
    if (monTerrains.length > 1) {
      terrainPicker.innerHTML = monTerrains.map((t, i) =>
        `<button type="button" class="kdop-picker-btn ${i === 0 ? 'active' : ''}" data-id="${t.id}">${t.nom}</button>`
      ).join('');
      terrainPicker.querySelectorAll('.kdop-picker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          terrainPicker.querySelectorAll('.kdop-picker-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedTerrain = monTerrains.find(t => t.id === btn.dataset.id);
          selectedNumeroTerrain = 1;
          renderSubTerrainPicker();
          refreshSlots();
        });
      });
    }

    // ---------- Sélecteur de sous-terrain (affiché seulement si le terrain en a plusieurs) ----------
    const subPicker = document.getElementById('kdop-subterrain-picker');
    function renderSubTerrainPicker(){
      const nb = selectedTerrain.nb_terrains || 1;
      if (nb <= 1) { subPicker.innerHTML = ''; return; }
      subPicker.innerHTML = Array.from({ length: nb }, (_, i) => i + 1).map(n =>
        `<button type="button" class="kdop-picker-btn ${n === selectedNumeroTerrain ? 'active' : ''}" data-n="${n}">Terrain ${n}</button>`
      ).join('');
      subPicker.querySelectorAll('.kdop-picker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          subPicker.querySelectorAll('.kdop-picker-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedNumeroTerrain = parseInt(btn.dataset.n, 10);
          refreshSlots();
        });
      });
    }
    renderSubTerrainPicker();

    // ---------- Sélecteur de date ----------
    const todayBtn = document.getElementById('kdop-date-today');
    const tomorrowBtn = document.getElementById('kdop-date-tomorrow');
    const customDateInput = document.getElementById('kdop-date-custom');

    function setActiveDateBtn(btn){
      [todayBtn, tomorrowBtn].forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    todayBtn.addEventListener('click', () => {
      selectedDate = new Date();
      customDateInput.value = '';
      setActiveDateBtn(todayBtn);
      refreshSlots();
    });
    tomorrowBtn.addEventListener('click', () => {
      selectedDate = new Date();
      selectedDate.setDate(selectedDate.getDate() + 1);
      customDateInput.value = '';
      setActiveDateBtn(tomorrowBtn);
      refreshSlots();
    });
    customDateInput.addEventListener('change', () => {
      if (!customDateInput.value) return;
      selectedDate = new Date(customDateInput.value + 'T00:00:00');
      setActiveDateBtn(null);
      refreshSlots();
    });

    // ---------- Grille des créneaux (billets de match, un seul tap pour réserver) ----------
    const slotsEl = document.getElementById('kdop-slots');

    async function refreshSlots(){
      slotsEl.innerHTML = HEURES.map(h => `<button class="kdop-slot-btn loading" disabled>${h}</button>`).join('');
      try {
        reservedSlots = await kdGetReservedSlots({
          terrain_id: selectedTerrain.id,
          numero_terrain: selectedNumeroTerrain,
          date_reservation: formatDateISO(selectedDate),
        });
      } catch (err) {
        console.error('Korador: erreur chargement créneaux —', err);
        reservedSlots = [];
      }
      renderSlots();
    }

    function renderSlots(){
      slotsEl.innerHTML = HEURES.map(h => {
        const occupe = reservedSlots.includes(h);
        return `
          <button type="button" class="kdop-slot-btn ${occupe ? 'occupe' : 'dispo'}" data-heure="${h}" ${occupe ? 'disabled' : ''}>
            <span class="kdop-slot-ball">⚽</span>
            <span class="kdop-slot-heure">${h}</span>
          </button>
        `;
      }).join('');
      slotsEl.querySelectorAll('.kdop-slot-btn.dispo').forEach(btn => {
        btn.addEventListener('click', () => bookSlot(btn));
      });
    }

    // ---------- Toast de confirmation avec "Annuler" ----------
    const toastEl = document.getElementById('kdop-toast');
    const toastMsg = document.getElementById('kdop-toast-msg');
    const toastUndo = document.getElementById('kdop-toast-undo');
    let hideToastTimer = null;
    let lastBookingId = null;

    function showUndoToast(heure, reservationId){
      lastBookingId = reservationId;
      toastMsg.textContent = `${heure} réservé ✓`;
      toastEl.classList.add('show');
      toastUndo.hidden = false;
      clearTimeout(hideToastTimer);
      hideToastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        lastBookingId = null;
      }, 5000);
    }

    toastUndo.addEventListener('click', async () => {
      if (!lastBookingId) return;
      const idToUndo = lastBookingId;
      lastBookingId = null;
      clearTimeout(hideToastTimer);
      toastEl.classList.remove('show');

      const { error } = await supabaseClient.from('reservations').delete().eq('id', idToUndo);
      if (!error) {
        todayBookedCount = Math.max(0, todayBookedCount - 1);
        updateCountBadge();
        refreshSlots();
      }
    });

    // ---------- Réservation en un seul tap ----------
    async function bookSlot(btn){
      const heure = btn.dataset.heure;
      btn.disabled = true;

      const { data: sessionData } = await supabaseClient.auth.getSession();

      const { data: inserted, error } = await supabaseClient
        .from('reservations')
        .insert({
          terrain_id: selectedTerrain.id,
          numero_terrain: selectedNumeroTerrain,
          date_reservation: formatDateISO(selectedDate),
          heure_reservation: heure,
          user_id: sessionData?.session?.user?.id || null,
          nom_client: 'Client sur place',
          telephone_client: '—',
          // Réservation prise en personne sur le terrain, payée cash : confirmée directement.
          statut: 'confirmee',
        })
        .select()
        .single();

      if (error) {
        console.error('Korador: erreur réservation sur place —', error);
        btn.disabled = false;
        return;
      }

      btn.classList.remove('dispo');
      btn.classList.add('occupe', 'just-booked');
      reservedSlots.push(heure);
      todayBookedCount++;
      updateCountBadge();
      showUndoToast(heure, inserted.id);
    }

    updateCountBadge();
    refreshSlots();
  }

  loadingEl.hidden = true;
  contentEl.hidden = false;
});
