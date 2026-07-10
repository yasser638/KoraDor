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

  // === Modale de connexion (visuelle uniquement, sans backend) ===
  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn) {
    const overlay = document.createElement('div');
    overlay.className = 'kd-login-overlay';
    overlay.id = 'kd-login-overlay';
    overlay.innerHTML = `
      <div class="kd-login-modal">
        <button type="button" class="kd-login-close" aria-label="Fermer">&times;</button>

        <div class="kd-login-tabs">
          <button type="button" class="kd-login-tab active" data-mode="connexion">Connexion</button>
          <button type="button" class="kd-login-tab" data-mode="inscription">Inscription</button>
        </div>

        <div class="kd-login-body">
          <h3 class="kd-login-title" id="kd-login-title">Content de te revoir</h3>
          <p class="kd-login-sub" id="kd-login-sub">Connecte-toi pour gérer tes réservations.</p>

          <form class="kd-login-form" id="kd-login-form">
            <div id="kd-login-name-group" hidden>
              <label class="kd-form-label">Nom complet</label>
              <input type="text" class="kd-form-input" id="kd-login-name" placeholder="Ton nom" autocomplete="name">
            </div>
            <label class="kd-form-label">Email ou téléphone</label>
            <input type="text" class="kd-form-input" id="kd-login-identifier" placeholder="toi@gmail.com ou 06 XX XX XX XX" autocomplete="username">
            <label class="kd-form-label">Mot de passe</label>
            <input type="password" class="kd-form-input" id="kd-login-password" placeholder="••••••••" autocomplete="current-password">

            <button type="submit" class="kd-btn-next kd-login-submit" id="kd-login-submit-btn">
              <span>Se connecter</span>
            </button>
          </form>
        </div>

        <div class="kd-login-success" id="kd-login-success">
          <div class="kd-login-success-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h3>C'est bon, tu es connecté !</h3>
          <p>Retrouve tes réservations depuis ton profil.</p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const modeTabs = overlay.querySelectorAll('.kd-login-tab');
    const nameGroup = overlay.querySelector('#kd-login-name-group');
    const title = overlay.querySelector('#kd-login-title');
    const sub = overlay.querySelector('#kd-login-sub');
    const form = overlay.querySelector('#kd-login-form');
    const successPanel = overlay.querySelector('#kd-login-success');
    const submitBtn = overlay.querySelector('#kd-login-submit-btn');
    const closeBtn = overlay.querySelector('.kd-login-close');

    function setMode(mode){
      modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      if (mode === 'inscription') {
        nameGroup.hidden = false;
        title.textContent = 'Crée ton compte';
        sub.textContent = 'Rejoins Korador pour réserver plus vite.';
        submitBtn.querySelector('span').textContent = 'Créer mon compte';
      } else {
        nameGroup.hidden = true;
        title.textContent = 'Content de te revoir';
        sub.textContent = 'Connecte-toi pour gérer tes réservations.';
        submitBtn.querySelector('span').textContent = 'Se connecter';
      }
    }

    modeTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

    function openLogin(){
      overlay.classList.add('kd-open');
      form.hidden = false;
      successPanel.classList.remove('kd-show');
      form.reset();
    }
    function closeLogin(){
      overlay.classList.remove('kd-open');
    }

    loginBtn.addEventListener('click', openLogin);
    closeBtn.addEventListener('click', closeLogin);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLogin(); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const label = submitBtn.querySelector('span');
      const original = label.textContent;
      submitBtn.disabled = true;
      label.textContent = 'Connexion en cours...';

      // Pas de backend : simulation visuelle uniquement, aucune donnée n'est envoyée ni stockée.
      setTimeout(() => {
        submitBtn.disabled = false;
        label.textContent = original;
        form.hidden = true;
        successPanel.classList.add('kd-show');

        setTimeout(closeLogin, 1600);
      }, 700);
    });
  }
});
