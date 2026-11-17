/**
 * Google TV Screen Router
 * Manages view transitions, navigation history, and focus restoration across TV screens.
 */

class TVRouter {
  constructor() {
    this.currentScreen = 'home';
    this.historyStack = ['home'];
    this.focusMemory = new Map();

    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  init() {
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigate(hash, false);
  }

  navigate(screenId, pushToHistory = true) {
    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (!targetScreen) {
      console.warn(`Screen with ID 'screen-${screenId}' not found.`);
      return;
    }

    // Save previous screen's focus element
    if (window.SpatialNav && window.SpatialNav.currentFocused) {
      this.focusMemory.set(this.currentScreen, window.SpatialNav.currentFocused);
    }

    // Hide all screens
    document.querySelectorAll('.screen-view').forEach(screen => {
      screen.classList.remove('active');
    });

    // Update Top Navigation Bar Tabs
    document.querySelectorAll('#top-nav-bar .nav-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.screen === screenId);
    });

    // Show target screen
    targetScreen.classList.add('active');
    targetScreen.scrollTop = 0;

    const previousScreen = this.currentScreen;
    this.currentScreen = screenId;

    if (pushToHistory && (this.historyStack.length === 0 || this.historyStack[this.historyStack.length - 1] !== screenId)) {
      this.historyStack.push(screenId);
    }

    // Restore focus
    setTimeout(() => {
      const savedFocus = this.focusMemory.get(screenId);
      if (savedFocus && document.body.contains(savedFocus) && savedFocus.offsetParent !== null) {
        window.SpatialNav.setFocus(savedFocus);
      } else {
        const firstFocusable = targetScreen.querySelector('.focusable');
        if (firstFocusable) {
          window.SpatialNav.setFocus(firstFocusable);
        } else {
          window.SpatialNav.focusInitialElement();
        }
      }
    }, 50);

    // Trigger screen-specific refresh hooks
    if (screenId === 'settings' && window.TVSettings) {
      window.TVSettings.refreshMetrics();
    } else if (screenId === 'apps' && window.TVApps) {
      window.TVApps.renderAppsGrid();
    } else if (screenId === 'library' && window.TVLibrary) {
      window.TVLibrary.refreshMedia();
    }
  }

  back() {
    if (this.historyStack.length > 1) {
      this.historyStack.pop(); // Remove current
      const prev = this.historyStack[this.historyStack.length - 1];
      this.navigate(prev, false);
    } else if (this.currentScreen !== 'home') {
      this.navigate('home', false);
    }
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (hash !== this.currentScreen) {
      this.navigate(hash, true);
    }
  }
}

window.TVRouter = new TVRouter();
