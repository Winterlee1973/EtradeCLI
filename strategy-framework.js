#!/usr/bin/env node

/**
 * EtradeCLI Strategy Framework
 * Modular architecture for multiple trading strategies
 */

import { SharedTemplates } from './shared-templates.js';

// Base class for all trading strategies
export class TradingStrategy {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.scanResult = null;
  }
  
  // Abstract methods that each strategy must implement
  async scan(params) {
    throw new Error('scan() method must be implemented by strategy');
  }
  
  validateParams(params) {
    throw new Error('validateParams() method must be implemented by strategy');
  }
  
  getDefaultParams() {
    throw new Error('getDefaultParams() method must be implemented by strategy');
  }
  
  // Common methods available to all strategies
  formatForTerminal() {
    return this.scanResult ? this.scanResult.toTerminalString() : 'No scan results available';
  }
  
  formatForSlack() {
    return this.scanResult ? this.scanResult.toSlackBlocks() : { 
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'No scan results available' } }] 
    };
  }
  
  getMetadata() {
    return {
      strategy: this.name,
      description: this.description,
      timestamp: new Date(),
      hasResults: !!this.scanResult
    };
  }
}

// Registry for all available strategies
export class StrategyRegistry {
  constructor() {
    this.strategies = new Map();
  }
  
  register(strategy) {
    this.strategies.set(strategy.name, strategy);
  }
  
  get(name) {
    return this.strategies.get(name);
  }
  
  list() {
    return Array.from(this.strategies.keys());
  }
  
  getAll() {
    return Array.from(this.strategies.values());
  }
}

// Global registry instance
export const registry = new StrategyRegistry();

// Strategy execution context
export class StrategyRunner {
  constructor(strategy) {
    this.strategy = strategy;
    this.executionMode = 'manual'; // manual, scheduled, api
    this.outputFormat = 'terminal'; // terminal, slack, json
  }
  
  setMode(mode) {
    this.executionMode = mode;
    return this;
  }
  
  setOutputFormat(format) {
    this.outputFormat = format;
    return this;
  }
  
  async execute(params) {
    // Validate parameters
    const validatedParams = this.strategy.validateParams(params);
    
    // Set execution context
    if (process.env.AUTO_SCHEDULED === 'true') {
      this.executionMode = 'scheduled';
    }
    
    // Run the strategy
    await this.strategy.scan(validatedParams);
    
    // Return formatted output based on context
    switch (this.outputFormat) {
      case 'slack':
        return this.strategy.formatForSlack();
      case 'json':
        return {
          metadata: this.strategy.getMetadata(),
          results: this.strategy.scanResult
        };
      case 'terminal':
      default:
        return this.strategy.formatForTerminal();
    }
  }
}

// Common result types for strategies
export class ScanResult {
  constructor(strategyName) {
    this.strategyName = strategyName;
    this.timestamp = new Date();
    this.mode = process.env.AUTO_SCHEDULED === 'true' ? 'Auto Scheduled' : 'Manual';
    this.marketData = {};
    this.criteria = {};
    this.opportunities = [];
    this.recommendation = null;
  }
  
  // Abstract methods for formatting
  toTerminalString() {
    throw new Error('toTerminalString() must be implemented by specific result class');
  }
  
  toSlackBlocks() {
    throw new Error('toSlackBlocks() must be implemented by specific result class');
  }
}

// Factory for creating strategy runners
export function createRunner(strategyName, params = {}) {
  const strategy = registry.get(strategyName);
  if (!strategy) {
    throw new Error(`Strategy '${strategyName}' not found. Available: ${registry.list().join(', ')}`);
  }
  
  return new StrategyRunner(strategy);
}

// Utility for command-line integration
export function parseStrategyCommand(args) {
  if (args.length === 0) {
    throw new Error('No strategy specified');
  }
  
  const [strategyName, ...params] = args;
  
  // Map common aliases
  const strategyAliases = {
    'spx': 'spx-deep-premium',
    'sdp': 'spx-deep-premium',
    'q': 'quote',
    'quote': 'quote'
  };
  
  const resolvedStrategy = strategyAliases[strategyName] || strategyName;
  
  return {
    strategy: resolvedStrategy,
    params: params
  };
}