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
  if (!fadeEls.length) return;

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
});