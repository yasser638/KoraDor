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

  // ---------- 6) Affiche le tableau des réservations ----------
  const wrap = document.getElementById('kd-dash-reservations-wrap');

  if (!reservations.length) {
    wrap.innerHTML = `<div class="kd-dash-empty">Aucune réservation pour l'instant sur tes terrains.</div>`;
  } else {
    wrap.innerHTML = `
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
          ${reservations.map(r => {
            const t = terrainsById[r.terrain_id];
            const dateTxt = new Date(r.date_reservation + 'T00:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
            return `
              <tr data-id="${r.id}">
                <td>${dateTxt}<span class="kd-res-sub">${r.heure_reservation}</span></td>
                <td>${t ? t.nom : '—'}${t && t.quartier ? `<span class="kd-res-sub">${t.quartier}${r.numero_terrain > 1 ? ' · Terrain ' + r.numero_terrain : ''}</span>` : ''}</td>
                <td>${r.nom_client}<span class="kd-res-sub">${r.cin_client || ''}</span></td>
                <td>${r.telephone_client}<span class="kd-res-sub">${r.email_client || ''}</span></td>
                <td><span class="kd-res-badge ${r.statut}">${statutLabel(r.statut)}</span></td>
                <td>
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

    wrap.querySelectorAll('.kd-res-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const reservationId = row.dataset.id;
        const newStatut = btn.dataset.action;

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

        const badge = row.querySelector('.kd-res-badge');
        badge.className = `kd-res-badge ${newStatut}`;
        badge.textContent = statutLabel(newStatut);
        row.querySelector('.confirm').disabled = newStatut !== 'en_attente';
        row.querySelector('.cancel').disabled = newStatut === 'annulee';

        // Met à jour le compteur "Confirmées" affiché en haut
        const confirmedNowCount = wrap.querySelectorAll('.kd-res-badge.confirmee').length;
        document.getElementById('kd-dash-stat-confirmed').textContent = confirmedNowCount;
      });
    });
  }

  function statutLabel(statut){
    if (statut === 'confirmee') return 'Confirmée';
    if (statut === 'annulee') return 'Annulée';
    return 'En attente';
  }

  loadingEl.hidden = true;
  contentEl.hidden = false;
});
