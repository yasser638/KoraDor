document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('kd-contact-form');
  const successMsg = document.getElementById('kd-contact-success');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = {
      nom: document.getElementById('kd-c-name').value,
      email: document.getElementById('kd-c-email').value,
      telephone: document.getElementById('kd-c-phone').value,
      sujet: document.getElementById('kd-c-subject').value,
      message: document.getElementById('kd-c-message').value
    };

    // === Branche ici l'envoi réel (ex: appel API, EmailJS, Formspree...) ===
    console.log('Message de contact envoyé :', data);

    successMsg.hidden = false;
    form.reset();

    setTimeout(() => { successMsg.hidden = true; }, 6000);
  });

});