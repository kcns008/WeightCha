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
        // Check if we're on macOS
        if (!navigator.platform.includes('Mac')) {
            throw new Error('WeightCha requires macOS with Force Touch trackpad');
        }
        // Try to connect to local WeightCha client
        try {
            const response = await fetch('http://localhost:8080/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error('WeightCha client not responding');
            }
        }
        catch (error) {
            throw new Error('WeightCha client not installed or not running. Please install the WeightCha macOS app.');
        }
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
          <p>Please use your MacBook trackpad to verify you're human</p>
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
        // Connect to local WeightCha client
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
            if (this.onError) {
                this.onError(new Error('Failed to connect to WeightCha client'));
            }
        };
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

export { WeightCha };
//# sourceMappingURL=weightcha.esm.js.map
