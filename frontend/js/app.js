/**
 * Google TV-Inspired Launcher - Main Application Orchestrator
 */

class TVApplication {
  constructor() {
    this.toastTimeout = null;
  }

  async init() {
    console.log('[TVApp] Initializing Smart TV Operating System UI...');

    // 1. Initialize Navigation Bar listeners
    this.setupNavBar();

    // 2. Initialize Subsystems
    if (window.TVApps) await window.TVApps.init();
    if (window.TVSettings) await window.TVSettings.init();
    if (window.TVLibrary) await window.TVLibrary.init();
    if (window.TVRouter) window.TVRouter.init();
    if (window.TVRemote) window.TVRemote.connect();

    // 3. Start System Clock & Periodic Diagnostics
    this.startClock();

    // 4. Set initial focus
    setTimeout(() => {
      window.SpatialNav?.focusInitialElement();
    }, 150);

    // 5. Hero Action Buttons
    document.getElementById('btn-hero-watch')?.addEventListener('click', () => {
      window.TVLibrary?.playMediaItem('Interstellar Odyssey');
    });
    document.getElementById('btn-hero-details')?.addEventListener('click', () => {
      this.showToast('Details: Interstellar Odyssey (2024) - Direct 4K HDR Stream');
    });

    // 6. Apps Management Mode toggle
    document.getElementById('btn-manage-apps')?.addEventListener('click', () => {
      window.isAppManageModeActive = !window.isAppManageModeActive;
      const btn = document.getElementById('btn-manage-apps');
      if (window.isAppManageModeActive) {
        btn.textContent = 'Done Managing';
        btn.style.background = 'var(--accent-blue)';
        this.showToast('App Management Mode: Click any app to edit or delete.');
      } else {
        btn.textContent = 'Manage Apps';
        btn.style.background = '';
      }
    });

    document.getElementById('btn-add-app')?.addEventListener('click', () => {
      window.TVApps?.openEditModal(null);
    });
  }

  setupNavBar() {
    document.querySelectorAll('#top-nav-bar .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const screen = item.dataset.screen;
        if (screen && window.TVRouter) {
          window.TVRouter.navigate(screen);
        }
      });
    });

    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
      if (window.TVRouter) {
        window.TVRouter.navigate('settings');
      }
    });
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const clockEl = document.getElementById('top-bar-clock');
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };
    updateTime();
    setInterval(updateTime, 10000);
  }

  showToast(message, durationMs = 3500) {
    const toast = document.getElementById('tv-toast');
    const msgEl = document.getElementById('tv-toast-message');
    if (!toast || !msgEl) return;

    clearTimeout(this.toastTimeout);
    msgEl.textContent = message;
    toast.classList.add('visible');

    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, durationMs);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.TVApp = new TVApplication();
  window.TVApp.init();
});
