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
  const otpForm = document.getElementById('kd-otp-form');
  const otpInput = document.getElementById('kd-otp-code');
  const otpError = document.getElementById('kd-otp-error');
  const otpEmailHint = document.getElementById('kd-otp-email-hint');
  const otpSubmitBtn = document.getElementById('kd-otp-submit-btn');
  const otpResendBtn = document.getElementById('kd-otp-resend-btn');
  const submitBtn = document.getElementById('kd-login-submit-btn');

  if (!form) return;

  let currentMode = 'connexion';
  let selectedRole = 'client';
  let pendingEmail = '';

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

    errorEl.hidden = true;
    submitBtn.disabled = true;

    try {
      if (typeof kdSignUp === 'undefined') {
        throw new Error("auth.js n'est pas chargé sur cette page.");
      }

      if (currentMode === 'inscription') {
        label.textContent = 'Création du compte...';
        await kdSignUp({ email, password, nom, role: selectedRole });

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

      setTimeout(() => goToRoleBasedPage(role), 1200);

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

});
