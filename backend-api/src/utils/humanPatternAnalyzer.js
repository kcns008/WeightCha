/**
 * Human Pattern Analyzer
 * Analyzes trackpad pressure data to detect human vs bot patterns
 */

class HumanPatternAnalyzer {
  constructor() {
    // Thresholds for human detection
    this.thresholds = {
      minVariance: parseFloat(process.env.PRESSURE_VARIANCE_THRESHOLD) || 0.15,
      minSamples: parseInt(process.env.MIN_PRESSURE_SAMPLES) || 50,
      confidenceThreshold: parseFloat(process.env.HUMAN_PATTERN_CONFIDENCE_THRESHOLD) || 0.8,
      maxPressure: 100.0, // Maximum expected pressure in grams
      minPressure: 0.5,   // Minimum expected pressure in grams
    };
  }

  async analyze(pressureData, challenge) {
    try {
      const analysisStart = Date.now();
      
      // Basic validation
      if (!Array.isArray(pressureData) || pressureData.length < this.thresholds.minSamples) {
        return {
          isHuman: false,
          confidence: 0.0,
          details: {
            reason: 'Insufficient pressure data',
            sampleCount: pressureData.length,
            requiredSamples: this.thresholds.minSamples
          }
        };
      }

      // Extract pressure values
      const pressures = pressureData.map(sample => sample.pressure).filter(p => p != null);
      
      if (pressures.length === 0) {
        return {
          isHuman: false,
          confidence: 0.0,
          details: { reason: 'No valid pressure readings' }
        };
      }

      // Run analysis based on challenge type
      const analysisResult = await this.analyzeByType(pressureData, challenge);
      
      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(analysisResult);
      
      const result = {
        isHuman: overallConfidence >= this.thresholds.confidenceThreshold,
        confidence: overallConfidence,
        details: {
          ...analysisResult,
          analysisTime: Date.now() - analysisStart,
          sampleCount: pressureData.length,
          challengeType: challenge.type
        }
      };

      return result;

    } catch (error) {
      console.error('Pattern analysis error:', error);
      return {
        isHuman: false,
        confidence: 0.0,
        details: {
          reason: 'Analysis failed',
          error: error.message
        }
      };
    }
  }

  async analyzeByType(pressureData, challenge) {
    switch (challenge.type) {
      case 'pressure_pattern':
        return this.analyzePressurePattern(pressureData, challenge);
      case 'rhythm_test':
        return this.analyzeRhythmTest(pressureData, challenge);
      case 'sustained_pressure':
        return this.analyzeSustainedPressure(pressureData, challenge);
      case 'progressive_pressure':
        return this.analyzeProgressivePressure(pressureData, challenge);
      default:
        return this.analyzePressurePattern(pressureData, challenge);
    }
  }

  analyzePressurePattern(pressureData, challenge) {
    const pressures = pressureData.map(d => d.pressure);
    const timestamps = pressureData.map(d => d.timestamp);
    
    // Calculate basic statistics
    const stats = this.calculateStatistics(pressures);
    
    // Analyze pressure variance (humans have natural micro-variations)
    const varianceScore = this.analyzeVariance(pressures);
    
    // Analyze timing patterns
    const timingScore = this.analyzeTimingPatterns(timestamps);
    
    // Check for unnatural patterns (too perfect or too erratic)
    const naturalnessScore = this.analyzeNaturalness(pressures);
    
    // Analyze pressure range
    const rangeScore = this.analyzePressureRange(pressures);
    
    return {
      type: 'pressure_pattern',
      varianceScore,
      timingScore,
      naturalnessScore,
      rangeScore,
      statistics: stats,
      scores: {
        variance: varianceScore,
        timing: timingScore,
        naturalness: naturalnessScore,
        range: rangeScore
      }
    };
  }

  analyzeRhythmTest(pressureData, challenge) {
    const pressures = pressureData.map(d => d.pressure);
    const timestamps = pressureData.map(d => d.timestamp);
    
    // Detect tap events (pressure spikes)
    const taps = this.detectTaps(pressureData);
    
    // Analyze rhythm consistency
    const rhythmScore = this.analyzeRhythm(taps);
    
    // Human timing inconsistency (good thing!)
    const humanTimingScore = this.analyzeHumanTiming(taps);
    
    return {
      type: 'rhythm_test',
      tapCount: taps.length,
      rhythmScore,
      humanTimingScore,
      taps,
      scores: {
        rhythm: rhythmScore,
        humanTiming: humanTimingScore
      }
    };
  }

  analyzeSustainedPressure(pressureData, challenge) {
    const pressures = pressureData.map(d => d.pressure);
    
    // Analyze pressure stability
    const stabilityScore = this.analyzeStability(pressures);
    
    // Analyze movement patterns (if position data available)
    const movementScore = this.analyzeMovement(pressureData);
    
    // Check for human-like pressure fluctuations
    const fluctuationScore = this.analyzeFluctuations(pressures);
    
    return {
      type: 'sustained_pressure',
      stabilityScore,
      movementScore,
      fluctuationScore,
      scores: {
        stability: stabilityScore,
        movement: movementScore,
        fluctuation: fluctuationScore
      }
    };
  }

  analyzeProgressivePressure(pressureData, challenge) {
    const pressures = pressureData.map(d => d.pressure);
    
    // Check for proper pressure progression
    const progressionScore = this.analyzeProgression(pressures);
    
    // Analyze smoothness of progression
    const smoothnessScore = this.analyzeProgressionSmoothness(pressures);
    
    // Check final pressure ratio
    const finalPressureScore = this.analyzeFinalPressure(pressures);
    
    return {
      type: 'progressive_pressure',
      progressionScore,
      smoothnessScore,
      finalPressureScore,
      scores: {
        progression: progressionScore,
        smoothness: smoothnessScore,
        finalPressure: finalPressureScore
      }
    };
  }

  calculateStatistics(pressures) {
    const mean = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;
    const variance = pressures.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / pressures.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...pressures);
    const max = Math.max(...pressures);
    
    return {
      mean,
      variance,
      standardDeviation: stdDev,
      min,
      max,
      range: max - min,
      coefficientOfVariation: stdDev / mean
    };
  }

  analyzeVariance(pressures) {
    const stats = this.calculateStatistics(pressures);
    
    // Humans typically have 10-25% coefficient of variation
    const cv = stats.coefficientOfVariation;
    
    if (cv < 0.05) {
      // Too consistent - likely bot
      return 0.2;
    } else if (cv > 0.5) {
      // Too erratic - likely bot or invalid
      return 0.3;
    } else if (cv >= 0.1 && cv <= 0.3) {
      // Human-like variance
      return 0.9;
    } else {
      // Moderate variance
      return 0.6;
    }
  }

  analyzeTimingPatterns(timestamps) {
    if (timestamps.length < 2) return 0.5;
    
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const stats = this.calculateStatistics(intervals);
    
    // Humans have natural timing variations
    const cv = stats.coefficientOfVariation;
    
    if (cv < 0.1) {
      // Too consistent timing - likely bot
      return 0.2;
    } else if (cv > 1.0) {
      // Too erratic - likely invalid
      return 0.3;
    } else {
      // Human-like timing variation
      return Math.min(0.9, cv * 2);
    }
  }

  analyzeNaturalness(pressures) {
    // Check for unnatural patterns
    let naturalScore = 1.0;
    
    // Check for repeated values (bots might repeat exact values)
    const uniqueValues = new Set(pressures);
    const uniqueRatio = uniqueValues.size / pressures.length;
    
    if (uniqueRatio < 0.7) {
      naturalScore *= 0.5; // Too many repeated values
    }
    
    // Check for linear patterns
    const linearityScore = this.checkLinearity(pressures);
    if (linearityScore > 0.9) {
      naturalScore *= 0.4; // Too linear
    }
    
    return Math.max(0.1, naturalScore);
  }

  analyzePressureRange(pressures) {
    const min = Math.min(...pressures);
    const max = Math.max(...pressures);
    
    // Check if pressures are in reasonable human range
    if (min < this.thresholds.minPressure || max > this.thresholds.maxPressure) {
      return 0.3;
    }
    
    // Good pressure range
    return 0.8;
  }

  detectTaps(pressureData) {
    const taps = [];
    let inTap = false;
    let tapStart = null;
    
    const pressureThreshold = 2.0; // Minimum pressure to consider a tap
    
    for (let i = 0; i < pressureData.length; i++) {
      const sample = pressureData[i];
      
      if (!inTap && sample.pressure > pressureThreshold) {
        // Start of tap
        inTap = true;
        tapStart = {
          startTime: sample.timestamp,
          startPressure: sample.pressure,
          maxPressure: sample.pressure,
          maxTime: sample.timestamp
        };
      } else if (inTap && sample.pressure > tapStart.maxPressure) {
        // Update max pressure in current tap
        tapStart.maxPressure = sample.pressure;
        tapStart.maxTime = sample.timestamp;
      } else if (inTap && sample.pressure <= pressureThreshold) {
        // End of tap
        inTap = false;
        taps.push({
          ...tapStart,
          endTime: sample.timestamp,
          duration: sample.timestamp - tapStart.startTime
        });
      }
    }
    
    return taps;
  }

  analyzeRhythm(taps) {
    if (taps.length < 2) return 0.5;
    
    const intervals = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].startTime - taps[i - 1].startTime);
    }
    
    // Expected rhythm: tap-pause-tap-tap (short-long-short pattern)
    // This is just a basic implementation
    const stats = this.calculateStatistics(intervals);
    const cv = stats.coefficientOfVariation;
    
    // Some variation is expected for humans
    return cv > 0.1 && cv < 0.5 ? 0.8 : 0.4;
  }

  analyzeHumanTiming(taps) {
    // Humans can't maintain perfect timing
    const intervals = [];
    for (let i = 1; i < taps.length; i++) {
      intervals.push(taps[i].startTime - taps[i - 1].startTime);
    }
    
    if (intervals.length < 2) return 0.5;
    
    const stats = this.calculateStatistics(intervals);
    const cv = stats.coefficientOfVariation;
    
    // Humans typically have 15-40% timing variation
    return cv >= 0.15 && cv <= 0.4 ? 0.9 : 0.4;
  }

  analyzeStability(pressures) {
    const stats = this.calculateStatistics(pressures);
    const cv = stats.coefficientOfVariation;
    
    // For sustained pressure, we want relative stability but not perfect
    if (cv < 0.05) {
      return 0.3; // Too stable
    } else if (cv > 0.3) {
      return 0.4; // Too unstable
    } else {
      return 0.8; // Good stability
    }
  }

  analyzeMovement(pressureData) {
    // If position data is available, analyze movement patterns
    const hasPosition = pressureData.some(d => d.position);
    
    if (!hasPosition) {
      return 0.6; // Neutral score if no position data
    }
    
    // Analyze movement smoothness and patterns
    const positions = pressureData.filter(d => d.position).map(d => d.position);
    
    // Calculate movement distances
    const distances = [];
    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      distances.push(Math.sqrt(dx * dx + dy * dy));
    }
    
    const stats = this.calculateStatistics(distances);
    
    // Human movement typically has some variation
    return stats.coefficientOfVariation > 0.2 ? 0.8 : 0.5;
  }

  analyzeFluctuations(pressures) {
    // Analyze micro-fluctuations in pressure
    const fluctuations = [];
    for (let i = 1; i < pressures.length; i++) {
      fluctuations.push(Math.abs(pressures[i] - pressures[i - 1]));
    }
    
    const stats = this.calculateStatistics(fluctuations);
    
    // Humans have natural micro-fluctuations
    return stats.mean > 0.1 && stats.mean < 2.0 ? 0.8 : 0.4;
  }

  analyzeProgression(pressures) {
    // Check if pressure generally increases over time
    const firstQuarter = pressures.slice(0, Math.floor(pressures.length / 4));
    const lastQuarter = pressures.slice(-Math.floor(pressures.length / 4));
    
    const firstAvg = firstQuarter.reduce((sum, p) => sum + p, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, p) => sum + p, 0) / lastQuarter.length;
    
    const ratio = lastAvg / firstAvg;
    
    // Should be significant increase
    return ratio >= 2.0 ? 0.9 : (ratio >= 1.5 ? 0.6 : 0.3);
  }

  analyzeProgressionSmoothness(pressures) {
    // Calculate rate of change
    const rates = [];
    for (let i = 1; i < pressures.length; i++) {
      rates.push(pressures[i] - pressures[i - 1]);
    }
    
    // Check for smooth progression (mostly positive changes)
    const positiveRates = rates.filter(r => r > 0).length;
    const smoothnessRatio = positiveRates / rates.length;
    
    return smoothnessRatio >= 0.7 ? 0.8 : 0.4;
  }

  analyzeFinalPressure(pressures) {
    const maxPressure = Math.max(...pressures);
    const finalPressure = pressures[pressures.length - 1];
    
    const ratio = finalPressure / maxPressure;
    
    // Final pressure should be close to maximum
    return ratio >= 0.8 ? 0.9 : 0.5;
  }

  checkLinearity(values) {
    // Simple linear regression to check if values follow a straight line
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const xSum = x.reduce((sum, val) => sum + val, 0);
    const ySum = values.reduce((sum, val) => sum + val, 0);
    const xySum = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const x2Sum = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;
    
    // Calculate R-squared
    const yMean = ySum / n;
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    
    return 1 - (ssRes / ssTot);
  }

  calculateOverallConfidence(analysisResult) {
    const scores = analysisResult.scores || {};
    const scoreValues = Object.values(scores);
    
    if (scoreValues.length === 0) {
      return 0.0;
    }
    
    // Calculate weighted average (all scores equally weighted for now)
    const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    
    // Apply type-specific adjustments
    let adjustment = 1.0;
    
    switch (analysisResult.type) {
      case 'pressure_pattern':
        // Require good variance and naturalness
        if (scores.variance > 0.7 && scores.naturalness > 0.6) {
          adjustment = 1.1;
        }
        break;
      case 'rhythm_test':
        // Require good human timing
        if (scores.humanTiming > 0.7) {
          adjustment = 1.1;
        }
        break;
    }
    
    return Math.min(1.0, average * adjustment);
  }
}

module.exports = new HumanPatternAnalyzer();
