# WeightCha Browser-Only Implementation

## Approach 1: WebAssembly + Pointer Events API

### **Core Technology Stack**
- **WebAssembly (WASM)**: Compile trackpad access code to run in browser
- **Pointer Events API**: Access pressure data from trackpad
- **WebHID API**: Direct hardware access (Chrome/Edge only)
- **Force Touch Web API**: Safari's built-in pressure detection

### **Browser Pressure Detection**

```javascript
// Modern browsers support pressure through Pointer Events
class BrowserWeightCha {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.pressureData = [];
    this.isRecording = false;
    this.baselineWeight = 0;
  }

  // Detect pressure through web APIs
  setupPressureDetection(element) {
    // Method 1: Pointer Events API (Most browsers)
    element.addEventListener('pointerdown', (e) => {
      this.startRecording();
      this.recordPressure(e.pressure, e.timeStamp);
    });

    element.addEventListener('pointermove', (e) => {
      if (this.isRecording && e.pressure > 0) {
        this.recordPressure(e.pressure, e.timeStamp);
      }
    });

    element.addEventListener('pointerup', (e) => {
      this.stopRecording();
    });

    // Method 2: Force Touch API (Safari)
    element.addEventListener('webkitmouseforcewillbegin', (e) => {
      this.startRecording();
    });

    element.addEventListener('webkitmouseforcechanged', (e) => {
      if (this.isRecording) {
        // e.webkitForce gives pressure value 0-3
        const normalizedPressure = e.webkitForce / 3.0;
        this.recordPressure(normalizedPressure, e.timeStamp);
      }
    });

    element.addEventListener('webkitmouseforcedown', (e) => {
      this.recordPressure(e.webkitForce / 3.0, e.timeStamp);
    });

    // Method 3: WebHID for direct trackpad access (Chrome/Edge)
    if ('hid' in navigator) {
      this.setupWebHID();
    }
  }

  async setupWebHID() {
    try {
      // Request access to trackpad HID device
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x05ac }, // Apple vendor ID
          { vendorId: 0x046d }, // Logitech (for external trackpads)
        ]
      });

      if (devices.length > 0) {
        const device = devices[0];
        await device.open();
        
        device.addEventListener('inputreport', (event) => {
          this.processHIDData(event.data);
        });
      }
    } catch (error) {
      console.log('WebHID not available, falling back to pointer events');
    }
  }

  recordPressure(pressure, timestamp) {
    // Convert normalized pressure (0-1) to weight approximation
    const estimatedWeight = this.convertPressureToWeight(pressure);
    
    this.pressureData.push({
      pressure: pressure,
      weight: estimatedWeight,
      timestamp: timestamp,
      delta: estimatedWeight - this.baselineWeight
    });
  }

  convertPressureToWeight(pressure) {
    // Calibration formula - needs tuning based on device
    // Different for each trackpad type
    const deviceType = this.detectTrackpadType();
    
    switch (deviceType) {
      case 'macbook-pro-2021':
        return pressure * 150; // grams
      case 'macbook-air-2020':
        return pressure * 120; // grams
      case 'magic-trackpad':
        return pressure * 180; // grams
      default:
        return pressure * 100; // grams (generic)
    }
  }

  detectTrackpadType() {
    // Use user agent and screen size to estimate device
    const userAgent = navigator.userAgent;
    const screen = window.screen;
    
    if (userAgent.includes('Macintosh')) {
      if (screen.width === 3456 && screen.height === 2234) {
        return 'macbook-pro-2021-16'; // 16" M1 Pro/Max
      } else if (screen.width === 3024 && screen.height === 1964) {
        return 'macbook-pro-2021-14'; // 14" M1 Pro/Max
      } else if (screen.width === 2560 && screen.height === 1600) {
        return 'macbook-air-2020'; // M1 Air
      }
    }
    return 'generic';
  }

  async submitVerification() {
    const analysis = this.analyzePressurePattern();
    
    const verificationData = {
      challengeId: this.challengeId,
      pressureData: this.pressureData,
      analysis: analysis,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screen: {
          width: screen.width,
          height: screen.height,
          pixelRatio: window.devicePixelRatio
        },
        trackpadType: this.detectTrackpadType()
      }
    };

    const response = await fetch('/api/v1/verification/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verificationData)
    });

    return await response.json();
  }

  analyzePressurePattern() {
    if (this.pressureData.length === 0) return null;

    const pressures = this.pressureData.map(d => d.pressure);
    const timestamps = this.pressureData.map(d => d.timestamp);
    
    return {
      maxPressure: Math.max(...pressures),
      avgPressure: pressures.reduce((a, b) => a + b) / pressures.length,
      variance: this.calculateVariance(pressures),
      duration: timestamps[timestamps.length - 1] - timestamps[0],
      rateOfChange: this.calculateRateOfChange(),
      naturalness: this.calculateNaturalnessScore(),
      isHuman: this.detectHumanPattern()
    };
  }

  calculateVariance(arr) {
    const mean = arr.reduce((a, b) => a + b) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }

  calculateRateOfChange() {
    if (this.pressureData.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < this.pressureData.length; i++) {
      totalChange += Math.abs(
        this.pressureData[i].pressure - this.pressureData[i-1].pressure
      );
    }
    return totalChange / (this.pressureData.length - 1);
  }

  calculateNaturalnessScore() {
    // Human pressure patterns have characteristic curves
    // Bots tend to have linear or step-function patterns
    
    const smoothness = this.calculateSmoothness();
    const rhythmicity = this.calculateRhythmicity();
    const variability = this.calculateVariability();
    
    return (smoothness * 0.4) + (rhythmicity * 0.3) + (variability * 0.3);
  }

  detectHumanPattern() {
    const analysis = this.analyzePressurePattern();
    
    // Human indicators:
    // - Gradual pressure increase/decrease (not instant)
    // - Natural variance in pressure application
    // - Timing irregularities that indicate human motor control
    // - Pressure curve follows human finger biomechanics
    
    const humanScore = (
      (analysis.variance > 0.01 ? 1 : 0) + // Has natural variance
      (analysis.naturalness > 0.7 ? 1 : 0) + // Natural pattern
      (analysis.duration > 500 ? 1 : 0) + // Not too fast
      (analysis.rateOfChange < 0.5 ? 1 : 0) // Not too sharp changes
    ) / 4;
    
    return humanScore > 0.6; // 60% confidence threshold
  }
}
```

### **Enhanced UI Components**

```html
<!-- Browser-only WeightCha widget -->
<div id="weightcha-browser" class="weightcha-container">
  <div class="weightcha-header">
    <h3>🤚 Verify you're human</h3>
    <p>Place finger on trackpad and apply gentle pressure</p>
  </div>
  
  <div id="pressure-zone" class="pressure-detection-area">
    <div class="pressure-visual">
      <div class="pressure-circle"></div>
      <div class="pressure-indicator">
        <span id="pressure-value">0g</span>
      </div>
    </div>
    
    <div class="instructions">
      <div id="step-1" class="step active">
        Place finger on trackpad
      </div>
      <div id="step-2" class="step">
        Apply gentle pressure (50-100g)
      </div>
      <div id="step-3" class="step">
        Hold for 2 seconds
      </div>
      <div id="step-4" class="step">
        Release slowly
      </div>
    </div>
  </div>
  
  <div class="progress-bar">
    <div id="progress-fill" class="progress-fill"></div>
  </div>
  
  <div id="verification-status" class="status-message">
    Ready to verify...
  </div>
</div>

<style>
.weightcha-container {
  width: 300px;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
}

.pressure-detection-area {
  height: 200px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.pressure-circle {
  width: 80px;
  height: 80px;
  border: 3px solid #007AFF;
  border-radius: 50%;
  transition: all 0.1s ease;
  transform-origin: center;
}

.pressure-circle.active {
  background: radial-gradient(circle, #007AFF22, transparent);
  transform: scale(1.2);
  border-color: #34C759;
}

.pressure-indicator {
  margin-top: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #007AFF;
}

.step {
  padding: 5px 0;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.step.active {
  opacity: 1;
  color: #007AFF;
}

.progress-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  margin: 15px 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007AFF, #34C759);
  width: 0%;
  transition: width 0.3s ease;
}

.status-message {
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-top: 10px;
}
</style>

<script>
// Initialize browser-only WeightCha
const weightcha = new BrowserWeightCha('your-api-key');

document.addEventListener('DOMContentLoaded', () => {
  const pressureZone = document.getElementById('pressure-zone');
  const pressureCircle = pressureZone.querySelector('.pressure-circle');
  const pressureValue = document.getElementById('pressure-value');
  const progressFill = document.getElementById('progress-fill');
  const statusMessage = document.getElementById('verification-status');
  
  // Setup pressure detection
  weightcha.setupPressureDetection(pressureZone);
  
  // Visual feedback
  weightcha.onPressureChange = (pressure, weight) => {
    const percentage = Math.min(pressure * 100, 100);
    pressureCircle.style.transform = `scale(${1 + pressure * 0.5})`;
    pressureCircle.style.backgroundColor = `rgba(0, 122, 255, ${pressure * 0.3})`;
    pressureValue.textContent = `${Math.round(weight)}g`;
    progressFill.style.width = `${percentage}%`;
  };
  
  // Step progression
  weightcha.onStepChange = (step) => {
    document.querySelectorAll('.step').forEach((el, index) => {
      el.classList.toggle('active', index === step);
    });
  };
  
  // Completion
  weightcha.onComplete = (result) => {
    if (result.isHuman) {
      statusMessage.textContent = '✅ Human verified!';
      statusMessage.style.color = '#34C759';
      
      // Trigger form submission or callback
      if (window.weightchaCallback) {
        window.weightchaCallback(result.token);
      }
    } else {
      statusMessage.textContent = '❌ Verification failed. Please try again.';
      statusMessage.style.color = '#FF3B30';
    }
  };
});
</script>
```

## Approach 2: WebRTC + Device Sensors

```javascript
// Alternative: Use device sensors through WebRTC
class SensorBasedWeightCha {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.accelerometer = null;
    this.gyroscope = null;
  }

  async setupSensors() {
    try {
      // Request device motion permissions
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') {
          this.startMotionDetection();
        }
      } else {
        this.startMotionDetection();
      }
    } catch (error) {
      console.log('Device sensors not available');
    }
  }

  startMotionDetection() {
    window.addEventListener('devicemotion', (event) => {
      // Detect micro-movements that indicate human touch
      const acceleration = event.acceleration;
      const rotationRate = event.rotationRate;
      
      this.analyzeMotionPattern(acceleration, rotationRate);
    });
  }

  analyzeMotionPattern(acceleration, rotation) {
    // Human touch creates subtle device movements
    // Bots typically don't cause these micro-movements
    const motionSignature = {
      x: acceleration.x,
      y: acceleration.y,
      z: acceleration.z,
      alpha: rotation.alpha,
      beta: rotation.beta,
      gamma: rotation.gamma,
      timestamp: Date.now()
    };
    
    return this.detectHumanMotion(motionSignature);
  }
}
```

## Updated Integration Guide
