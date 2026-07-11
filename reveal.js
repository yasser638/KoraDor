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

  // === Bouton "Se connecter" : redirige vers la page dédiée login.html ===
  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
