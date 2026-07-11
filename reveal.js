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
            <div id="kd-login-role-group" hidden>
              <label class="kd-form-label">Je suis</label>
              <div class="kd-role-choice">
                <button type="button" class="kd-role-btn active" data-role="client">⚽ Joueur</button>
                <button type="button" class="kd-role-btn" data-role="proprietaire">🏟️ Propriétaire</button>
              </div>
            </div>
            <label class="kd-form-label">Email</label>
            <input type="email" class="kd-form-input" id="kd-login-identifier" placeholder="toi@gmail.com" autocomplete="username">
            <label class="kd-form-label">Mot de passe</label>
            <input type="password" class="kd-form-input" id="kd-login-password" placeholder="••••••••" autocomplete="current-password">

            <p class="kd-login-error" id="kd-login-error" hidden></p>

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

        <div class="kd-login-otp" id="kd-login-otp" hidden>
          <h3 class="kd-login-title">Vérifie ton email</h3>
          <p class="kd-login-sub" id="kd-otp-email-hint">Entre le code à 6 chiffres qu'on vient de t'envoyer.</p>
          <form id="kd-otp-form">
            <input type="text" id="kd-otp-code" class="kd-form-input kd-otp-input" placeholder="000000" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
            <p class="kd-login-error" id="kd-otp-error" hidden></p>
            <button type="submit" class="kd-btn-next kd-login-submit" id="kd-otp-submit-btn">
              <span>Confirmer mon compte</span>
            </button>
            <button type="button" class="kd-otp-resend" id="kd-otp-resend-btn">Renvoyer le code</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const modeTabs = overlay.querySelectorAll('.kd-login-tab');
    const nameGroup = overlay.querySelector('#kd-login-name-group');
    const roleGroup = overlay.querySelector('#kd-login-role-group');
    const roleBtns = overlay.querySelectorAll('.kd-role-btn');
    const title = overlay.querySelector('#kd-login-title');
    const sub = overlay.querySelector('#kd-login-sub');
    const form = overlay.querySelector('#kd-login-form');
    const errorEl = overlay.querySelector('#kd-login-error');
    const successPanel = overlay.querySelector('#kd-login-success');
    const otpPanel = overlay.querySelector('#kd-login-otp');
    const otpForm = overlay.querySelector('#kd-otp-form');
    const otpInput = overlay.querySelector('#kd-otp-code');
    const otpError = overlay.querySelector('#kd-otp-error');
    const otpEmailHint = overlay.querySelector('#kd-otp-email-hint');
    const otpSubmitBtn = overlay.querySelector('#kd-otp-submit-btn');
    const otpResendBtn = overlay.querySelector('#kd-otp-resend-btn');
    const submitBtn = overlay.querySelector('#kd-login-submit-btn');
    const closeBtn = overlay.querySelector('.kd-login-close');

    let currentMode = 'connexion';
    let selectedRole = 'client';
    let pendingEmail = ''; // email en attente de confirmation par code

    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRole = btn.dataset.role;
      });
    });

    function setMode(mode){
      currentMode = mode;
      errorEl.hidden = true;
      modeTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
      if (mode === 'inscription') {
        nameGroup.hidden = false;
        roleGroup.hidden = false;
        title.textContent = 'Crée ton compte';
        sub.textContent = 'Rejoins Korador pour réserver plus vite.';
        submitBtn.querySelector('span').textContent = 'Créer mon compte';
      } else {
        nameGroup.hidden = true;
        roleGroup.hidden = true;
        title.textContent = 'Content de te revoir';
        sub.textContent = 'Connecte-toi pour gérer tes réservations.';
        submitBtn.querySelector('span').textContent = 'Se connecter';
      }
    }

    modeTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

    function openLogin(){
      overlay.classList.add('kd-open');
      form.hidden = false;
      otpPanel.hidden = true;
      errorEl.hidden = true;
      successPanel.classList.remove('kd-show');
      form.reset();
      setMode('connexion');
    }
    function closeLogin(){
      overlay.classList.remove('kd-open');
    }

    function goToRoleBasedPage(role){
      if (role === 'proprietaire') {
        window.location.href = 'dashboard-proprietaire.html';
      } else {
        window.location.reload();
      }
    }

    loginBtn.addEventListener('click', openLogin);
    closeBtn.addEventListener('click', closeLogin);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLogin(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = submitBtn.querySelector('span');
      const original = label.textContent;
      const email = document.getElementById('kd-login-identifier').value.trim();
      const password = document.getElementById('kd-login-password').value;
      const nom = document.getElementById('kd-login-name').value.trim();

      errorEl.hidden = true;
      submitBtn.disabled = true;

      try {
        if (typeof kdSignUp === 'undefined') {
          throw new Error("auth.js n'est pas chargé sur cette page.");
        }

        if (currentMode === 'inscription') {
          label.textContent = 'Création du compte...';
          await kdSignUp({ email, password, nom, role: selectedRole });

          // Étape suivante : demander le code reçu par email, pas encore connecté
          pendingEmail = email;
          submitBtn.disabled = false;
          label.textContent = original;
          form.hidden = true;
          otpPanel.hidden = false;
          otpEmailHint.textContent = `Entre le code à 6 chiffres envoyé à ${email}.`;
          otpInput.value = '';
          otpInput.focus();
          return;
        }

        // Mode connexion classique
        label.textContent = 'Connexion en cours...';
        const result = await kdSignIn({ email, password });
        const userId = result.user?.id;

        let role = selectedRole;
        if (userId) {
          try {
            const profile = await kdGetProfile(userId);
            role = profile.role;
          } catch (err) { /* profil pas encore prêt */ }
        }

        submitBtn.disabled = false;
        label.textContent = original;
        form.hidden = true;
        successPanel.classList.add('kd-show');

        setTimeout(() => { closeLogin(); goToRoleBasedPage(role); }, 1400);

      } catch (err) {
        submitBtn.disabled = false;
        label.textContent = original;
        errorEl.textContent = err.message || "Une erreur est survenue. Vérifie tes identifiants.";
        errorEl.hidden = false;
      }
    });

    // ---------- Vérification du code de confirmation (après inscription) ----------
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = otpSubmitBtn.querySelector('span');
      const original = label.textContent;
      const token = otpInput.value.trim();

      otpError.hidden = true;
      otpSubmitBtn.disabled = true;
      label.textContent = 'Vérification...';

      try {
        if (typeof kdVerifyOtp === 'undefined') {
          throw new Error("auth.js n'est pas chargé sur cette page.");
        }
        const result = await kdVerifyOtp({ email: pendingEmail, token });
        const userId = result.user?.id;

        let role = selectedRole;
        if (userId) {
          try {
            const profile = await kdGetProfile(userId);
            role = profile.role;
          } catch (err) { /* fallback sur selectedRole */ }
        }

        otpSubmitBtn.disabled = false;
        label.textContent = original;
        otpPanel.hidden = true;
        successPanel.classList.add('kd-show');

        setTimeout(() => { closeLogin(); goToRoleBasedPage(role); }, 1400);

      } catch (err) {
        otpSubmitBtn.disabled = false;
        label.textContent = original;
        otpError.textContent = err.message || "Code invalide ou expiré. Réessaie.";
        otpError.hidden = false;
      }
    });

    otpResendBtn.addEventListener('click', async () => {
      otpError.hidden = true;
      otpResendBtn.disabled = true;
      otpResendBtn.textContent = 'Envoi...';
      try {
        await kdResendCode({ email: pendingEmail });
        otpResendBtn.textContent = 'Code renvoyé !';
      } catch (err) {
        otpError.textContent = err.message || "Impossible de renvoyer le code.";
        otpError.hidden = false;
        otpResendBtn.textContent = 'Renvoyer le code';
      }
      setTimeout(() => {
        otpResendBtn.disabled = false;
        otpResendBtn.textContent = 'Renvoyer le code';
      }, 4000);
    });
  }
});
