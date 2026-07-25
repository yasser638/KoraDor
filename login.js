document.addEventListener('DOMContentLoaded', function () {

  const modeTabs = document.querySelectorAll('.kd-login-tab');
  const nameGroup = document.getElementById('kd-login-name-group');
  const roleGroup = document.getElementById('kd-login-role-group');
  const roleBtns = document.querySelectorAll('.kd-role-btn');
  const title = document.getElementById('kd-login-title');
  const sub = document.getElementById('kd-login-sub');
  const form = document.getElementById('kd-login-form');
  const errorEl = document.getElementById('kd-login-error');
  const successPanel = document.getElementById('kd-login-success');
  const otpPanel = document.getElementById('kd-login-otp');
  const otpError = document.getElementById('kd-otp-error');
  const otpEmailHint = document.getElementById('kd-otp-email-hint');
  const otpResendBtn = document.getElementById('kd-otp-resend-btn');
  const submitBtn = document.getElementById('kd-login-submit-btn');

  if (!form) return;

  let currentMode = 'connexion';
  let selectedRole = 'client';
  let pendingEmail = '';

  // Mêmes règles que la modale de réservation (script.js), pour rester cohérent
  function isValidMoroccanPhone(v){
    const cleaned = v.replace(/[\s.-]/g, '');
    return /^(?:\+212|00212|0)[5-7][0-9]{8}$/.test(cleaned);
  }
  function isValidCin(v){
    return /^[a-zA-Z]{1,2}[0-9]{1,7}$/.test(v.trim());
  }

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

  function goToRoleBasedPage(role){
    if (role === 'proprietaire') {
      window.location.href = 'dashboard-proprietaire.html';
    } else {
      window.location.href = 'index.html';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = submitBtn.querySelector('span');
    const original = label.textContent;
    const email = document.getElementById('kd-login-identifier').value.trim();
    const password = document.getElementById('kd-login-password').value;
    const nom = document.getElementById('kd-login-name').value.trim();
    const telephone = document.getElementById('kd-login-phone').value.trim();
    const cin = document.getElementById('kd-login-cin').value.trim();

    errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      if (typeof kdSignUp === 'undefined') {
        throw new Error("auth.js n'est pas chargé sur cette page.");
      }

      if (currentMode === 'inscription') {
        if (!isValidMoroccanPhone(telephone)) {
          throw new Error("Numéro invalide (ex: 06 12 34 56 78).");
        }
        if (!isValidCin(cin)) {
          throw new Error("CIN invalide (ex: AB123456).");
        }

        label.textContent = 'Création du compte...';
        await kdSignUp({ email, password, nom, role: selectedRole, cin, telephone });

        pendingEmail = email;
        submitBtn.disabled = false;
        label.textContent = original;
        form.hidden = true;
        otpPanel.hidden = false;
        otpEmailHint.textContent = `On vient d'envoyer un code à ${email}.`;
        document.getElementById('kd-otp-code').focus();
        return;
      }

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

      setTimeout(() => goToRoleBasedPage(role), 1200);

    } catch (err) {
      submitBtn.disabled = false;
      label.textContent = original;
      errorEl.textContent = err.message || "Une erreur est survenue. Vérifie tes identifiants.";
      errorEl.hidden = false;
    }
  });

  // Si l'utilisateur revient sur login.html alors qu'il est déjà connecté
  // (session existante), on le redirige direct au lieu de lui remontrer le formulaire.
  async function redirectIfAlreadyConnected(){
    if (typeof kdCheckSession === 'undefined') return;
    try {
      const session = await kdCheckSession();
      if (!session) return;
      let role = selectedRole;
      try {
        const profile = await kdGetProfile(session.user.id);
        role = profile.role;
      } catch (err) { /* fallback sur selectedRole */ }
      goToRoleBasedPage(role);
    } catch (err) { /* pas connecté, l'utilisateur continue normalement */ }
  }
  redirectIfAlreadyConnected();

  // ---------- Vérification du code à 6 chiffres ----------
  const otpForm = document.getElementById('kd-otp-form');
  const otpCodeInput = document.getElementById('kd-otp-code');
  const otpSubmitBtn = document.getElementById('kd-otp-submit-btn');

  // n'accepte que des chiffres, 6 max
  otpCodeInput.addEventListener('input', () => {
    otpCodeInput.value = otpCodeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = otpSubmitBtn.querySelector('span');
    const original = label.textContent;
    const code = otpCodeInput.value.trim();

    otpError.hidden = true;

    if (code.length !== 6) {
      otpError.textContent = 'Le code doit contenir 6 chiffres.';
      otpError.hidden = false;
      return;
    }

    otpSubmitBtn.disabled = true;
    label.textContent = 'Vérification...';

    try {
      if (typeof kdVerifyOtp === 'undefined') {
        throw new Error("auth.js n'est pas chargé sur cette page.");
      }

      const result = await kdVerifyOtp({ email: pendingEmail, token: code, type: 'signup' });
      const userId = result.user?.id;

      let role = selectedRole;
      if (userId) {
        try {
          const profile = await kdGetProfile(userId);
          role = profile.role;
        } catch (err) { /* profil pas encore prêt */ }
      }

      otpPanel.hidden = true;
      successPanel.classList.add('kd-show');
      setTimeout(() => goToRoleBasedPage(role), 1200);

    } catch (err) {
      otpSubmitBtn.disabled = false;
      label.textContent = original;
      otpError.textContent = err.message || "Code invalide ou expiré. Vérifie ou renvoie un nouveau code.";
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
      otpResendBtn.textContent = "Renvoyer le code";
    }
    setTimeout(() => {
      otpResendBtn.disabled = false;
      otpResendBtn.textContent = "Renvoyer le code";
    }, 4000);
  });

});
