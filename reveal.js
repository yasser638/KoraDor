// Construit le menu profil (avatar + dropdown : mes réservations, espace propriétaire
// si besoin, contact, déconnexion) à la place d'un bouton donné ("Se connecter" /
// "Se déconnecter"). Exposée en dehors du DOMContentLoaded pour que d'autres scripts
// de page (mes-reservations.js, dashboard-proprietaire.js) puissent aussi l'utiliser
// pour leur propre bouton de déconnexion, une fois qu'ils ont chargé le profil.
function buildProfileMenu(loginBtn, profile){
  const onDashboard = window.location.pathname.endsWith('dashboard-proprietaire.html');
  const initial = (profile.nom || profile.email || '?').trim().charAt(0).toUpperCase() || '?';
  const firstName = profile.nom ? profile.nom.split(' ')[0] : 'Mon compte';

  const wrap = document.createElement('div');
  wrap.className = 'kd-profile-menu';
  wrap.innerHTML = `
    <button type="button" class="kd-profile-trigger" id="kd-profile-trigger" aria-haspopup="true" aria-expanded="false">
      <span class="kd-profile-avatar">${initial}</span>
      <span class="kd-profile-name">${firstName}</span>
      <svg class="kd-profile-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </button>
    <div class="kd-profile-dropdown" role="menu">
      <div class="kd-profile-dropdown-head">
        <span class="kd-profile-avatar kd-profile-avatar-lg">${initial}</span>
        <div>
          <strong>${profile.nom || 'Mon compte'}</strong>
          <span>${profile.email || ''}</span>
        </div>
      </div>
      <a href="mes-reservations.html" role="menuitem">⚽ Mes réservations</a>
      ${profile.role === 'proprietaire' && !onDashboard ? '<a href="dashboard-proprietaire.html" role="menuitem">🏟️ Espace propriétaire</a>' : ''}
      <a href="Contact.html" role="menuitem">✉️ Contact</a>
      <button type="button" class="kd-profile-logout" id="kd-profile-logout" role="menuitem">🚪 Se déconnecter</button>
    </div>
  `;

  loginBtn.replaceWith(wrap);

  const trigger = wrap.querySelector('#kd-profile-trigger');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrap.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) wrap.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { wrap.classList.remove('open'); trigger.focus(); }
  });

  wrap.querySelector('#kd-profile-logout').addEventListener('click', () => {
    if (typeof kdSignOut === 'function') kdSignOut();
  });

  // Sur mobile, un lien du menu profil doit aussi refermer le panneau plein écran
  // (le menu profil est ajouté après coup, donc en dehors du listener du burger).
  wrap.querySelectorAll('.kd-profile-dropdown a, .kd-profile-logout').forEach(el => {
    el.addEventListener('click', () => {
      wrap.classList.remove('open');
      const navMenu = document.querySelector('.nav-menu');
      const burger = document.querySelector('.kd-burger');
      if (navMenu) navMenu.classList.remove('kd-menu-open');
      if (burger) { burger.classList.remove('kd-burger-open'); burger.setAttribute('aria-label', 'Ouvrir le menu'); }
      document.body.classList.remove('kd-noscroll');
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {

  function animateCount(el, target, duration){
    const start = performance.now();
    function step(timestamp){
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out, ralentit en douceur à la fin
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString('fr-FR');
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('fr-FR');
      }
    }
    requestAnimationFrame(step);
  }

  const fadeEls = document.querySelectorAll('.kd-fade');
  if (fadeEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('kd-visible');

          // si la section contient des compteurs, on les anime en même temps que le fondu
          entry.target.querySelectorAll('.kd-count').forEach(counter => {
            const target = parseInt(counter.dataset.target, 10);
            if (!isNaN(target)) animateCount(counter, target, 1400);
          });

          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    fadeEls.forEach(el => observer.observe(el));
  }

  // === Accordéon FAQ ===
  document.querySelectorAll('.kd-faq-item').forEach(item => {
    const question = item.querySelector('.kd-faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.kd-faq-item.open').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // === Bouton retour en haut ===
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'kd-back-to-top';
  backToTop.setAttribute('aria-label', 'Retour en haut de la page');
  backToTop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('kd-visible', window.scrollY > 500);
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // === Menu hamburger mobile (injecté automatiquement sur toutes les pages) ===
  const navMenu = document.querySelector('.nav-menu');
  const brand = document.querySelector('.brand');

  if (navMenu && brand) {
    const burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'kd-burger';
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    brand.after(burger);

    burger.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('kd-menu-open');
      burger.classList.toggle('kd-burger-open', isOpen);
      burger.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.classList.toggle('kd-noscroll', isOpen);
    });

    // referme le menu quand on clique sur un lien ou un bouton à l'intérieur
    navMenu.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        navMenu.classList.remove('kd-menu-open');
        burger.classList.remove('kd-burger-open');
        document.body.classList.remove('kd-noscroll');
      });
    });
  }

  // === Bouton "Se connecter", ou menu profil regroupant tout (mes réservations, ===
  // === espace propriétaire si besoin, contact, se déconnecter) une fois connecté ===
  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn && !loginBtn.id) { // évite les pages où ce bouton a déjà son propre script (dashboard, mes-reservations)
    (async function setupAuthNav(){
      if (typeof kdGetCurrentProfile === 'undefined') {
        // auth.js pas chargé sur cette page : comportement par défaut
        loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
        return;
      }

      let profile = null;
      try { profile = await kdGetCurrentProfile(); } catch (err) { /* pas connecté */ }

      if (!profile) {
        loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
        return;
      }

      buildProfileMenu(loginBtn, profile);
    })();
  }

  // === Transitions natives entre pages (View Transitions API) ===
  // Rend la navigation entre pages fluide (fondu + léger scale) sans framework JS.
  // Support natif Chrome/Edge 126+ ; ignoré silencieusement ailleurs (dégradation propre).
  if (!document.getElementById('kd-vt-style')) {
    const vtStyle = document.createElement('style');
    vtStyle.id = 'kd-vt-style';
    vtStyle.textContent = `
      @view-transition { navigation: auto; }
      ::view-transition-old(root){ animation: kd-vt-out .26s ease both; }
      ::view-transition-new(root){ animation: kd-vt-in .34s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes kd-vt-out{ to{ opacity:0; transform:scale(.985); } }
      @keyframes kd-vt-in{ from{ opacity:0; transform:scale(1.012); } }
      @media (prefers-reduced-motion: reduce){
        ::view-transition-old(root), ::view-transition-new(root){ animation:none; }
      }
    `;
    document.head.appendChild(vtStyle);
  }

  // Nettoyage console : quand une transition entre pages est interrompue (ex: double-clic
  // rapide sur 2 liens), le navigateur rejette proprement la transition précédente.
  // C'est un comportement natif attendu, sans impact sur la navigation — on évite juste
  // le bruit dans la console.
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.name === 'AbortError' && /transition/i.test(e.reason.message || '')) {
      e.preventDefault();
    }
  });

  // === Boutons magnétiques (site entier) — suivent légèrement le curseur au survol ===
  // N'importe quel bouton/lien avec la classe "kd-magnetic" bénéficie de l'effet, sur toutes les pages.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !window.matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('.kd-magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transition = 'transform .08s linear';
        btn.style.transform = `translate(${x * 0.28}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
        btn.style.transform = 'translate(0, 0)';
      });
    });
  }
});
