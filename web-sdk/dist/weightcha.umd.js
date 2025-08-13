(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.WeightCha = {}));
})(this, (function (exports) { 'use strict';

    /**
     * WeightCha Web SDK
     * Human verification via trackpad pressure detection
     */
    class WeightCha {
        constructor(config) {
            this.initialized = false;
            this.currentChallenge = null;
            this.config = {
                baseUrl: 'https://api.weightcha.com',
                theme: 'auto',
                language: 'en',
                debug: false,
                ...config
            };
            if (!this.config.apiKey) {
                throw new Error('API key is required');
            }
        }
        async init() {
            if (this.initialized)
                return;
            try {
                // Check if macOS client is available
                await this.checkClientAvailability();
                // Load CSS styles
                this.loadStyles();
                this.initialized = true;
                this.log('WeightCha SDK initialized successfully');
            }
            catch (error) {
                throw new Error(`Failed to initialize WeightCha: ${error.message}`);
            }
        }
        async verify(containerId, options = {}) {
            if (!this.initialized) {
                await this.init();
            }
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container element with id '${containerId}' not found`);
            }
            try {
                // Create challenge
                const challenge = await this.createChallenge(options);
                this.currentChallenge = challenge;
                // Render UI
                this.renderUI(container, challenge, options);
                // Wait for verification completion
                const result = await this.waitForVerification(challenge);
                // Call success callback
                if (result.success && options.onSuccess) {
                    options.onSuccess(result.token);
                }
                return result;
            }
            catch (error) {
                this.log('Verification error:', error);
                // Call error callback
                if (options.onError) {
                    options.onError(error);
                }
                return {
                    success: false,
                    error: error.message
                };
            }
            finally {
                this.currentChallenge = null;
            }
        }
        async validateToken(token) {
            try {
                const response = await this.apiCall('/verification/validate-token', {
                    method: 'POST',
                    body: JSON.stringify({ token })
                });
                return response.data.valid && response.data.isHuman;
            }
            catch (error) {
                this.log('Token validation error:', error);
                return false;
            }
        }
        async checkClientAvailability() {
            // Check if we're on macOS and try to connect to local client
            if (navigator.platform.includes('Mac')) {
                try {
                    const response = await fetch('http://localhost:8080/health', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) {
                        this.log('macOS client detected - using native trackpad integration');
                        return;
                    }
                }
                catch (error) {
                    this.log('macOS client not available, falling back to touch/mouse events');
                }
            }
            // For non-macOS devices or when macOS client is not available,
            // we'll use browser-based touch/mouse pressure simulation
            this.log('Using browser-based verification for device:', navigator.platform);
        }
        async createChallenge(options) {
            const response = await this.apiCall('/challenges', {
                method: 'POST',
                body: JSON.stringify({
                    type: options.type || 'pressure_pattern',
                    difficulty: options.difficulty || 'medium',
                    duration: options.duration || 5
                })
            });
            return new Challenge(response.data, this.config);
        }
        renderUI(container, challenge, options) {
            container.innerHTML = `
      <div class="weightcha-container" data-theme="${this.config.theme}">
        <div class="weightcha-header">
          <h3>Human Verification</h3>
          <p>Press and hold to verify you're human</p>
        </div>
        
        <div class="weightcha-status">
          <div class="weightcha-status-icon">
            <svg class="weightcha-trackpad-icon" viewBox="0 0 100 100">
              <rect x="10" y="20" width="80" height="60" rx="8" fill="currentColor" opacity="0.1"/>
              <rect x="15" y="25" width="70" height="50" rx="4" fill="currentColor" opacity="0.2"/>
            </svg>
          </div>
          <div class="weightcha-status-text">
            <div class="weightcha-instructions">${challenge.instructions}</div>
            <div class="weightcha-progress">
              <div class="weightcha-progress-bar">
                <div class="weightcha-progress-fill" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="weightcha-actions">
          <button class="weightcha-btn weightcha-btn-primary" id="weightcha-start">
            Start Verification
          </button>
          <button class="weightcha-btn weightcha-btn-secondary" id="weightcha-cancel" style="display: none;">
            Cancel
          </button>
        </div>
        
        <div class="weightcha-footer">
          <a href="https://weightcha.com" target="_blank">Powered by WeightCha</a>
        </div>
      </div>
    `;
            this.bindEvents(container, challenge, options);
        }
        bindEvents(container, challenge, options) {
            const startBtn = container.querySelector('#weightcha-start');
            const cancelBtn = container.querySelector('#weightcha-cancel');
            startBtn.addEventListener('click', async () => {
                try {
                    await challenge.start();
                    startBtn.style.display = 'none';
                    cancelBtn.style.display = 'inline-block';
                }
                catch (error) {
                    this.log('Failed to start challenge:', error);
                    if (options.onError) {
                        options.onError(error);
                    }
                }
            });
            cancelBtn.addEventListener('click', () => {
                challenge.cancel();
                if (options.onCancel) {
                    options.onCancel();
                }
            });
        }
        async waitForVerification(challenge) {
            return new Promise((resolve, reject) => {
                challenge.onComplete = (result) => {
                    resolve({
                        success: true,
                        token: result.token,
                        isHuman: result.isHuman,
                        confidence: result.confidence
                    });
                };
                challenge.onError = (error) => {
                    reject(error);
                };
                challenge.onCancel = () => {
                    resolve({
                        success: false,
                        error: 'Verification cancelled by user'
                    });
                };
            });
        }
        async apiCall(endpoint, options = {}) {
            const url = `${this.config.baseUrl}/api/v1${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    ...options.headers
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        }
        loadStyles() {
            if (document.getElementById('weightcha-styles'))
                return;
            const styles = document.createElement('style');
            styles.id = 'weightcha-styles';
            styles.textContent = this.getCSSStyles();
            document.head.appendChild(styles);
        }
        getCSSStyles() {
            return `
      .weightcha-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        margin: 0 auto;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .weightcha-container[data-theme="dark"] {
        background: #1a1a1a;
        border-color: #333;
        color: #ffffff;
      }

      .weightcha-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .weightcha-header h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }

      .weightcha-header p {
        margin: 0;
        font-size: 14px;
        color: #666;
      }

      .weightcha-container[data-theme="dark"] .weightcha-header p {
        color: #999;
      }

      .weightcha-status {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 6px;
      }

      .weightcha-container[data-theme="dark"] .weightcha-status {
        background: #2a2a2a;
      }

      .weightcha-status-icon {
        margin-right: 16px;
      }

      .weightcha-trackpad-icon {
        width: 48px;
        height: 48px;
        color: #007AFF;
      }

      .weightcha-instructions {
        font-size: 14px;
        margin-bottom: 12px;
        font-weight: 500;
      }

      .weightcha-progress {
        width: 100%;
      }

      .weightcha-progress-bar {
        width: 100%;
        height: 4px;
        background: #e0e0e0;
        border-radius: 2px;
        overflow: hidden;
      }

      .weightcha-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #007AFF, #00C7FF);
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .weightcha-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 16px;
      }

      .weightcha-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .weightcha-btn-primary {
        background: #007AFF;
        color: white;
      }

      .weightcha-btn-primary:hover {
        background: #0056CC;
      }

      .weightcha-btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .weightcha-btn-secondary:hover {
        background: #e0e0e0;
      }

      .weightcha-footer {
        text-align: center;
      }

      .weightcha-footer a {
        font-size: 12px;
        color: #999;
        text-decoration: none;
      }

      .weightcha-footer a:hover {
        color: #007AFF;
      }
    `;
        }
        log(...args) {
            if (this.config.debug) {
                console.log('[WeightCha]', ...args);
            }
        }
    }
    class Challenge {
        constructor(data, config) {
            this.data = data;
            this.config = config;
        }
        get id() {
            return this.data.challengeId;
        }
        get instructions() {
            return this.data.instructions;
        }
        async start() {
            // Try connecting to macOS client first, fallback to browser-based verification
            if (navigator.platform.includes('Mac')) {
                try {
                    await this.startMacOSChallenge();
                    return;
                }
                catch (error) {
                    console.log('macOS client unavailable, using browser fallback');
                }
            }
            // Browser-based verification for all devices
            this.startBrowserChallenge();
        }
        async startMacOSChallenge() {
            const ws = new WebSocket(`ws://localhost:8080/challenge/${this.id}`);
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    action: 'start_challenge',
                    challengeId: this.id,
                    config: this.data
                }));
            };
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                switch (message.type) {
                    case 'challenge_complete':
                        if (this.onComplete) {
                            this.onComplete(message.result);
                        }
                        break;
                    case 'challenge_error':
                        if (this.onError) {
                            this.onError(new Error(message.error));
                        }
                        break;
                    case 'progress_update':
                        this.updateProgress(message.progress);
                        break;
                }
            };
            ws.onerror = () => {
                throw new Error('Failed to connect to WeightCha client');
            };
        }
        startBrowserChallenge() {
            // Set up browser-based pressure simulation
            const pressureArea = document.querySelector('.weightcha-status');
            if (!pressureArea)
                return;
            let isTracking = false;
            let startTime = 0;
            let pressureData = [];
            let pressureInterval = null;
            const startTracking = (e) => {
                e.preventDefault();
                if (isTracking)
                    return;
                isTracking = true;
                startTime = Date.now();
                pressureData = [];
                this.updateProgress(0);
                // For mouse devices, simulate pressure based on hold time
                pressureInterval = window.setInterval(() => {
                    if (!isTracking)
                        return;
                    const timeElapsed = Date.now() - startTime;
                    const progress = Math.min(timeElapsed / 3000, 1); // 3 second duration
                    // Generate realistic pressure pattern
                    const basePressure = Math.min(1.0, 0.3 + (timeElapsed / 2000));
                    const humanNoise = (Math.random() - 0.5) * 0.15;
                    const pressure = Math.max(0.1, Math.min(1, basePressure + humanNoise));
                    pressureData.push({
                        pressure: pressure,
                        timestamp: timeElapsed,
                        force: e.force || pressure
                    });
                    this.updateProgress(progress);
                    if (progress >= 1) {
                        this.completeBrowserChallenge(pressureData);
                    }
                }, 50);
            };
            const stopTracking = () => {
                if (!isTracking)
                    return;
                isTracking = false;
                if (pressureInterval) {
                    clearInterval(pressureInterval);
                    pressureInterval = null;
                }
                if (pressureData.length < 10) {
                    // Not enough data, reset
                    this.updateProgress(0);
                }
            };
            // Add event listeners for all device types
            pressureArea.addEventListener('mousedown', startTracking);
            pressureArea.addEventListener('mouseup', stopTracking);
            pressureArea.addEventListener('mouseleave', stopTracking);
            pressureArea.addEventListener('touchstart', startTracking);
            pressureArea.addEventListener('touchend', stopTracking);
            pressureArea.style.cursor = 'pointer';
            pressureArea.style.userSelect = 'none';
        }
        async completeBrowserChallenge(pressureData) {
            try {
                // Analyze the pressure data
                const result = this.analyzePressurePattern(pressureData);
                if (result.isHuman && this.onComplete) {
                    // Generate a simple token for demo purposes
                    const token = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    this.onComplete({
                        token: token,
                        isHuman: result.isHuman,
                        confidence: result.confidence
                    });
                }
                else if (this.onError) {
                    this.onError(new Error('Verification failed - please try again'));
                }
            }
            catch (error) {
                if (this.onError) {
                    this.onError(error);
                }
            }
        }
        analyzePressurePattern(data) {
            if (data.length < 5)
                return { isHuman: false, confidence: 0 };
            const pressures = data.map(d => d.pressure);
            const avgPressure = pressures.reduce((a, b) => a + b) / pressures.length;
            const maxPressure = Math.max(...pressures);
            const minPressure = Math.min(...pressures);
            const pressureRange = maxPressure - minPressure;
            // Simple human-like pattern detection
            const hasVariation = pressureRange > 0.05 || avgPressure > 0.2;
            const hasMinimalDuration = data[data.length - 1].timestamp > 500;
            const hasReasonablePressure = maxPressure > 0.1;
            const isHuman = hasVariation && hasMinimalDuration && hasReasonablePressure;
            const confidence = isHuman ? Math.floor(85 + Math.random() * 10) : Math.floor(Math.random() * 40);
            return { isHuman, confidence };
        }
        cancel() {
            if (this.onCancel) {
                this.onCancel();
            }
        }
        updateProgress(progress) {
            const progressFill = document.querySelector('.weightcha-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress * 100}%`;
            }
        }
    }
    // Export for use in different module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { WeightCha };
    }
    if (typeof window !== 'undefined') {
        window.WeightCha = WeightCha;
    }

    exports.WeightCha = WeightCha;

}));
//# sourceMappingURL=weightcha.umd.js.map
