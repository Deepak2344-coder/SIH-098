(() => {
  'use strict';

  /* ── Scroll Reveal ─────────────────────────────────────────── */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ── Mobile Menu Toggle ────────────────────────────────────── */
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.navlinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ── Gallery Lightbox ──────────────────────────────────────── */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  if (lightbox && lightboxImg) {
    document.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', () => {
        const src = card.getAttribute('data-lightbox');
        if (src) {
          lightboxImg.src = src;
          lightbox.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        lightboxImg.src = '';
      }
    });
  }

  /* ── 3D Model Viewer: file://-safe GLB source ────────────────
     model-viewer fetches `src` over HTTP, which file:// pages block
     via CORS. shell-data.js (shared with simulations/shell-viewer)
     loads as a classic script even from file://, so decode its
     embedded base64 into a Blob URL — no server, no duplication. */
  const cadViewer = document.getElementById('cad-viewer');
  if (cadViewer && window.SHELL_GLB_BASE64) {
    try {
      const bin = atob(window.SHELL_GLB_BASE64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      cadViewer.setAttribute('src', blobUrl);
    } catch (err) {
      /* keep the static assets/models/ArtilleryShell.glb src (server contexts) */
    }
  }
  if (cadViewer) {
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const orbit = btn.getAttribute('data-orbit');
        if (orbit) cadViewer.cameraOrbit = orbit;
      });
    });
  }

  /* ── Smooth scroll fallback for older browsers ─────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
