/**
 * Search Screen & On-Screen Virtual Keyboard (OSK)
 * TV-first QWERTY on-screen keyboard navigable entirely via D-pad.
 */

class TVSearch {
  constructor() {
    this.currentQuery = '';
    this.recentSearches = ['YouTube', 'Jellyfin', 'Sci-Fi Movies', 'Documentaries'];
    this.initKeyboard();
  }

  initKeyboard() {
    const layout = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '.'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '_', '/'],
      ['SPACE', 'BACKSPACE', 'CLEAR', 'SEARCH']
    ];

    const keyboardContainer = document.getElementById('tv-virtual-keyboard');
    if (!keyboardContainer) return;

    keyboardContainer.innerHTML = '';

    layout.forEach(rowKeys => {
      const row = document.createElement('div');
      row.className = 'keyboard-row';

      rowKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'key-btn focusable';
        btn.tabIndex = 0;
        btn.dataset.key = key;

        if (key === 'SPACE') {
          btn.classList.add('key-space');
          btn.textContent = 'Space';
        } else if (key === 'BACKSPACE') {
          btn.classList.add('key-wide');
          btn.textContent = '⌫ Back';
        } else if (key === 'CLEAR') {
          btn.classList.add('key-wide');
          btn.textContent = 'Clear';
        } else if (key === 'SEARCH') {
          btn.classList.add('key-wide');
          btn.style.background = 'var(--accent-blue)';
          btn.style.color = '#ffffff';
          btn.textContent = '🔍 Search';
        } else {
          btn.textContent = key;
        }

        btn.addEventListener('click', () => this.handleKeyPress(key));
        row.appendChild(btn);
      });

      keyboardContainer.appendChild(row);
    });

    // Listen for direct typing if physical keyboard is connected
    window.addEventListener('keydown', (e) => {
      if (window.TVRouter?.currentScreen === 'search') {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          this.appendCharacter(e.key);
        } else if (e.key === 'Backspace' && !window.SpatialNav?.isScreensaverActive) {
          // If not currently navigating backwards out of the view
          if (document.activeElement?.classList.contains('key-btn')) {
            // Let D-pad back handle or type back
          }
        }
      }
    });

    this.renderRecentSearches();
  }

  handleKeyPress(key) {
    switch (key) {
      case 'SPACE':
        this.appendCharacter(' ');
        break;
      case 'BACKSPACE':
        this.deleteCharacter();
        break;
      case 'CLEAR':
        this.clearQuery();
        break;
      case 'SEARCH':
        this.performSearch();
        break;
      default:
        this.appendCharacter(key.toLowerCase());
        break;
    }
  }

  appendCharacter(char) {
    this.currentQuery += char;
    this.updateSearchDisplay();
    this.executeInstantFilter();
  }

  deleteCharacter() {
    this.currentQuery = this.currentQuery.slice(0, -1);
    this.updateSearchDisplay();
    this.executeInstantFilter();
  }

  clearQuery() {
    this.currentQuery = '';
    this.updateSearchDisplay();
    this.executeInstantFilter();
  }

  setQuery(text) {
    this.currentQuery = text || '';
    this.updateSearchDisplay();
    this.executeInstantFilter();
  }

  updateSearchDisplay() {
    const textEl = document.getElementById('search-query-text');
    if (!textEl) return;

    if (this.currentQuery.length === 0) {
      textEl.textContent = 'Type or use D-pad to search apps and media...';
      textEl.classList.add('placeholder');
    } else {
      textEl.textContent = this.currentQuery;
      textEl.classList.remove('placeholder');
    }
  }

  executeInstantFilter() {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer) return;

    const query = this.currentQuery.trim().toLowerCase();
    if (!query) {
      resultsContainer.innerHTML = '';
      this.renderRecentSearches();
      return;
    }

    // Match installed applications
    const matchedApps = (window.TVApps?.apps || []).filter(app => {
      return app.name.toLowerCase().includes(query) || 
             (app.category && app.category.toLowerCase().includes(query));
    });

    // Match media items
    const sampleMedia = [
      { id: 'm1', title: 'Interstellar Odyssey', type: 'Movie', thumb: '/assets/images/card-movie1.svg' },
      { id: 'm2', title: 'Secrets of the Deep', type: 'Documentary', thumb: '/assets/images/card-movie2.svg' },
      { id: 's1', title: 'Neon Horizon Season 2', type: 'TV Show', thumb: '/assets/images/card-show1.svg' },
      { id: 's2', title: "Chef's Journey: Kyoto", type: 'Documentary', thumb: '/assets/images/card-show2.svg' }
    ];
    const matchedMedia = sampleMedia.filter(m => m.title.toLowerCase().includes(query));

    let html = '';

    if (matchedApps.length > 0) {
      html += `
        <div class="tv-row-section">
          <h3 class="tv-row-title" style="margin-bottom: 12px;">Matched Applications</h3>
          <div class="tv-row-scroll-container">
      `;
      matchedApps.forEach(app => {
        html += `
          <div class="app-tile focusable" tabindex="0" onclick="window.TVApps.launchApp(window.TVApps.apps.find(a => a.id === '${app.id}'))">
            <div class="app-tile-icon-wrapper"><img src="${app.icon}"/></div>
            <div class="app-tile-name">${app.name}</div>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    if (matchedMedia.length > 0) {
      html += `
        <div class="tv-row-section">
          <h3 class="tv-row-title" style="margin-bottom: 12px;">Matched Media</h3>
          <div class="tv-row-scroll-container">
      `;
      matchedMedia.forEach(media => {
        html += `
          <div class="media-card focusable" tabindex="0" onclick="window.TVLibrary?.playMediaItem('${media.title}')">
            <img class="media-card-thumb" src="${media.thumb}" alt="${media.title}"/>
            <div class="media-card-overlay">
              <div class="media-card-title">${media.title}</div>
              <div class="media-card-meta">${media.type}</div>
            </div>
          </div>
        `;
      });
      html += `</div></div>`;
    }

    if (matchedApps.length === 0 && matchedMedia.length === 0) {
      html = `<p class="tv-row-subtext" style="text-align: center; margin-top: 24px;">No local applications or media found for "${this.currentQuery}".</p>`;
    }

    resultsContainer.innerHTML = html;
  }

  performSearch() {
    if (this.currentQuery.trim()) {
      if (!this.recentSearches.includes(this.currentQuery.trim())) {
        this.recentSearches.unshift(this.currentQuery.trim());
        if (this.recentSearches.length > 6) this.recentSearches.pop();
      }
      this.executeInstantFilter();
    }
  }

  renderRecentSearches() {
    const resultsContainer = document.getElementById('search-results-container');
    if (!resultsContainer || this.currentQuery.trim()) return;

    let html = `
      <div class="tv-row-section">
        <h4 class="tv-row-title" style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 12px;">Recent Searches</h4>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
    `;

    this.recentSearches.forEach(term => {
      html += `
        <button type="button" class="btn-tv btn-tv-secondary focusable" tabindex="0" onclick="window.TVSearch.setQuery('${term}')">
          ${term}
        </button>
      `;
    });

    html += `</div></div>`;
    resultsContainer.innerHTML = html;
  }
}

window.TVSearch = new TVSearch();
