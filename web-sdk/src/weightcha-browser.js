/**
 * WeightCha Browser-Only SDK
 * Production-ready implementation for website integration
 */

class WeightCha {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.options = {
      apiUrl: options.apiUrl || 'https://api.weightcha.com/v1',
      timeout: options.timeout || 10000,
      fallback: options.fallback || 'recaptcha',
      fallbackKey: options.fallbackKey || null,
      autoFallback: options.autoFallback !== false,
      theme: options.theme || 'light',
      debug: options.debug || false,
      ...options
    };
    
    this.pressureData = [];
    this.motionData = [];
    this.isRecording = false;
    this.currentStep = 0;
    this.challengeId = null;
    this.detectionMethod = 'unknown';
    this.deviceInfo = {};
    this.capabilities = {};
    this.container = null;
    this.callbacks = {};
    
    this.log('WeightCha SDK initialized');
  }

  /**
   * Render WeightCha widget in specified container
   */
  async render(selector, callbacks = {}) {
    this.callbacks = {
      callback: callbacks.callback || function() {},
      'expired-callback': callbacks['expired-callback'] || function() {},
      'error-callback': callbacks['error-callback'] || function() {}
    };

    this.container = typeof selector === 'string' 
      ? document.querySelector(selector)
      : selector;

    if (!this.container) {
      throw new Error('WeightCha container not found');
    }

    await this.init();
    this.renderWidget();
  }

  /**
   * Initialize capabilities detection and device info
   */
  async init() {
    try {
      await this.detectCapabilities();
      await this.collectDeviceInfo();
      await this.createChallenge();
      this.log('Initialization complete', { method: this.detectionMethod, device: this.deviceInfo.trackpadType });
    } catch (error) {
      this.log('Initialization failed', error);
      if (this.options.autoFallback) {
        this.showFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Detect browser capabilities for pressure detection
   */
  async detectCapabilities() {
    this.capabilities = {
      webHID: 'hid' in navigator,
      forceTouch: 'webkitForce' in document.createElement('div'),
      pointerEvents: 'PointerEvent' in window && 'pressure' in PointerEvent.prototype,
      motionSensors: 'DeviceMotionEvent' in window,
      touchForce: 'ontouchforcechange' in document
    };

    // Determine best detection method
    if (this.capabilities.webHID && this.isChromium()) {
      this.detectionMethod = 'webHID';
    } else if (this.capabilities.forceTouch && this.isSafari()) {
      this.detectionMethod = 'forceTouch';
    } else if (this.capabilities.pointerEvents) {
      this.detectionMethod = 'pointerEvents';
    } else if (this.capabilities.motionSensors) {
      this.detectionMethod = 'motionSensors';
    } else {
      this.detectionMethod = 'touchEvents'; // Basic fallback
    }

    this.log('Capabilities detected', this.capabilities);
    return this.capabilities;
  }

  /**
   * Collect device information for calibration
   */
  async collectDeviceInfo() {
    this.deviceInfo = {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio
      },
      trackpadType: this.detectTrackpadType(),
      browserSupport: Object.keys(this.capabilities).filter(cap => this.capabilities[cap]),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };

    return this.deviceInfo;
  }

  /**
   * Create challenge on backend
   */
  async createChallenge() {
    try {
      const response = await fetch(`${this.options.apiUrl}/challenges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'pressure_pattern',
          difficulty: 'normal',
          duration: 10000 // 10 seconds
        })
      });

      if (!response.ok) {
        throw new Error(`Challenge creation failed: ${response.status}`);
      }

      const result = await response.json();
      this.challengeId = result.data.challengeId;
      this.log('Challenge created', this.challengeId);
      
      return result.data;
    } catch (error) {
      this.log('Challenge creation failed', error);
      throw error;
    }
  }

  /**
   * Render the WeightCha widget
   */
  renderWidget() {
    const theme = this.options.theme === 'dark' ? 'weightcha-dark' : 'weightcha-light';
    
    this.container.innerHTML = `
      <div class="weightcha-widget ${theme}">
        <div class="weightcha-header">
          <h3>🤚 WeightCha Human Verification</h3>
          <p>Place finger on trackpad and apply gentle pressure</p>
        </div>
        
        <div class="weightcha-pressure-zone" id="weightcha-pressure-zone">
          <div class="weightcha-pressure-circle" id="weightcha-pressure-circle">
            <div class="weightcha-pressure-fill" id="weightcha-pressure-fill"></div>
            <div class="weightcha-pressure-indicator" id="weightcha-pressure-indicator">0g</div>
          </div>
          <div class="weightcha-pressure-value" id="weightcha-pressure-value">Ready for verification</div>
        </div>
        
        <div class="weightcha-progress">
          <div class="weightcha-progress-bar">
            <div id="weightcha-progress-fill" class="weightcha-progress-fill"></div>
          </div>
        </div>
        
        <div class="weightcha-instructions">
          <div class="weightcha-step active" data-step="0">Place finger on trackpad</div>
          <div class="weightcha-step" data-step="1">Apply gentle pressure (50-100g)</div>
          <div class="weightcha-step" data-step="2">Hold for 2 seconds</div>
          <div class="weightcha-step" data-step="3">Release slowly</div>
        </div>
        
        <div id="weightcha-status" class="weightcha-status">
          Ready to verify... ${this.detectionMethod === 'unknown' ? 'Limited support detected.' : ''}
        </div>
        
        <div class="weightcha-device-info">
          <small>Method: ${this.detectionMethod} | Device: ${this.deviceInfo.trackpadType}</small>
        </div>
      </div>
    `;

    this.addStyles();
    this.setupEventListeners();
  }

  /**
   * Add CSS styles
   */
  addStyles() {
    if (document.getElementById('weightcha-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'weightcha-styles';
    styles.textContent = `
      .weightcha-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        max-width: 350px;
        margin: 0 auto;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.1);
      }

      .weightcha-dark {
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        border-color: #38bdf8;
        color: white;
      }

      .weightcha-header h3 {
        margin: 0 0 5px 0;
        color: #0c4a6e;
        font-size: 1.1rem;
      }

      .weightcha-dark .weightcha-header h3 {
        color: #38bdf8;
      }

      .weightcha-header p {
        margin: 0 0 15px 0;
        color: #075985;
        font-size: 0.85rem;
      }

      .weightcha-dark .weightcha-header p {
        color: #94a3b8;
      }

      .weightcha-pressure-zone {
        background: white;
        border: 2px solid #0ea5e9;
        border-radius: 8px;
        padding: 20px;
        margin: 15px 0;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 120px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .weightcha-dark .weightcha-pressure-zone {
        background: #475569;
        border-color: #38bdf8;
      }

      .weightcha-pressure-zone:hover {
        border-color: #0284c7;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
      }

      .weightcha-pressure-zone.active {
        border-color: #059669;
        background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      }

      .weightcha-dark .weightcha-pressure-zone.active {
        background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      }

      .weightcha-pressure-circle {
        width: 60px;
        height: 60px;
        border: 3px solid #0ea5e9;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        transition: all 0.1s ease;
        margin-bottom: 10px;
      }

      .weightcha-pressure-circle.active {
        border-color: #059669;
        transform: scale(1.1);
      }

      .weightcha-pressure-fill {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(0deg, #0ea5e9, #38bdf8);
        transition: height 0.1s ease;
        border-radius: 0 0 50px 50px;
        height: 0%;
      }

      .weightcha-pressure-indicator {
        font-size: 12px;
        font-weight: 600;
        color: #0c4a6e;
        z-index: 1;
      }

      .weightcha-dark .weightcha-pressure-indicator {
        color: white;
      }

      .weightcha-pressure-value {
        font-size: 12px;
        color: #075985;
        margin-top: 5px;
      }

      .weightcha-dark .weightcha-pressure-value {
        color: #94a3b8;
      }

      .weightcha-progress {
        margin: 15px 0;
      }

      .weightcha-progress-bar {
        height: 6px;
        background: #e0f2fe;
        border-radius: 3px;
        overflow: hidden;
      }

      .weightcha-dark .weightcha-progress-bar {
        background: #334155;
      }

      .weightcha-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #0ea5e9, #059669);
        width: 0%;
        transition: width 0.2s ease;
      }

      .weightcha-instructions {
        margin: 15px 0;
      }

      .weightcha-step {
        padding: 4px 0;
        opacity: 0.5;
        transition: opacity 0.2s;
        font-size: 12px;
        color: #075985;
      }

      .weightcha-dark .weightcha-step {
        color: #94a3b8;
      }

      .weightcha-step.active {
        opacity: 1;
        font-weight: 600;
        color: #0c4a6e;
      }

      .weightcha-dark .weightcha-step.active {
        color: #38bdf8;
      }

      .weightcha-status {
        font-size: 12px;
        color: #075985;
        margin: 10px 0;
        padding: 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.5);
      }

      .weightcha-dark .weightcha-status {
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.1);
      }

      .weightcha-status.success {
        color: #065f46;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid #10b981;
      }

      .weightcha-status.error {
        color: #7f1d1d;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
      }

      .weightcha-device-info {
        margin-top: 10px;
        font-size: 10px;
        color: #64748b;
        opacity: 0.7;
      }

      .weightcha-dark .weightcha-device-info {
        color: #94a3b8;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Setup event listeners based on detection method
   */
  setupEventListeners() {
    const pressureZone = document.getElementById('weightcha-pressure-zone');

    switch (this.detectionMethod) {
      case 'webHID':
        this.setupWebHID(pressureZone);
        break;
      case 'forceTouch':
        this.setupForceTouch(pressureZone);
        break;
      case 'pointerEvents':
        this.setupPointerEvents(pressureZone);
        break;
      case 'motionSensors':
        this.setupMotionSensors();
        this.setupBasicEvents(pressureZone);
        break;
      default:
        this.setupBasicEvents(pressureZone);
    }
  }

  setupPointerEvents(element) {
    element.addEventListener('pointerdown', (e) => {
      this.startRecording();
      this.recordPressure(e.pressure || 0.5, e.timeStamp);
    });

    element.addEventListener('pointermove', (e) => {
      if (this.isRecording && e.pressure > 0) {
        this.recordPressure(e.pressure, e.timeStamp);
      }
    });

    element.addEventListener('pointerup', (e) => {
      this.recordPressure(0, e.timeStamp);
      this.stopRecording();
    });
  }

  setupForceTouch(element) {
    element.addEventListener('webkitmouseforcewillbegin', () => {
      this.startRecording();
    });

    element.addEventListener('webkitmouseforcechanged', (e) => {
      if (this.isRecording) {
        const normalizedPressure = e.webkitForce / 3.0;
        this.recordPressure(normalizedPressure, e.timeStamp);
      }
    });

    element.addEventListener('mouseup', () => {
      this.stopRecording();
    });
  }

  async setupWebHID(element) {
    element.addEventListener('click', async () => {
      try {
        if (!navigator.hid) {
          throw new Error('WebHID not supported');
        }

        const devices = await navigator.hid.requestDevice({
          filters: [{ vendorId: 0x05ac }] // Apple vendor ID
        });

        if (devices.length > 0) {
          const device = devices[0];
          await device.open();
          
          device.addEventListener('inputreport', (event) => {
            this.processHIDData(event.data);
          });

          this.updateStatus('WebHID device connected! Apply pressure now.');
        }
      } catch (error) {
        this.log('WebHID failed, falling back', error);
        this.setupPointerEvents(element);
      }
    });

    // Fallback to pointer events
    this.setupPointerEvents(element);
  }

  setupMotionSensors() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.startMotionDetection();
        }
      }).catch(() => {
        this.log('Motion permission denied');
      });
    } else if ('DeviceMotionEvent' in window) {
      this.startMotionDetection();
    }
  }

  startMotionDetection() {
    window.addEventListener('devicemotion', (event) => {
      if (this.isRecording && event.acceleration) {
        this.recordMotion(event.acceleration, event.rotationRate, event.timeStamp);
      }
    });
  }

  setupBasicEvents(element) {
    let isPressed = false;

    const start = (e) => {
      isPressed = true;
      this.startRecording();
      this.recordPressure(0.5, e.timeStamp || Date.now());
    };

    const end = (e) => {
      if (isPressed) {
        isPressed = false;
        this.recordPressure(0, e.timeStamp || Date.now());
        this.stopRecording();
      }
    };

    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', end);
    element.addEventListener('touchstart', start);
    element.addEventListener('touchend', end);
  }

  startRecording() {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.startTime = Date.now();
    this.pressureData = [];
    this.motionData = [];
    this.currentStep = 1;
    
    this.updateStep();
    this.updateStatus('Recording pressure pattern...');
    
    const pressureZone = document.getElementById('weightcha-pressure-zone');
    pressureZone?.classList.add('active');

    this.log('Recording started');
  }

  stopRecording() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.currentStep = 3;
    this.updateStep();
    
    const pressureZone = document.getElementById('weightcha-pressure-zone');
    pressureZone?.classList.remove('active');
    
    this.log('Recording stopped', { dataPoints: this.pressureData.length });
    
    setTimeout(() => {
      this.processVerification();
    }, 500);
  }

  recordPressure(pressure, timestamp) {
    if (!this.isRecording) return;
    
    const weight = this.convertPressureToWeight(pressure);
    
    this.pressureData.push({
      pressure: pressure,
      weight: weight,
      timestamp: timestamp,
      deltaTime: timestamp - (this.startTime || timestamp)
    });

    this.updateVisualFeedback(pressure, weight);
    
    if (pressure > 0.3 && this.currentStep === 1) {
      this.currentStep = 2;
      this.updateStep();
    }
  }

  recordMotion(acceleration, rotation, timestamp) {
    if (!acceleration || !this.isRecording) return;
    
    this.motionData.push({
      acceleration: {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0
      },
      rotation: {
        alpha: rotation?.alpha || 0,
        beta: rotation?.beta || 0,
        gamma: rotation?.gamma || 0
      },
      timestamp: timestamp
    });
  }

  convertPressureToWeight(pressure) {
    const multipliers = {
      'MacBook Pro 16" 2021': 150,
      'MacBook Pro 14" 2021': 140,
      'MacBook Air M1': 120,
      'MacBook Air M2': 125,
      'Windows Precision Trackpad': 100,
      'iPad Pro (pressure-sensitive)': 80,
      'generic': 100
    };
    
    const multiplier = multipliers[this.deviceInfo.trackpadType] || 100;
    return pressure * multiplier;
  }

  updateVisualFeedback(pressure, weight) {
    const circle = document.getElementById('weightcha-pressure-circle');
    const fill = document.getElementById('weightcha-pressure-fill');
    const indicator = document.getElementById('weightcha-pressure-indicator');
    const progressFill = document.getElementById('weightcha-progress-fill');
    
    if (circle && pressure > 0.1) {
      circle.classList.add('active');
    } else if (circle) {
      circle.classList.remove('active');
    }
    
    if (fill) {
      const fillHeight = Math.min(pressure * 100, 100);
      fill.style.height = `${fillHeight}%`;
    }
    
    if (indicator) {
      indicator.textContent = `${Math.round(weight)}g`;
    }
    
    if (progressFill) {
      const progress = Math.min(pressure * 100, 100);
      progressFill.style.width = `${progress}%`;
    }
  }

  updateStep() {
    const steps = document.querySelectorAll('.weightcha-step');
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
    });
  }

  updateStatus(message, type = '') {
    const statusElement = document.getElementById('weightcha-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `weightcha-status ${type}`;
    }
  }

  async processVerification() {
    this.updateStatus('Analyzing pressure pattern...');
    
    try {
      const response = await fetch(`${this.options.apiUrl}/verification/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          challengeId: this.challengeId,
          pressureData: this.pressureData,
          motionData: this.motionData,
          deviceInfo: this.deviceInfo,
          detectionMethod: this.detectionMethod,
          clientInfo: {
            version: '1.0.0',
            platform: 'web'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result = await response.json();
      const verification = result.data;
      
      if (verification.isHuman) {
        this.updateStatus(
          `✅ Human verified! Confidence: ${(verification.confidence * 100).toFixed(1)}%`,
          'success'
        );
        
        this.log('Verification successful', verification);
        this.callbacks.callback(verification.token);
      } else {
        this.updateStatus('❌ Verification failed. Please try again.', 'error');
        this.log('Verification failed', verification);
        
        setTimeout(() => {
          this.resetVerification();
        }, 3000);
      }
      
    } catch (error) {
      this.log('Verification error', error);
      this.updateStatus('🔧 Verification service error.', 'error');
      
      if (this.options.autoFallback) {
        setTimeout(() => {
          this.showFallback();
        }, 2000);
      } else {
        this.callbacks['error-callback'](error);
      }
    }
  }

  resetVerification() {
    this.pressureData = [];
    this.motionData = [];
    this.currentStep = 0;
    this.updateStep();
    this.updateStatus('Ready to verify... Apply pressure on trackpad.');
    
    const pressureZone = document.getElementById('weightcha-pressure-zone');
    pressureZone?.classList.remove('active');
  }

  showFallback() {
    if (!this.options.fallback || !this.options.fallbackKey) {
      this.updateStatus('❌ Verification unavailable. No fallback configured.', 'error');
      return;
    }

    this.updateStatus('🔄 Loading fallback verification...');
    
    // Load and show traditional CAPTCHA
    switch (this.options.fallback) {
      case 'recaptcha':
        this.loadRecaptcha();
        break;
      case 'hcaptcha':
        this.loadHcaptcha();
        break;
      default:
        this.updateStatus('❌ Unknown fallback method.', 'error');
    }
  }

  loadRecaptcha() {
    // Implementation for reCAPTCHA fallback
    this.container.innerHTML = `
      <div class="weightcha-fallback">
        <p>Loading reCAPTCHA fallback...</p>
        <div id="recaptcha-container"></div>
      </div>
    `;
    
    // Load reCAPTCHA script and render
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.onload = () => this.renderRecaptcha();
      document.head.appendChild(script);
    } else {
      this.renderRecaptcha();
    }
  }

  renderRecaptcha() {
    if (window.grecaptcha) {
      window.grecaptcha.render('recaptcha-container', {
        sitekey: this.options.fallbackKey,
        callback: (token) => {
          this.callbacks.callback(token);
        }
      });
    }
  }

  // Utility methods
  detectTrackpadType() {
    const ua = navigator.userAgent;
    const screen = window.screen;
    
    if (ua.includes('Macintosh')) {
      if (screen.width === 3456 && screen.height === 2234) {
        return 'MacBook Pro 16" 2021';
      } else if (screen.width === 3024 && screen.height === 1964) {
        return 'MacBook Pro 14" 2021';
      } else if (screen.width === 2560 && screen.height === 1600) {
        return 'MacBook Air M1';
      }
      return 'MacBook (unknown model)';
    } else if (ua.includes('Windows')) {
      return 'Windows Precision Trackpad';
    } else if (ua.includes('iPad')) {
      return 'iPad Pro (pressure-sensitive)';
    }
    return 'generic';
  }

  isChromium() {
    return /Chrome|Chromium|Edge/.test(navigator.userAgent);
  }

  isSafari() {
    return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  }

  log(message, data = null) {
    if (this.options.debug) {
      console.log(`[WeightCha] ${message}`, data || '');
    }
  }
}

// Global export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeightCha;
} else {
  window.WeightCha = WeightCha;
}
