/**
 * Google TV Spatial Navigation Engine
 * High-performance 2D directional D-pad navigation for 10-foot television experience.
 */

class SpatialNavigation {
  constructor() {
    this.currentFocused = null;
    this.historyStack = [];
    this.screensaverTimer = null;
    this.screensaverTimeoutMs = 5 * 60 * 1000; // 5 minutes default
    this.isScreensaverActive = false;
    this.modalActive = null;
    
    this.initListeners();
    this.resetScreensaverTimer();
  }

  initListeners() {
    // Keyboard / CEC D-pad events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Mouse focus support (if air mouse or pointer is used)
    document.addEventListener('mouseover', (e) => {
      const focusable = e.target.closest('.focusable');
      if (focusable && focusable !== this.currentFocused && !this.isScreensaverActive) {
        this.setFocus(focusable, false);
      }
    });
  }

  handleKeyDown(e) {
    this.resetScreensaverTimer();

    if (this.isScreensaverActive) {
      this.dismissScreensaver();
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.navigateDirection('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.navigateDirection('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.navigateDirection('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.navigateDirection('right');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateCurrent();
        break;
      case 'Escape':
      case 'Backspace':
      case 'GoBack':
        e.preventDefault();
        this.navigateBack();
        break;
      case 'Home':
        e.preventDefault();
        window.TVRouter?.navigate('home');
        break;
    }
  }

  /**
   * Set focus to a specific DOM element
   */
  setFocus(element, autoScroll = true) {
    if (!element || !element.classList.contains('focusable')) return;

    if (this.currentFocused && this.currentFocused !== element) {
      this.currentFocused.classList.remove('focused');
      this.currentFocused.blur();
    }

    this.currentFocused = element;
    element.classList.add('focused');
    element.focus({ preventScroll: true });

    if (autoScroll) {
      this.scrollElementIntoView(element);
    }
  }

  scrollElementIntoView(element) {
    // Horizontal row scrolling
    const row = element.closest('.tv-row-scroll-container');
    if (row) {
      const rowRect = row.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();
      
      const scrollOffset = (elRect.left + elRect.width / 2) - (rowRect.left + rowRect.width / 2);
      row.scrollBy({ left: scrollOffset, behavior: 'smooth' });
    }

    // Vertical main screen scrolling
    const screen = element.closest('.screen-view');
    if (screen) {
      const screenRect = screen.getBoundingClientRect();
      const elRect = element.getBoundingClientRect();

      if (elRect.top < screenRect.top + 100 || elRect.bottom > screenRect.bottom - 100) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  activateCurrent() {
    if (this.currentFocused) {
      this.currentFocused.click();
    }
  }

  navigateBack() {
    if (this.modalActive) {
      this.closeModal();
      return;
    }

    if (window.TVRouter) {
      window.TVRouter.back();
    }
  }

  /**
   * 2D Directional calculation using Euclidean vector geometry and projection
   */
  navigateDirection(direction) {
    if (!this.currentFocused) {
      this.focusInitialElement();
      return;
    }

    // If modal is active, restrict focus candidates to modal children
    const rootScope = this.modalActive || document.querySelector('.screen-view.active') || document;
    
    // Check if current focused is in top-nav
    const isCurrentInNav = this.currentFocused.closest('#top-nav-bar') !== null;
    
    // Special fast-path for horizontal content rows
    const currentRow = this.currentFocused.closest('.tv-row-scroll-container');
    if (currentRow && (direction === 'left' || direction === 'right')) {
      const siblings = Array.from(currentRow.querySelectorAll('.focusable'));
      const currentIndex = siblings.indexOf(this.currentFocused);
      if (currentIndex !== -1) {
        if (direction === 'left' && currentIndex > 0) {
          this.setFocus(siblings[currentIndex - 1]);
          return;
        } else if (direction === 'right' && currentIndex < siblings.length - 1) {
          this.setFocus(siblings[currentIndex + 1]);
          return;
        }
      }
    }

    // Special handling for Nav Bar up/down
    if (isCurrentInNav) {
      if (direction === 'down') {
        const activeScreen = document.querySelector('.screen-view.active');
        if (activeScreen) {
          const firstInScreen = activeScreen.querySelector('.focusable');
          if (firstInScreen) {
            this.setFocus(firstInScreen);
            return;
          }
        }
      } else if (direction === 'left' || direction === 'right') {
        const navItems = Array.from(document.querySelectorAll('#top-nav-bar .focusable'));
        const navIdx = navItems.indexOf(this.currentFocused);
        if (direction === 'left' && navIdx > 0) {
          this.setFocus(navItems[navIdx - 1]);
          return;
        } else if (direction === 'right' && navIdx < navItems.length - 1) {
          this.setFocus(navItems[navIdx + 1]);
          return;
        }
      }
      return;
    }

    // If moving UP from the highest element in the screen view, jump to top-nav
    if (direction === 'up' && !this.modalActive) {
      const currentRect = this.currentFocused.getBoundingClientRect();
      if (currentRect.top <= 160) {
        const activeNavTab = document.querySelector('#top-nav-bar .nav-item.active') || 
                             document.querySelector('#top-nav-bar .focusable');
        if (activeNavTab) {
          this.setFocus(activeNavTab);
          return;
        }
      }
    }

    // General 2D Spatial Search
    const candidates = Array.from(rootScope.querySelectorAll('.focusable')).filter(el => {
      if (el === this.currentFocused || el.disabled || el.offsetParent === null) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (candidates.length === 0) return;

    const currentRect = this.currentFocused.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let isAligned = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'up':
          if (dy < -8) {
            isAligned = true;
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
          }
          break;
        case 'down':
          if (dy > 8) {
            isAligned = true;
            primaryDist = Math.abs(dy);
            secondaryDist = Math.abs(dx);
          }
          break;
        case 'left':
          if (dx < -8) {
            isAligned = true;
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
          }
          break;
        case 'right':
          if (dx > 8) {
            isAligned = true;
            primaryDist = Math.abs(dx);
            secondaryDist = Math.abs(dy);
          }
          break;
      }

      if (isAligned) {
        // Weight secondary distance higher to favor elements on the same axis
        const score = primaryDist + (secondaryDist * 2.2);
        if (score < minDistance) {
          minDistance = score;
          bestCandidate = candidate;
        }
      }
    }

    if (bestCandidate) {
      this.setFocus(bestCandidate);
    }
  }

  focusInitialElement() {
    const activeScreen = document.querySelector('.screen-view.active');
    let target = null;

    if (this.modalActive) {
      target = this.modalActive.querySelector('.focusable');
    } else if (activeScreen) {
      target = activeScreen.querySelector('.focusable');
    }

    if (!target) {
      target = document.querySelector('#top-nav-bar .nav-item.active') || 
               document.querySelector('.focusable');
    }

    if (target) {
      this.setFocus(target);
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    this.modalActive = modal;
    modal.classList.add('open');

    const firstInput = modal.querySelector('.form-input, .focusable');
    if (firstInput) {
      this.setFocus(firstInput);
    }
  }

  closeModal() {
    if (!this.modalActive) return;

    this.modalActive.classList.remove('open');
    this.modalActive = null;
    this.focusInitialElement();
  }

  resetScreensaverTimer() {
    clearTimeout(this.screensaverTimer);
    if (this.screensaverTimeoutMs > 0) {
      this.screensaverTimer = setTimeout(() => {
        this.triggerScreensaver();
      }, this.screensaverTimeoutMs);
    }
  }

  triggerScreensaver() {
    const screensaver = document.getElementById('tv-screensaver');
    if (screensaver) {
      this.isScreensaverActive = true;
      screensaver.classList.add('active');
      this.updateScreensaverClock();
      this.clockInterval = setInterval(() => this.updateScreensaverClock(), 1000);
    }
  }

  dismissScreensaver() {
    const screensaver = document.getElementById('tv-screensaver');
    if (screensaver) {
      this.isScreensaverActive = false;
      screensaver.classList.remove('active');
      clearInterval(this.clockInterval);
      this.focusInitialElement();
    }
  }

  updateScreensaverClock() {
    const now = new Date();
    const clockEl = document.querySelector('.screensaver-clock');
    const dateEl = document.querySelector('.screensaver-date');

    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    }
  }
}

window.SpatialNav = new SpatialNavigation();
