#!/usr/bin/env node

/**
 * Safety Assessment System for SPX Options Trading
 * Time-adjusted risk assessment based on distance and DTE
 */

export const SafetyAssessment = {
  // Base safety thresholds for 0DTE and 1DTE
  baseThresholds: {
    0: { // 0DTE (today)
      verySafe: 300,
      safe: 250, 
      moderate: 150,
      risky: 0
    },
    1: { // 1DTE (tomorrow)
      verySafe: 550,
      safe: 450,
      moderate: 300,
      risky: 0
    }
  },

  /**
   * Calculate safety level for any DTE
   * @param {number} distance - Points away from current SPX price
   * @param {number} dte - Days to expiration (0, 1, 2, etc.)
   * @returns {object} - {level: string, emoji: string, description: string}
   */
  calculateSafety: function(distance, dte) {
    const thresholds = this.getThresholdsForDTE(dte);
    
    if (distance >= thresholds.verySafe) {
      return { level: 'Very Safe', emoji: '🟢🟢', description: 'Very Safe' };
    } else if (distance >= thresholds.safe) {
      return { level: 'Safe', emoji: '🟢', description: 'Safe' };
    } else if (distance >= thresholds.moderate) {
      return { level: 'Moderate', emoji: '🟡', description: 'Moderate' };
    } else if (distance >= thresholds.risky) {
      return { level: 'Risky', emoji: '🔴', description: 'Risky' };
    } else if (distance >= thresholds.veryRisky) {
      return { level: 'Very Risky', emoji: '🔴🔴', description: 'Very Risky' };
    } else {
      return { level: 'Ultra Risky', emoji: '🔴🔴🔴', description: 'Ultra Risky' };
    }
  },

  /**
   * Get thresholds for a specific DTE using formula
   * @param {number} dte - Days to expiration
   * @returns {object} - Threshold object with all safety levels
   */
  getThresholdsForDTE: function(dte) {
    // For 0DTE and 1DTE, use base thresholds
    if (dte === 0 || dte === 1) {
      const base = this.baseThresholds[dte];
      return {
        ultraRisky: 0,
        veryRisky: Math.floor(base.moderate / 3),
        risky: Math.floor(base.moderate * 2 / 3), 
        moderate: base.moderate,
        safe: base.safe,
        verySafe: base.verySafe
      };
    }
    
    // For DTE > 1, use diminishing distance formula
    // Formula: Base + (DTE^0.75) × Scale Factor
    const scaleFactor = 150; // Adjust this to fine-tune the curve
    const exponent = 0.75; // Creates diminishing returns
    
    const verySafe = Math.floor(550 + Math.pow(dte - 1, exponent) * scaleFactor);
    const safe = Math.floor(verySafe * 0.82); // ~82% of very safe
    const moderate = Math.floor(verySafe * 0.55); // ~55% of very safe  
    const risky = Math.floor(verySafe * 0.42); // ~42% of very safe
    const veryRisky = Math.floor(verySafe * 0.25); // ~25% of very safe
    
    return {
      ultraRisky: 0,
      veryRisky: veryRisky,
      risky: risky,
      moderate: moderate,
      safe: safe,
      verySafe: verySafe
    };
  },

  /**
   * Get required distance for a specific safety level and DTE
   * @param {string} safetyLevel - 'verySafe', 'safe', 'moderate', 'risky'
   * @param {number} dte - Days to expiration
   * @returns {number} - Required distance in points
   */
  getRequiredDistance: function(safetyLevel, dte) {
    if (dte === 0 || dte === 1) {
      return this.baseThresholds[dte][safetyLevel];
    }
    
    // TODO: Implement formula for DTE > 1
    return this.baseThresholds[1][safetyLevel];
  }
};