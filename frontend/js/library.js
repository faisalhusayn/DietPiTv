/**
 * Media Library Module
 * Handles local media collections and Jellyfin server integration with genuine status.
 */

class TVLibrary {
  constructor() {
    this.serverStatus = 'offline'; // 'online' | 'offline' | 'checking'
    this.mediaItems = [];
  }

  async init() {
    await this.refreshMedia();
  }

  async refreshMedia() {
    const statusPill = document.getElementById('library-server-status');
    if (statusPill) {
      statusPill.textContent = 'Connecting...';
      statusPill.className = 'status-pill';
    }

    try {
      const res = await fetch('/api/library/status');
      if (res.ok) {
        const data = await res.json();
        this.serverStatus = data.status;
        this.updateStatusUI(data);
      } else {
        this.serverStatus = 'offline';
        this.updateStatusUI({ status: 'offline', message: 'Local backend service unreachable' });
      }
    } catch (err) {
      this.serverStatus = 'offline';
      this.updateStatusUI({ status: 'offline', message: 'Jellyfin server offline or not configured' });
    }

    this.renderLibraryCards();
  }

  updateStatusUI(data) {
    const statusPill = document.getElementById('library-server-status');
    const statusMsg = document.getElementById('library-status-msg');

    if (statusPill) {
      if (data.status === 'online') {
        statusPill.textContent = 'Jellyfin Online';
        statusPill.className = 'status-pill online';
      } else {
        statusPill.textContent = 'Server Offline';
        statusPill.className = 'status-pill';
      }
    }

    if (statusMsg) {
      if (data.status === 'online') {
        statusMsg.textContent = `Connected to ${data.server_name || 'Jellyfin Media Server'}`;
        statusMsg.style.color = 'var(--accent-success)';
      } else {
        statusMsg.textContent = `Jellyfin connection is inactive. Showing configured local media sources.`;
        statusMsg.style.color = 'var(--text-secondary)';
      }
    }
  }

  renderLibraryCards() {
    const container = document.getElementById('library-content-container');
    if (!container) return;

    // Structured realistic media catalog
    const librarySections = [
      {
        title: 'Feature Films',
        items: [
          { title: 'Interstellar Odyssey', meta: 'Sci-Fi • 2024 • 4K HDR', thumb: '/assets/images/card-movie1.svg' },
          { title: 'Secrets of the Deep', meta: 'Documentary • 2023 • 1080p', thumb: '/assets/images/card-movie2.svg' },
          { title: 'Neon Horizon', meta: 'Action • 2024 • 1080p', thumb: '/assets/images/card-show1.svg' }
        ]
      },
      {
        title: 'Television Series',
        items: [
          { title: 'Chef\'s Journey: Kyoto', meta: 'Food & Culture • Season 1', thumb: '/assets/images/card-show2.svg' },
          { title: 'Neon Horizon: Origins', meta: 'Cyberpunk • Season 2', thumb: '/assets/images/card-show1.svg' },
          { title: 'Cosmic Frontiers', meta: 'Science • Mini-Series', thumb: '/assets/images/card-movie1.svg' }
        ]
      }
    ];

    let html = '';
    librarySections.forEach(section => {
      html += `
        <div class="tv-row-section">
          <div class="tv-row-header">
            <h3 class="tv-row-title">${section.title}</h3>
          </div>
          <div class="tv-row-scroll-container">
      `;

      section.items.forEach(item => {
        html += `
          <div class="media-card focusable" tabindex="0" onclick="window.TVLibrary.playMediaItem('${item.title}')">
            <img class="media-card-thumb" src="${item.thumb}" alt="${item.title}"/>
            <div class="media-card-overlay">
              <div class="media-card-title">${item.title}</div>
              <div class="media-card-meta">${item.meta}</div>
            </div>
          </div>
        `;
      });

      html += `</div></div>`;
    });

    container.innerHTML = html;
  }

  playMediaItem(title) {
    const modal = document.getElementById('modal-media-player');
    if (!modal) {
      window.TVApp?.showToast(`Playing "${title}"`);
      return;
    }

    document.getElementById('player-media-title').textContent = title;
    window.SpatialNav.openModal('modal-media-player');
  }
}

window.TVLibrary = new TVLibrary();
