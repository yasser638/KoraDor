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
  const otpBoxes = document.querySelectorAll('.kd-otp-box');
  const otpBoxesWrap = document.getElementById('kd-otp-boxes');
  const otpError = document.getElementById('kd-otp-error');
  const otpEmailHint = document.getElementById('kd-otp-email-hint');
  const otpSubmitBtn = document.getElementById('kd-otp-submit-btn');
  const otpResendBtn = document.getElementById('kd-otp-resend-btn');
  const submitBtn = document.getElementById('kd-login-submit-btn');

  if (!form) return;

  let currentMode = 'connexion';
  let selectedRole = 'client';
  let pendingEmail = '';

  // ---------- Saisie du code à 6 chiffres (une case par chiffre) ----------
  function getOtpValue(){
    return Array.from(otpBoxes).map(b => b.value).join('');
  }
  function clearOtpBoxes(){
    otpBoxes.forEach(b => { b.value = ''; b.classList.remove('kd-otp-error'); });
    if (otpBoxes[0]) otpBoxes[0].focus();
  }
  function setOtpError(hasError){
    otpBoxes.forEach(b => b.classList.toggle('kd-otp-error', hasError));
    if (hasError && otpBoxesWrap) {
      otpBoxesWrap.classList.add('kd-shake');
      setTimeout(() => otpBoxesWrap.classList.remove('kd-shake'), 400);
    }
  }
  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      setOtpError(false);
      otpError.hidden = true;
      if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpBoxes[i - 1].focus();
      }
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, otpBoxes.length);
      pasted.split('').forEach((digit, idx) => { if (otpBoxes[idx]) otpBoxes[idx].value = digit; });
      const nextIdx = Math.min(pasted.length, otpBoxes.length - 1);
      otpBoxes[nextIdx].focus();
    });
  });

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
        otpEmailHint.textContent = `Entre le code à 6 chiffres envoyé à ${email}.`;
        clearOtpBoxes();
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
    const token = getOtpValue();

    otpError.hidden = true;

    if (token.length < 6) {
      setOtpError(true);
      otpError.textContent = 'Entre les 6 chiffres du code.';
      otpError.hidden = false;
      return;
    }

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
      setOtpError(true);
      otpError.textContent = err.message || 'Code invalide ou expiré. Réessaie.';
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
      clearOtpBoxes();
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
