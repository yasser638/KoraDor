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
    .select('id, nom, quartier, prix')
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

  // ---------- 5b) Graphique du revenu par mois ----------
  renderRevenueChart(reservations, terrainsById);

  // ---------- 5c) Export CSV ----------
  const exportBtn = document.getElementById('kd-dash-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportReservationsToCSV(reservations, terrainsById));
  }

  function renderRevenueChart(reservations, terrainsById){
    const container = document.getElementById('kd-dash-revenue-chart');
    if (!container) return;

    // Regroupe le revenu (réservations non annulées) par mois (les 6 derniers mois avec activité)
    const byMonth = {};
    reservations
      .filter(r => r.statut !== 'annulee')
      .forEach(r => {
        const monthKey = r.date_reservation.slice(0, 7); // "YYYY-MM"
        const prix = terrainsById[r.terrain_id]?.prix || 0;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + prix;
      });

    const months = Object.keys(byMonth).sort().slice(-6); // 6 derniers mois avec des réservations

    if (!months.length) {
      container.innerHTML = `<div class="kd-dash-chart-empty">Pas encore assez de données pour afficher un graphique.</div>`;
      return;
    }

    const values = months.map(m => byMonth[m]);
    const maxVal = Math.max(...values, 1);
    const width = 640, height = 200, padding = 30, barGap = 14;
    const barWidth = (width - padding * 2 - barGap * (months.length - 1)) / months.length;

    const monthLabel = (key) => {
      const [y, m] = key.split('-');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
    };

    let bars = '';
    months.forEach((m, i) => {
      const val = byMonth[m];
      const barHeight = (val / maxVal) * (height - padding - 30);
      const x = padding + i * (barWidth + barGap);
      const y = height - padding - barHeight;
      bars += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6" fill="#2F5D34"></rect>
        <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" class="kd-dash-chart-value-label">${val.toLocaleString('fr-FR')}</text>
        <text x="${x + barWidth / 2}" y="${height - padding + 18}" text-anchor="middle" class="kd-dash-chart-bar-label">${monthLabel(m)}</text>
      `;
    });

    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; max-height:220px;">${bars}</svg>`;
  }

  function exportReservationsToCSV(reservations, terrainsById){
    const headers = ['Date', 'Heure', 'Terrain', 'Quartier', 'Client', 'Téléphone', 'Email', 'CIN', 'Statut', 'Montant (DH)', 'Référence PayPal'];

    const escapeCsv = (val) => {
      const s = (val === null || val === undefined) ? '' : String(val);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = reservations.map(r => {
      const t = terrainsById[r.terrain_id];
      return [
        r.date_reservation,
        r.heure_reservation,
        t ? t.nom : '',
        t ? t.quartier : '',
        r.nom_client,
        r.telephone_client,
        r.email_client || '',
        r.cin_client || '',
        statutLabel(r.statut),
        r.statut !== 'annulee' ? (t?.prix || 0) : 0,
        r.paypal_capture_id || ''
      ].map(escapeCsv).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // \uFEFF = BOM pour accents corrects dans Excel

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `korador-reservations-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <th>Actions</th>
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
                  <td data-label="Actions">
                    <div class="kd-res-actions">
                      <button type="button" class="kd-res-action-btn confirm" data-action="confirmee" ${r.statut !== 'en_attente' ? 'disabled' : ''}>Confirmer</button>
                      <button type="button" class="kd-res-action-btn cancel" data-action="annulee" ${r.statut === 'annulee' ? 'disabled' : ''}>Annuler</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    function attachRowActions(){
      wrap.querySelectorAll('.kd-res-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const row = btn.closest('tr');
          const reservationId = row.dataset.id;
          const newStatut = btn.dataset.action;

          // Sécurité : une annulation ne peut pas être annulée depuis cette interface,
          // donc on demande une confirmation explicite avant de l'appliquer.
          if (newStatut === 'annulee' && !confirm('Annuler cette réservation ? Cette action ne peut pas être défaite ici.')) {
            return;
          }

          row.querySelectorAll('.kd-res-action-btn').forEach(b => b.disabled = true);

          const { error } = await supabaseClient
            .from('reservations')
            .update({ statut: newStatut })
            .eq('id', reservationId);

          if (error) {
            console.error('Korador: erreur mise à jour statut —', error);
            row.querySelectorAll('.kd-res-action-btn').forEach(b => b.disabled = false);
            return;
          }

          // Met à jour la donnée source pour que les filtres/compteurs restent corrects
          const r = reservations.find(x => x.id === reservationId);
          if (r) r.statut = newStatut;

          const confirmedNowCount = reservations.filter(x => x.statut === 'confirmee').length;
          document.getElementById('kd-dash-stat-confirmed').textContent = confirmedNowCount;

          renderAll();
        });
      });
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
      attachRowActions();

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

  loadingEl.hidden = true;
  contentEl.hidden = false;
});
