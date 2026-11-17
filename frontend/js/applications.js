/**
 * Applications Manager
 * Manages app registry, app launching, CRUD modifications, and DRM warnings.
 */

class TVApplications {
  constructor() {
    this.apps = [];
    this.recentApps = [];
    this.editingAppId = null;
  }

  async init() {
    await this.fetchApps();
    await this.fetchRecentApps();
    this.renderHomeRows();
    this.renderAppsGrid();
    this.setupModalListeners();
  }

  async fetchApps() {
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        this.apps = await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch /api/apps, using fallback configuration', err);
    }
  }

  async fetchRecentApps() {
    try {
      const res = await fetch('/api/apps/recent');
      if (res.ok) {
        this.recentApps = await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch /api/apps/recent', err);
    }
  }

  renderHomeRows() {
    // 1. "Your Apps" Row
    const yourAppsContainer = document.getElementById('row-your-apps');
    if (yourAppsContainer) {
      yourAppsContainer.innerHTML = '';
      this.apps.filter(a => a.enabled).forEach(app => {
        yourAppsContainer.appendChild(this.createAppTile(app));
      });
    }

    // 2. "Recently Opened" Row
    const recentContainer = document.getElementById('row-recent-apps');
    if (recentContainer) {
      recentContainer.innerHTML = '';
      if (this.recentApps.length === 0) {
        recentContainer.innerHTML = `<p class="tv-row-subtext" style="padding: 10px;">No recently launched applications.</p>`;
      } else {
        this.recentApps.forEach(item => {
          const app = this.apps.find(a => a.id === item.id) || item;
          recentContainer.appendChild(this.createAppTile(app));
        });
      }
    }
  }

  renderAppsGrid() {
    const gridContainer = document.getElementById('apps-grid-container');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    this.apps.forEach(app => {
      const tile = this.createAppTile(app, true);
      gridContainer.appendChild(tile);
    });
  }

  createAppTile(app, isFullGrid = false) {
    const tile = document.createElement('div');
    tile.className = 'app-tile focusable';
    tile.dataset.id = app.id;
    tile.tabIndex = 0;

    let drmBadge = '';
    if (app.drm_warning) {
      drmBadge = `<span class="app-tile-drm-badge">DRM</span>`;
    }

    tile.innerHTML = `
      ${drmBadge}
      <div class="app-tile-icon-wrapper">
        <img src="${app.icon}" alt="${app.name}" onerror="this.src='/assets/icons/browser.svg'"/>
      </div>
      <div class="app-tile-name">${app.name}</div>
    `;

    // Click handler -> Launch app or trigger action
    tile.addEventListener('click', () => {
      if (isFullGrid && window.isAppManageModeActive) {
        this.openEditModal(app.id);
      } else {
        this.launchApp(app);
      }
    });

    return tile;
  }

  async launchApp(app) {
    if (app.drm_warning) {
      // Show DRM & Performance advisory modal for Pi 3B+
      this.showDrmWarningModal(app);
      return;
    }

    this.executeLaunch(app);
  }

  async executeLaunch(app) {
    window.TVApp?.showToast(`Launching ${app.name}...`);
    try {
      const res = await fetch(`/api/apps/launch/${app.id}`, { method: 'POST' });
      const data = await res.json();
      
      // Refresh recently opened list
      await this.fetchRecentApps();
      this.renderHomeRows();

      if (data.status === 'ok' && data.url) {
        // Open web application
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Launch failure:', err);
      window.TVApp?.showToast(`Failed to launch ${app.name}`);
    }
  }

  showDrmWarningModal(app) {
    const modal = document.getElementById('modal-drm-warning');
    if (!modal) {
      this.executeLaunch(app);
      return;
    }

    document.getElementById('drm-app-name').textContent = app.name;
    const proceedBtn = document.getElementById('btn-drm-proceed');
    
    // Replace listener cleanly
    const newProceedBtn = proceedBtn.cloneNode(true);
    proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
    newProceedBtn.addEventListener('click', () => {
      window.SpatialNav.closeModal();
      this.executeLaunch(app);
    });

    window.SpatialNav.openModal('modal-drm-warning');
  }

  openEditModal(appId = null) {
    this.editingAppId = appId;
    const modal = document.getElementById('modal-app-editor');
    if (!modal) return;

    const titleEl = document.getElementById('modal-app-editor-title');
    const nameInput = document.getElementById('app-edit-name');
    const urlInput = document.getElementById('app-edit-url');
    const iconInput = document.getElementById('app-edit-icon');
    const catInput = document.getElementById('app-edit-category');
    const deleteBtn = document.getElementById('btn-app-delete');

    if (appId) {
      const app = this.apps.find(a => a.id === appId);
      if (!app) return;

      titleEl.textContent = `Edit Shortcut: ${app.name}`;
      nameInput.value = app.name;
      urlInput.value = app.url;
      iconInput.value = app.icon;
      catInput.value = app.category;
      deleteBtn.style.display = 'inline-flex';
    } else {
      titleEl.textContent = 'Add Application Shortcut';
      nameInput.value = '';
      urlInput.value = '';
      iconInput.value = '/assets/icons/browser.svg';
      catInput.value = 'streaming';
      deleteBtn.style.display = 'none';
    }

    window.SpatialNav.openModal('modal-app-editor');
  }

  async saveApp() {
    const name = document.getElementById('app-edit-name').value.trim();
    const url = document.getElementById('app-edit-url').value.trim();
    const icon = document.getElementById('app-edit-icon').value.trim() || '/assets/icons/browser.svg';
    const category = document.getElementById('app-edit-category').value.trim() || 'streaming';

    if (!name || !url) {
      window.TVApp?.showToast('Name and Launch URL are required');
      return;
    }

    const payload = {
      name,
      url,
      icon,
      category,
      enabled: true
    };

    try {
      let res;
      if (this.editingAppId) {
        res = await fetch(`/api/apps/${this.editingAppId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        payload.id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        res = await fetch('/api/apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        window.TVApp?.showToast('Application shortcut saved successfully');
        window.SpatialNav.closeModal();
        await this.fetchApps();
        this.renderHomeRows();
        this.renderAppsGrid();
      }
    } catch (err) {
      console.error('Failed to save app:', err);
      window.TVApp?.showToast('Error saving application');
    }
  }

  async deleteApp() {
    if (!this.editingAppId) return;

    try {
      const res = await fetch(`/api/apps/${this.editingAppId}`, { method: 'DELETE' });
      if (res.ok) {
        window.TVApp?.showToast('Application shortcut removed');
        window.SpatialNav.closeModal();
        await this.fetchApps();
        this.renderHomeRows();
        this.renderAppsGrid();
      }
    } catch (err) {
      console.error('Failed to delete app:', err);
    }
  }

  setupModalListeners() {
    document.getElementById('btn-app-save')?.addEventListener('click', () => this.saveApp());
    document.getElementById('btn-app-delete')?.addEventListener('click', () => this.deleteApp());
    document.getElementById('btn-app-cancel')?.addEventListener('click', () => window.SpatialNav.closeModal());
    document.getElementById('btn-drm-cancel')?.addEventListener('click', () => window.SpatialNav.closeModal());
  }
}

window.TVApps = new TVApplications();
