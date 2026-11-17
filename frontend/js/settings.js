/**
 * Settings & System Diagnostics Module
 * Displays real-time Raspberry Pi hardware metrics and manages TV preferences.
 */

class TVSettings {
  constructor() {
    this.activeTab = 'display';
    this.metricsTimer = null;
    this.settings = {};
  }

  async init() {
    await this.fetchSettings();
    this.setupTabListeners();
    this.applySettingsToDOM();
  }

  async fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        this.settings = await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch /api/settings', err);
    }
  }

  setupTabListeners() {
    document.querySelectorAll('.settings-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Display scale buttons
    document.getElementById('scale-down-btn')?.addEventListener('click', () => this.adjustScale(-0.1));
    document.getElementById('scale-up-btn')?.addEventListener('click', () => this.adjustScale(0.1));

    // Screensaver timeout
    document.getElementById('screensaver-select')?.addEventListener('change', (e) => {
      this.updateSetting('screensaver_timeout_minutes', parseInt(e.target.value, 10));
    });

    // Reduced motion toggle
    document.getElementById('reduced-motion-toggle')?.addEventListener('click', () => {
      const current = this.settings.animations_reduced || false;
      this.updateSetting('animations_reduced', !current);
    });

    // System reboot & shutdown actions
    document.getElementById('btn-system-reboot')?.addEventListener('click', () => this.rebootSystem());
    document.getElementById('btn-system-shutdown')?.addEventListener('click', () => this.shutdownSystem());
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    document.querySelectorAll('.settings-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.settings-tab-panel').forEach(panel => {
      panel.style.display = panel.id === `tab-panel-${tabId}` ? 'block' : 'none';
    });

    if (tabId === 'system') {
      this.refreshMetrics();
      this.startMetricsPolling();
    } else {
      this.stopMetricsPolling();
    }
  }

  startMetricsPolling() {
    this.stopMetricsPolling();
    this.metricsTimer = setInterval(() => this.refreshMetrics(), 3000);
  }

  stopMetricsPolling() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  async refreshMetrics() {
    try {
      const res = await fetch('/api/system/info');
      if (!res.ok) return;

      const data = await res.json();

      // Update Live UI Metrics
      const cpuVal = document.getElementById('metric-cpu-val');
      const ramVal = document.getElementById('metric-ram-val');
      const tempVal = document.getElementById('metric-temp-val');
      const storageVal = document.getElementById('metric-storage-val');

      if (cpuVal) cpuVal.textContent = `${data.cpu.usage_percent}%`;
      if (ramVal) ramVal.textContent = `${data.memory.used_mb} / ${data.memory.total_mb} MB`;
      if (tempVal) {
        tempVal.textContent = `${data.hardware.temperature_c}°C`;
        tempVal.style.color = data.hardware.temperature_c > 75 ? 'var(--accent-danger)' : 'var(--accent-blue)';
      }
      if (storageVal) storageVal.textContent = `${data.storage.free_gb} GB Free`;

      // Update System & Network labels
      const ipEl = document.getElementById('setting-net-ip');
      const modelEl = document.getElementById('setting-sys-model');
      const uptimeEl = document.getElementById('setting-sys-uptime');
      const kernelEl = document.getElementById('setting-sys-kernel');

      if (ipEl) ipEl.textContent = data.network.ip_address || '127.0.0.1';
      if (modelEl) modelEl.textContent = data.hardware.model || 'Raspberry Pi 3 Model B+';
      if (uptimeEl) uptimeEl.textContent = data.system.uptime_formatted || 'N/A';
      if (kernelEl) kernelEl.textContent = `${data.system.os_name} (${data.system.architecture})`;

      // Status Bar updates
      const topClock = document.getElementById('top-bar-clock');
      if (topClock) {
        const d = new Date();
        topClock.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      const topWifi = document.getElementById('top-bar-wifi');
      if (topWifi) {
        topWifi.classList.toggle('online', data.network.is_online);
      }
    } catch (err) {
      console.warn('Failed to refresh system metrics', err);
    }
  }

  adjustScale(delta) {
    let currentScale = parseFloat(this.settings.display_scale || 1.0);
    currentScale = Math.round((currentScale + delta) * 10) / 10;
    if (currentScale < 0.7) currentScale = 0.7;
    if (currentScale > 1.4) currentScale = 1.4;

    this.updateSetting('display_scale', currentScale);
  }

  applySettingsToDOM() {
    if (this.settings.display_scale) {
      document.documentElement.style.setProperty('--ui-scale', this.settings.display_scale);
      const valEl = document.getElementById('display-scale-val');
      if (valEl) valEl.textContent = `${Math.round(this.settings.display_scale * 100)}%`;
    }

    if (this.settings.animations_reduced) {
      document.body.classList.add('reduced-motion');
      const togEl = document.getElementById('reduced-motion-status');
      if (togEl) togEl.textContent = 'Enabled (Optimized for Pi 3B+)';
    } else {
      document.body.classList.remove('reduced-motion');
      const togEl = document.getElementById('reduced-motion-status');
      if (togEl) togEl.textContent = 'Disabled (Full Animations)';
    }

    if (this.settings.screensaver_timeout_minutes) {
      const select = document.getElementById('screensaver-select');
      if (select) select.value = this.settings.screensaver_timeout_minutes;
      if (window.SpatialNav) {
        window.SpatialNav.screensaverTimeoutMs = this.settings.screensaver_timeout_minutes * 60 * 1000;
        window.SpatialNav.resetScreensaverTimer();
      }
    }
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    this.applySettingsToDOM();

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings)
      });
      window.TVApp?.showToast('Settings updated');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }

  async rebootSystem() {
    if (confirm('Reboot the Raspberry Pi television system now?')) {
      window.TVApp?.showToast('System rebooting...');
      try {
        await fetch('/api/system/reboot', { method: 'POST' });
      } catch (err) {}
    }
  }

  async shutdownSystem() {
    if (confirm('Power off the Raspberry Pi television system now?')) {
      window.TVApp?.showToast('System shutting down...');
      try {
        await fetch('/api/system/shutdown', { method: 'POST' });
      } catch (err) {}
    }
  }
}

window.TVSettings = new TVSettings();
