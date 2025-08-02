/**
 * Human Pattern Analyzer for Browser-Based WeightCha
 * Analyzes pressure patterns, motion data, and device characteristics
 * to determine if interaction is from a human or bot
 */

class HumanPatternAnalyzer {
  constructor() {
    this.patterns = {
      // Human characteristics
      pressureVariance: { min: 0.01, max: 0.15 },
      timingIrregularity: { min: 0.05, max: 0.25 },
      naturalRhythm: { min: 0.3, max: 0.8 },
      
      // Bot characteristics (to detect and reject)
      linearProgression: { threshold: 0.95 },
      perfectTiming: { threshold: 0.98 },
      mechanicalPattern: { threshold: 0.9 }
    };
    
    // Browser-specific detection patterns
    this.browserPatterns = {
      webHID: { accuracy: 0.95, confidenceBoost: 0.1 },
      forceTouch: { accuracy: 0.90, confidenceBoost: 0.08 },
      pointerEvents: { accuracy: 0.75, confidenceBoost: 0.05 },
      motionSensors: { accuracy: 0.60, confidenceBoost: 0.02 }
    };

    // Device-specific calibration profiles
    this.deviceProfiles = {
      'MacBook Pro 16" 2021': { pressureMultiplier: 1.2, sensitivity: 0.95 },
      'MacBook Pro 14" 2021': { pressureMultiplier: 1.15, sensitivity: 0.93 },
      'MacBook Air M1': { pressureMultiplier: 1.0, sensitivity: 0.88 },
      'MacBook Air M2': { pressureMultiplier: 1.05, sensitivity: 0.90 },
      'Surface Pro 8': { pressureMultiplier: 0.9, sensitivity: 0.75 },
      'Surface Pro 9': { pressureMultiplier: 0.95, sensitivity: 0.78 },
      'iPad Pro 12.9"': { pressureMultiplier: 0.8, sensitivity: 0.70 },
      'generic': { pressureMultiplier: 1.0, sensitivity: 0.65 }
    };
  }

  /**
   * Main analysis method for browser-based verification data
   */
  analyzePattern(verificationData) {
    try {
      // Handle both legacy and browser-based data formats
      const pressureData = verificationData.pressureData || verificationData;
      const deviceInfo = verificationData.deviceInfo || {};
      const detectionMethod = verificationData.detectionMethod || 'unknown';
      const motionData = verificationData.motionData || [];
      
      if (!pressureData || pressureData.length < 5) {
        return {
          isHuman: false,
          confidence: 0,
          reason: 'Insufficient pressure data',
          analysis: null
        };
      }

      // Get device profile for calibration
      const deviceProfile = this.getDeviceProfile(deviceInfo);
      const browserPattern = this.browserPatterns[detectionMethod] || this.browserPatterns.pointerEvents;

      // Perform multiple analyses
      const pressureAnalysis = this.analyzePressurePattern(pressureData, deviceProfile);
      const timingAnalysis = this.analyzeTimingPattern(pressureData);
      const motionAnalysis = this.analyzeMotionPattern(motionData);
      const deviceAnalysis = this.analyzeDeviceCharacteristics(deviceInfo);
      const biometricAnalysis = this.analyzeBiometricSignature(pressureData, motionData);

      // Calculate composite confidence score
      const baseConfidence = this.calculateCompositeConfidence({
        pressure: pressureAnalysis,
        timing: timingAnalysis,
        motion: motionAnalysis,
        device: deviceAnalysis,
        biometric: biometricAnalysis
      });

      // Apply browser-specific adjustments
      const adjustedConfidence = Math.min(1.0, baseConfidence + browserPattern.confidenceBoost);
      const isHuman = adjustedConfidence >= 0.65; // Threshold for human classification

      return {
        isHuman,
        confidence: adjustedConfidence,
        detectionMethod,
        deviceProfile: deviceProfile.name,
        analysis: {
          pressure: pressureAnalysis,
          timing: timingAnalysis,
          motion: motionAnalysis,
          device: deviceAnalysis,
          biometric: biometricAnalysis,
          composite: {
            baseConfidence,
            adjustedConfidence,
            browserBoost: browserPattern.confidenceBoost
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pattern analysis error:', error);
      return {
        isHuman: false,
        confidence: 0,
        reason: 'Analysis error',
        error: error.message
      };
    }
  }

  /**
   * Analyze pressure patterns for human characteristics
   */
  analyzePressurePattern(pressureData, deviceProfile) {
    const pressures = pressureData.map(d => d.pressure || d.weight || 0);
    const weights = pressureData.map(d => d.weight || d.pressure * 100 || 0);
    
    if (pressures.length === 0) {
      return { score: 0, characteristics: {} };
    }

    // Apply device-specific calibration
    const calibratedPressures = pressures.map(p => p * deviceProfile.pressureMultiplier);
    
    // Calculate pressure characteristics
    const maxPressure = Math.max(...calibratedPressures);
    const avgPressure = calibratedPressures.reduce((a, b) => a + b, 0) / calibratedPressures.length;
    const variance = this.calculateVariance(calibratedPressures);
    const naturalness = this.calculateNaturalness(calibratedPressures);
    
    // Human pressure patterns have specific characteristics
    const characteristics = {
      maxPressure,
      avgPressure,
      variance,
      naturalness,
      hasGradualIncrease: this.hasGradualPressureIncrease(calibratedPressures),
      hasNaturalRelease: this.hasNaturalPressureRelease(calibratedPressures),
      smoothnessScore: this.calculateSmoothness(calibratedPressures)
    };

    // Score based on human-like characteristics
    let score = 0;
    
    // Variance check (humans have natural variance)
    if (variance >= this.patterns.pressureVariance.min && variance <= this.patterns.pressureVariance.max) {
      score += 0.25;
    }
    
    // Naturalness check
    if (naturalness >= this.patterns.naturalRhythm.min) {
      score += 0.25;
    }
    
    // Gradual pressure application (not instant)
    if (characteristics.hasGradualIncrease) {
      score += 0.2;
    }
    
    // Natural pressure release
    if (characteristics.hasNaturalRelease) {
      score += 0.2;
    }
    
    // Smoothness (not robotic)
    if (characteristics.smoothnessScore > 0.3 && characteristics.smoothnessScore < 0.9) {
      score += 0.1;
    }

    return { score, characteristics };
  }

  /**
   * Analyze timing patterns
   */
  analyzeTimingPattern(pressureData) {
    const timestamps = pressureData.map(d => d.timestamp);
    
    if (timestamps.length < 2) {
      return { score: 0, characteristics: {} };
    }

    // Calculate time intervals
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = this.calculateVariance(intervals);
    const rhythmicity = this.calculateRhythmicity(intervals);
    
    const characteristics = {
      avgInterval,
      intervalVariance,
      rhythmicity,
      totalDuration: timestamps[timestamps.length - 1] - timestamps[0],
      hasNaturalTiming: intervalVariance > 0.05 && intervalVariance < 0.5
    };

    // Score timing naturalness
    let score = 0;
    
    // Natural timing irregularity (not perfectly regular)
    if (intervalVariance >= this.patterns.timingIrregularity.min && 
        intervalVariance <= this.patterns.timingIrregularity.max) {
      score += 0.4;
    }
    
    // Reasonable duration (not too fast or slow)
    if (characteristics.totalDuration > 500 && characteristics.totalDuration < 15000) {
      score += 0.3;
    }
    
    // Natural rhythm
    if (rhythmicity >= this.patterns.naturalRhythm.min && rhythmicity <= this.patterns.naturalRhythm.max) {
      score += 0.3;
    }

    return { score, characteristics };
  }

  /**
   * Analyze motion sensor data (for fallback detection)
   */
  analyzeMotionPattern(motionData) {
    if (!motionData || motionData.length === 0) {
      return { score: 0.5, characteristics: { available: false } }; // Neutral if no motion data
    }

    // Analyze accelerometer and gyroscope data
    const accelerations = motionData.map(d => ({
      x: d.acceleration?.x || 0,
      y: d.acceleration?.y || 0,
      z: d.acceleration?.z || 0
    }));

    const rotations = motionData.map(d => ({
      alpha: d.rotation?.alpha || 0,
      beta: d.rotation?.beta || 0,
      gamma: d.rotation?.gamma || 0
    }));

    // Calculate motion characteristics
    const motionMagnitude = accelerations.map(a => 
      Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
    );

    const avgMagnitude = motionMagnitude.reduce((a, b) => a + b, 0) / motionMagnitude.length;
    const motionVariance = this.calculateVariance(motionMagnitude);
    
    const characteristics = {
      avgMagnitude,
      motionVariance,
      hasSubtleMovement: avgMagnitude > 0.01 && avgMagnitude < 0.5,
      hasNaturalVariation: motionVariance > 0.001 && motionVariance < 0.1,
      available: true
    };

    // Score motion naturalness
    let score = 0.5; // Default neutral score
    
    if (characteristics.hasSubtleMovement) {
      score += 0.2; // Humans cause subtle device movement
    }
    
    if (characteristics.hasNaturalVariation) {
      score += 0.2; // Natural variation in movement
    }
    
    // Penalize if motion is too perfect (robotic)
    if (motionVariance < 0.0001) {
      score -= 0.3;
    }

    return { score, characteristics };
  }

  /**
   * Analyze device characteristics for authenticity
   */
  analyzeDeviceCharacteristics(deviceInfo) {
    const characteristics = {
      userAgent: deviceInfo.userAgent || '',
      screen: deviceInfo.screen || {},
      trackpadType: deviceInfo.trackpadType || 'unknown',
      browserSupport: deviceInfo.browserSupport || []
    };

    let score = 0.5; // Default neutral score
    
    // Check for known device types
    if (characteristics.trackpadType !== 'unknown' && characteristics.trackpadType !== 'generic') {
      score += 0.2;
    }
    
    // Check for realistic user agent
    if (characteristics.userAgent.includes('Macintosh') || 
        characteristics.userAgent.includes('Windows') ||
        characteristics.userAgent.includes('iPad')) {
      score += 0.2;
    }
    
    // Check for reasonable screen dimensions
    const screen = characteristics.screen;
    if (screen.width && screen.height && 
        screen.width > 800 && screen.height > 600 &&
        screen.width < 8000 && screen.height < 8000) {
      score += 0.1;
    }

    return { score, characteristics };
  }

  /**
   * Analyze biometric signature combining pressure and motion
   */
  analyzeBiometricSignature(pressureData, motionData) {
    // Create a unique signature based on pressure and motion patterns
    const pressureSignature = this.createPressureSignature(pressureData);
    const motionSignature = this.createMotionSignature(motionData);
    
    const characteristics = {
      pressureSignature,
      motionSignature,
      uniqueness: this.calculateUniqueness(pressureSignature, motionSignature),
      complexity: this.calculateComplexity(pressureData, motionData)
    };

    let score = 0.5;
    
    // High complexity indicates human behavior
    if (characteristics.complexity > 0.3) {
      score += 0.3;
    }
    
    // Reasonable uniqueness (not too random, not too regular)
    if (characteristics.uniqueness > 0.2 && characteristics.uniqueness < 0.8) {
      score += 0.2;
    }

    return { score, characteristics };
  }

  /**
   * Calculate composite confidence from all analyses
   */
  calculateCompositeConfidence(analyses) {
    const weights = {
      pressure: 0.35,
      timing: 0.25,
      motion: 0.15,
      device: 0.10,
      biometric: 0.15
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [type, analysis] of Object.entries(analyses)) {
      if (analysis && typeof analysis.score === 'number') {
        weightedSum += analysis.score * weights[type];
        totalWeight += weights[type];
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get device profile for calibration
   */
  getDeviceProfile(deviceInfo) {
    const userAgent = deviceInfo.userAgent || '';
    const screen = deviceInfo.screen || {};
    
    // Try to identify specific device models
    let deviceName = 'generic';
    
    if (userAgent.includes('Macintosh')) {
      if (screen.width === 3456 && screen.height === 2234) {
        deviceName = 'MacBook Pro 16" 2021';
      } else if (screen.width === 3024 && screen.height === 1964) {
        deviceName = 'MacBook Pro 14" 2021';
      } else if (screen.width === 2560 && screen.height === 1600) {
        deviceName = 'MacBook Air M1';
      } else if (screen.width === 2880 && screen.height === 1864) {
        deviceName = 'MacBook Air M2';
      }
    } else if (userAgent.includes('Windows')) {
      if (userAgent.includes('Surface')) {
        deviceName = 'Surface Pro 8';
      }
    } else if (userAgent.includes('iPad')) {
      if (screen.width >= 2048) {
        deviceName = 'iPad Pro 12.9"';
      }
    }

    const profile = this.deviceProfiles[deviceName] || this.deviceProfiles.generic;
    return { ...profile, name: deviceName };
  }

  // Helper methods for calculations
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateNaturalness(values) {
    // Measure how "natural" the pressure curve looks
    if (values.length < 3) return 0;
    
    let smoothTransitions = 0;
    let totalTransitions = 0;
    
    for (let i = 1; i < values.length - 1; i++) {
      const change1 = Math.abs(values[i] - values[i-1]);
      const change2 = Math.abs(values[i+1] - values[i]);
      
      // Natural transitions are not too abrupt
      if (change1 < 0.3 && change2 < 0.3) {
        smoothTransitions++;
      }
      totalTransitions++;
    }
    
    return totalTransitions > 0 ? smoothTransitions / totalTransitions : 0;
  }

  hasGradualPressureIncrease(values) {
    if (values.length < 3) return false;
    
    // Check if pressure builds up gradually (not instant)
    const first = values[0];
    const peak = Math.max(...values);
    const gradualThreshold = peak * 0.3;
    
    let gradualPoints = 0;
    for (let i = 0; i < values.length && values[i] < gradualThreshold; i++) {
      gradualPoints++;
    }
    
    return gradualPoints >= 2; // At least 2 points of gradual buildup
  }

  hasNaturalPressureRelease(values) {
    if (values.length < 3) return false;
    
    // Check if pressure releases gradually (not instant drop)
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    
    if (peakIndex >= values.length - 2) return true; // Peak at end is OK
    
    const releaseValues = values.slice(peakIndex);
    let gradualRelease = true;
    
    for (let i = 1; i < releaseValues.length; i++) {
      const drop = releaseValues[i-1] - releaseValues[i];
      if (drop > peak * 0.5) { // Drop more than 50% in one step
        gradualRelease = false;
        break;
      }
    }
    
    return gradualRelease;
  }

  calculateSmoothness(values) {
    if (values.length < 2) return 0;
    
    let totalChange = 0;
    let maxChange = 0;
    
    for (let i = 1; i < values.length; i++) {
      const change = Math.abs(values[i] - values[i-1]);
      totalChange += change;
      maxChange = Math.max(maxChange, change);
    }
    
    const avgChange = totalChange / (values.length - 1);
    return maxChange > 0 ? 1 - (avgChange / maxChange) : 1;
  }

  calculateRhythmicity(intervals) {
    if (intervals.length < 3) return 0;
    
    const variance = this.calculateVariance(intervals);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Rhythmic if variance is not too high relative to mean
    return mean > 0 ? Math.max(0, 1 - (variance / (mean * mean))) : 0;
  }

  createPressureSignature(pressureData) {
    // Create a simplified signature of the pressure pattern
    const pressures = pressureData.map(d => d.pressure || d.weight || 0);
    const normalized = this.normalizeArray(pressures);
    
    // Create signature points (simplified curve)
    const signaturePoints = [];
    const step = Math.max(1, Math.floor(normalized.length / 10));
    
    for (let i = 0; i < normalized.length; i += step) {
      signaturePoints.push(Math.round(normalized[i] * 100) / 100);
    }
    
    return signaturePoints;
  }

  createMotionSignature(motionData) {
    if (!motionData || motionData.length === 0) return [];
    
    // Create simplified motion signature
    const magnitudes = motionData.map(d => {
      const acc = d.acceleration || { x: 0, y: 0, z: 0 };
      return Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    });
    
    const normalized = this.normalizeArray(magnitudes);
    const step = Math.max(1, Math.floor(normalized.length / 5));
    const signaturePoints = [];
    
    for (let i = 0; i < normalized.length; i += step) {
      signaturePoints.push(Math.round(normalized[i] * 100) / 100);
    }
    
    return signaturePoints;
  }

  calculateUniqueness(pressureSignature, motionSignature) {
    // Measure how unique/distinctive the combined signature is
    const combined = [...pressureSignature, ...motionSignature];
    if (combined.length === 0) return 0;
    
    const variance = this.calculateVariance(combined);
    const range = Math.max(...combined) - Math.min(...combined);
    
    return Math.min(1, variance * range);
  }

  calculateComplexity(pressureData, motionData) {
    // Measure overall complexity of the interaction
    const pressureComplexity = pressureData.length > 0 ? 
      this.calculateVariance(pressureData.map(d => d.pressure || d.weight || 0)) : 0;
    
    const motionComplexity = motionData && motionData.length > 0 ?
      this.calculateVariance(motionData.map(d => {
        const acc = d.acceleration || { x: 0, y: 0, z: 0 };
        return Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      })) : 0;
    
    return (pressureComplexity + motionComplexity) / 2;
  }

  normalizeArray(arr) {
    if (arr.length === 0) return [];
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min;
    
    if (range === 0) return arr.map(() => 0);
    
    return arr.map(val => (val - min) / range);
  }
}

module.exports = HumanPatternAnalyzer;
