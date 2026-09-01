// ==========================================================
// KORADOR — Mes réservations (espace joueur)
// ==========================================================

document.addEventListener('DOMContentLoaded', async function () {

  const loadingEl = document.getElementById('kd-mr-loading');
  const contentEl = document.getElementById('kd-mr-content');
  const upcomingWrap = document.getElementById('kd-mr-upcoming');
  const pastWrap = document.getElementById('kd-mr-past');
  const logoutBtn = document.getElementById('kd-logout-btn');

  // ---------- 1) Vérifie la connexion ----------
  const session = await kdCheckSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // ---------- Menu profil (regroupe espace propriétaire si besoin, contact, déconnexion...) ----------
  if (logoutBtn) {
    let profileForMenu = null;
    try { profileForMenu = await kdGetCurrentProfile(); } catch (err) { /* pas grave, fallback ci-dessous */ }
    if (profileForMenu && typeof buildProfileMenu === 'function') {
      buildProfileMenu(logoutBtn, profileForMenu);
    } else {
      logoutBtn.addEventListener('click', () => {
        if (typeof kdSignOut === 'function') kdSignOut();
      });
    }
  }

  // ---------- 2) Charge les réservations ----------
  let reservations = [];
  try {
    reservations = await kdGetMyReservations();
  } catch (err) {
    loadingEl.innerHTML = `<div class="kd-mr-empty">Erreur lors du chargement de tes réservations.</div>`;
    console.error('Korador:', err);
    return;
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = reservations.filter(r => r.date_reservation >= todayStr && r.statut !== 'annulee');
  const past = reservations.filter(r => r.date_reservation < todayStr || r.statut === 'annulee');

  function formatDate(d){
    return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  }
  function statutLabel(statut){
    if (statut === 'confirmee') return 'Confirmée';
    if (statut === 'annulee') return 'Annulée';
    return 'En attente';
  }

  function renderCard(r, { showCancel, showReview }){
    const t = r.terrains || {};
    const hasAvis = Array.isArray(r.avis) && r.avis.length > 0;

    const photoHtml = t.photo
      ? `<img src="${t.photo}" alt="${t.nom || ''}" class="kd-mr-card-photo" loading="lazy" onerror="this.outerHTML='<div class=&quot;kd-mr-card-photo-fallback&quot;>⚽</div>';">`
      : `<div class="kd-mr-card-photo-fallback">⚽</div>`;

    const div = document.createElement('div');
    div.className = 'kd-mr-card';
    div.innerHTML = `
      <div class="kd-mr-card-left">
        ${photoHtml}
        <div class="kd-mr-card-main">
          <strong>${t.nom || 'Terrain'}${r.numero_terrain > 1 ? ' (Terrain ' + r.numero_terrain + ')' : ''}</strong>
          <span class="kd-mr-quartier">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
            ${t.quartier || ''}
          </span>
          <span class="kd-mr-badge ${r.statut}">${statutLabel(r.statut)}</span>
        </div>
      </div>
      <div class="kd-mr-card-when">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <span class="kd-mr-when-text">${formatDate(r.date_reservation)}<span>${r.heure_reservation}</span></span>
      </div>
      <div class="kd-mr-actions"></div>
    `;

    const actionsEl = div.querySelector('.kd-mr-actions');

    if (showCancel && r.statut !== 'annulee') {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'kd-mr-btn cancel';
      cancelBtn.textContent = 'Annuler';
      cancelBtn.addEventListener('click', async () => {
        cancelBtn.disabled = true;
        cancelBtn.textContent = '...';
        try {
          await kdCancelReservation(r.id);
          const badge = div.querySelector('.kd-mr-badge');
          badge.className = 'kd-mr-badge annulee';
          badge.textContent = 'Annulée';
          cancelBtn.remove();
        } catch (err) {
          console.error('Korador: erreur annulation —', err);
          cancelBtn.disabled = false;
          cancelBtn.textContent = 'Annuler';
        }
      });
      actionsEl.appendChild(cancelBtn);
    }

    if (showReview && !hasAvis && r.statut !== 'annulee') {
      const reviewBtn = document.createElement('button');
      reviewBtn.type = 'button';
      reviewBtn.className = 'kd-mr-btn review';
      reviewBtn.textContent = 'Laisser un avis';
      reviewBtn.addEventListener('click', () => openAvisModal(r, t, reviewBtn));
      actionsEl.appendChild(reviewBtn);
    } else if (showReview && hasAvis) {
      const doneLabel = document.createElement('span');
      doneLabel.style.cssText = 'font-size:12px; color:var(--text-soft);';
      doneLabel.textContent = 'Avis envoyé ✓';
      actionsEl.appendChild(doneLabel);
    }

    return div;
  }

  if (!upcoming.length) {
    upcomingWrap.innerHTML = `<div class="kd-mr-empty"><div class="kd-mr-empty-icon">📅</div>Aucune réservation à venir. <a href="terrains.html">Trouve un terrain →</a></div>`;
  } else {
    upcoming.forEach(r => upcomingWrap.appendChild(renderCard(r, { showCancel: true, showReview: false })));
  }

  if (!past.length) {
    pastWrap.innerHTML = `<div class="kd-mr-empty"><div class="kd-mr-empty-icon">⚽</div>Pas encore de match joué avec Korador.</div>`;
  } else {
    past.forEach(r => pastWrap.appendChild(renderCard(r, { showCancel: false, showReview: true })));
  }

  loadingEl.hidden = true;
  contentEl.hidden = false;

  // ---------- Modale d'avis ----------
  const avisOverlay = document.getElementById('kd-avis-overlay');
  const avisStars = document.querySelectorAll('.kd-avis-star');
  const avisComment = document.getElementById('kd-avis-comment');
  const avisSubmitBtn = document.getElementById('kd-avis-submit-btn');
  const avisCancelBtn = document.getElementById('kd-avis-cancel-btn');
  const avisTerrainName = document.getElementById('kd-avis-terrain-name');

  let currentReservation = null;
  let currentReviewBtn = null;
  let selectedNote = 0;

  function paintStars(note){
    avisStars.forEach(star => {
      star.classList.toggle('active', parseInt(star.dataset.note, 10) <= note);
    });
  }

  avisStars.forEach(star => {
    star.addEventListener('click', () => {
      selectedNote = parseInt(star.dataset.note, 10);
      paintStars(selectedNote);
    });
  });

  function openAvisModal(reservation, terrain, reviewBtn){
    currentReservation = reservation;
    currentReviewBtn = reviewBtn;
    selectedNote = 0;
    paintStars(0);
    avisComment.value = '';
    avisTerrainName.textContent = `Laisse ton avis sur ${terrain.nom || 'ce terrain'}.`;
    avisOverlay.classList.add('open');
  }

  function closeAvisModal(){
    avisOverlay.classList.remove('open');
    currentReservation = null;
    currentReviewBtn = null;
  }

  avisCancelBtn.addEventListener('click', closeAvisModal);
  avisOverlay.addEventListener('click', (e) => { if (e.target === avisOverlay) closeAvisModal(); });

  avisSubmitBtn.addEventListener('click', async () => {
    if (!selectedNote) return;
    avisSubmitBtn.disabled = true;
    avisSubmitBtn.textContent = 'Envoi...';
    try {
      await kdSubmitAvis({
        reservation_id: currentReservation.id,
        terrain_id: currentReservation.terrain_id,
        note: selectedNote,
        commentaire: avisComment.value.trim()
      });
      if (currentReviewBtn) {
        const span = document.createElement('span');
        span.style.cssText = 'font-size:12px; color:var(--text-soft);';
        span.textContent = 'Avis envoyé ✓';
        currentReviewBtn.replaceWith(span);
      }
      closeAvisModal();
    } catch (err) {
      console.error('Korador: erreur envoi avis —', err);
    }
    avisSubmitBtn.disabled = false;
    avisSubmitBtn.textContent = 'Envoyer';
  });

});
