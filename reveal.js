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

  // === Bouton "Se connecter" / "Se déconnecter" selon l'état de connexion ===
  const loginBtn = document.querySelector('.btn-login');
  if (loginBtn && !loginBtn.id) { // évite les pages où ce bouton a déjà son propre script (dashboard, mes-reservations)
    (async function setupLoginLogoutButton(){
      if (typeof kdCheckSession === 'undefined') {
        // auth.js pas chargé sur cette page : comportement par défaut
        loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
        return;
      }
      let session = null;
      try { session = await kdCheckSession(); } catch (err) { /* pas connecté */ }

      if (session) {
        loginBtn.textContent = 'Se déconnecter';
        loginBtn.addEventListener('click', () => {
          if (typeof kdSignOut === 'function') kdSignOut();
        });
      } else {
        loginBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
      }
    })();
  }

  // === Lien "Espace propriétaire" dans le menu (visible seulement pour les comptes propriétaire connectés) ===
  // Indépendant du bloc ci-dessus pour marcher aussi sur les pages qui ont leur propre script
  // de connexion (mes-reservations.html, etc.).
  (async function setupOwnerNavLink(){
    if (typeof kdCheckSession === 'undefined' || typeof kdGetProfile === 'undefined') return;
    if (window.location.pathname.endsWith('dashboard-proprietaire.html')) return; // déjà sur la page

    let session = null;
    try { session = await kdCheckSession(); } catch (err) { return; }
    if (!session) return;

    let profile = null;
    try { profile = await kdGetProfile(session.user.id); } catch (err) { return; }
    if (!profile || profile.role !== 'proprietaire') return;

    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || navLinks.querySelector('a[href="dashboard-proprietaire.html"]')) return;

    const li = document.createElement('li');
    li.innerHTML = '<a href="dashboard-proprietaire.html">🏟️ Espace propriétaire</a>';
    navLinks.appendChild(li);
  })();

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

  // === Ballon compagnon du curseur — physique lissée (lerp) + frappe au clic ===
  // Désactivé sur tactile (pointer:coarse) et si "reduced motion" est demandé.
  (function setupCursorBall(){
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.getElementById('kd-cursor-ball')) return;

    const style = document.createElement('style');
    style.textContent = `
      #kd-cursor-ball{
        position:fixed; top:0; left:0; width:0; height:0; pointer-events:none; z-index:9999;
        opacity:0; transition:opacity .35s ease;
      }
      #kd-cursor-ball.kd-cb-visible{ opacity:1; }
      #kd-cursor-ball span{
        position:absolute; top:-13px; left:-13px; width:26px; height:26px; font-size:22px;
        line-height:26px; text-align:center; display:block; user-select:none;
      }
      .kd-kick-puff{
        position:fixed; font-size:14px; pointer-events:none; z-index:9998;
        transform:translate(-50%,-50%); animation:kd-kick-fade .5s ease forwards;
      }
      @keyframes kd-kick-fade{
        from{ opacity:.8; transform:translate(-50%,-50%) scale(.6); }
        to{ opacity:0; transform:translate(-50%,-50%) scale(1.8); }
      }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'kd-cursor-ball';
    wrapper.setAttribute('aria-hidden', 'true');
    const span = document.createElement('span');
    span.textContent = '⚽';
    wrapper.appendChild(span);
    document.body.appendChild(wrapper);

    let mouseX = -100, mouseY = -100;
    let ballX = mouseX, ballY = mouseY;
    let prevBallX = ballX;
    let rotation = 0;
    let started = false;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      if (!started) { ballX = mouseX; ballY = mouseY; prevBallX = ballX; started = true; wrapper.classList.add('kd-cb-visible'); }
    });
    document.addEventListener('mouseleave', () => wrapper.classList.remove('kd-cb-visible'));

    function tick(){
      // Interpolation ("lerp") vers la position de la souris : donne l'impression d'un
      // objet avec de l'inertie plutôt qu'un curseur qui suit au pixel près.
      ballX += (mouseX - ballX) * 0.16;
      ballY += (mouseY - ballY) * 0.16;

      const vx = ballX - prevBallX;
      rotation += vx * 5; // le ballon "roule" selon la vitesse horizontale réelle
      prevBallX = ballX;

      wrapper.style.transform = `translate(${ballX}px, ${ballY}px) rotate(${rotation}deg)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Petite "frappe" au clic : le ballon tourne fort + un effet de vitesse (💨) apparaît
    document.addEventListener('click', (e) => {
      span.animate([
        { transform: 'scale(1) rotate(0deg)' },
        { transform: 'scale(1.5) rotate(160deg)' },
        { transform: 'scale(1) rotate(0deg)' }
      ], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });

      const puff = document.createElement('div');
      puff.className = 'kd-kick-puff';
      puff.textContent = '💨';
      puff.style.left = e.clientX + 'px';
      puff.style.top = e.clientY + 'px';
      document.body.appendChild(puff);
      setTimeout(() => puff.remove(), 520);
    });
  })();
});
