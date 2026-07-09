document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('kd-contact-form');
  const toast = document.getElementById('kd-toast');
  const submitBtn = document.getElementById('kd-contact-submit-btn');
  const messageInput = document.getElementById('kd-c-message');
  const charCountEl = document.getElementById('kd-char-count');

  if (!form) return;

  // Compteur de caractères en direct sur le message
  if (messageInput && charCountEl) {
    messageInput.addEventListener('input', () => {
      charCountEl.textContent = messageInput.value.length;
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      nom: document.getElementById('kd-c-name').value,
      email: document.getElementById('kd-c-email').value,
      telephone: document.getElementById('kd-c-phone').value,
      sujet: document.getElementById('kd-c-subject').value,
      message: messageInput.value
    };

    // === Branche ici l'envoi réel (ex: appel API, EmailJS, Formspree...) ===
    console.log('Message de contact envoyé :', data);

    // Petit état de chargement sur le bouton avant de confirmer
    const label = submitBtn.querySelector('.kd-submit-label');
    const texteOriginal = label.textContent;
    submitBtn.disabled = true;
    label.textContent = 'Envoi en cours...';

    setTimeout(() => {
      form.reset();
      if (charCountEl) charCountEl.textContent = '0';
      submitBtn.disabled = false;
      label.textContent = texteOriginal;

      // Affiche le toast de confirmation, en haut de l'écran
      if (toast) {
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 4000);
      }
    }, 700);
  });

});
