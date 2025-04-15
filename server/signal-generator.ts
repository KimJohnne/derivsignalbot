import { EventEmitter } from 'events';
import {
  InsertSignal,
  Signal,
  StrategyPerformance,
  VolatilityIndex
} from '@shared/schema';
import { IStorage } from './storage';
import { derivAPI } from './deriv-api';
import { sendSignalEmail } from './email';

interface PriceHistory {
  symbolDigitHistory: Map<string, number[]>;
  lastDigits: Map<string, number[]>;
}

interface SignalGenerationOptions {
  maxSignals: number;
  intervalMinutes: number;
  entryAfterConsecutiveCount: number;
}

/**
 * Service for generating trading signals based on market data
 */
export class SignalGenerator extends EventEmitter {
  private priceHistory: PriceHistory = {
    symbolDigitHistory: new Map(),
    lastDigits: new Map(),
  };
  private lastSignalTime: Map<string, Date> = new Map();
  private storage: IStorage;
  private options: SignalGenerationOptions = {
    maxSignals: 5,
    intervalMinutes: 5,
    entryAfterConsecutiveCount: 3
  };
  private timers: NodeJS.Timeout[] = [];

  constructor(storage: IStorage) {
    super();
    this.storage = storage;
    
    // Listen for Deriv API tick events
    derivAPI.on('tick', this.handleTick.bind(this));
  }

  /**
   * Update signal generation options
   */
  setOptions(options: Partial<SignalGenerationOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('Signal generator options updated:', this.options);
  }

  /**
   * Get current signal generation options
   */
  getOptions(): SignalGenerationOptions {
    return { ...this.options };
  }

  /**
   * Start signal generation for all volatility indexes
   */
  async start(): Promise<void> {
    // Clear existing timers first
    this.stop();
    
    // Set up interval for signal generation (checking each volatility index)
    const timer = setInterval(async () => {
      try {
        await this.generateSignalsForAllIndexes();
      } catch (error) {
        console.error('Error in signal generation interval:', error);
      }
    }, this.options.intervalMinutes * 60 * 1000);
    
    this.timers.push(timer);
    
    console.log(`Signal generator started with ${this.options.intervalMinutes} minute intervals`);
  }

  /**
   * Stop signal generation
   */
  stop(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    console.log('Signal generator stopped');
  }

  /**
   * Handle price tick from Deriv API
   */
  private handleTick(data: any): void {
    try {
      const symbol = data.tick.symbol;
      const price = data.tick.quote.toString();
      
      // Get last digit of price
      const lastDigit = parseInt(price.charAt(price.length - 1));
      
      // Initialize arrays if they don't exist
      if (!this.priceHistory.lastDigits.has(symbol)) {
        this.priceHistory.lastDigits.set(symbol, []);
      }
      
      // Add to price history
      const digits = this.priceHistory.lastDigits.get(symbol)!;
      digits.push(lastDigit);
      
      // Keep only the last 20 digits
      if (digits.length > 20) {
        digits.shift();
      }
      
      // Update the price history
      this.priceHistory.lastDigits.set(symbol, digits);
    } catch (error) {
      console.error('Error handling tick:', error);
    }
  }

  /**
   * Generate signals for all volatility indexes
   */
  private async generateSignalsForAllIndexes(): Promise<void> {
    try {
      const indexes = await this.storage.getVolatilityIndexes();
      const strategies = await this.storage.getStrategyPerformance();
      
      if (indexes.length === 0) {
        console.log('No volatility indexes found, skipping signal generation');
        return;
      }
      
      // Group strategies by volatility index
      const strategyByIndex = new Map<number, StrategyPerformance[]>();
      
      for (const strategy of strategies) {
        if (!strategyByIndex.has(strategy.volatilityIndexId)) {
          strategyByIndex.set(strategy.volatilityIndexId, []);
        }
        strategyByIndex.get(strategy.volatilityIndexId)!.push(strategy);
      }
      
      // Generate signals for each index with maximum limit
      const signalPromises: Promise<void>[] = [];
      let generatedCount = 0;
      
      for (const index of indexes) {
        // Skip if we've already generated the maximum number of signals
        if (generatedCount >= this.options.maxSignals) break;
        
        // Check if we should generate a signal now based on interval
        const lastSignalTime = this.lastSignalTime.get(index.symbol) || new Date(0);
        const timeElapsed = Date.now() - lastSignalTime.getTime();
        const minInterval = this.options.intervalMinutes * 60 * 1000;
        
        if (timeElapsed < minInterval) {
          continue;  // Not enough time has passed since last signal
        }
        
        // Get strategies for this index
        const indexStrategies = strategyByIndex.get(index.id) || [];
        
        if (indexStrategies.length === 0) {
          console.log(`No strategies found for index ${index.name}, skipping signal generation`);
          continue;
        }
        
        // Find the most profitable strategy
        const bestStrategy = this.findBestStrategy(indexStrategies);
        
        if (!bestStrategy) continue;
        
        // Generate signal
        const promise = this.generateSignalForStrategy(index, bestStrategy)
          .then(created => {
            if (created) {
              generatedCount++;
              this.lastSignalTime.set(index.symbol, new Date());
            }
          })
          .catch(error => {
            console.error(`Error generating signal for ${index.name}:`, error);
          });
        
        signalPromises.push(promise);
      }
      
      await Promise.all(signalPromises);
      
    } catch (error) {
      console.error('Error in signal generation:', error);
    }
  }

  /**
   * Find the best strategy based on win rate
   */
  private findBestStrategy(strategies: StrategyPerformance[]): StrategyPerformance | null {
    if (strategies.length === 0) return null;
    
    // Sort by win rate (descending)
    return strategies.slice().sort((a, b) => {
      const aRate = parseFloat(a.winRate.replace('%', ''));
      const bRate = parseFloat(b.winRate.replace('%', ''));
      return bRate - aRate;
    })[0];
  }

  /**
   * Generate signal for a specific strategy and volatility index
   */
  private async generateSignalForStrategy(
    index: VolatilityIndex,
    strategy: StrategyPerformance
  ): Promise<boolean> {
    try {
      const digits = this.priceHistory.lastDigits.get(index.symbol) || [];
      
      if (digits.length < 5) {
        console.log(`Not enough price history for ${index.name}, need at least 5 digits`);
        return false;
      }
      
      // Analyze history to determine signal
      const result = this.analyzeDigitPattern(digits, strategy);
      
      if (!result) {
        return false;
      }
      
      const { predictedSignal, signalReason, entryPoint, winProbability } = result;
      
      // Create signal
      const signalData: InsertSignal = {
        volatilityIndexId: index.id,
        volatilityName: index.name,
        strategyType: strategy.strategyType,
        strategyName: strategy.strategyName,
        entryPoint: entryPoint,
        predictedSignal: predictedSignal,
        signalReason: signalReason,
        winProbability: winProbability,
        timestamp: new Date(),
        emailSent: false,
        outcome: 'pending'
      };
      
      // Save signal to storage
      const signal = await this.storage.createSignal(signalData);
      
      // Send email notification
      const emailSent = await sendSignalEmail(signal);
      
      // Update signal email status if needed
      if (emailSent) {
        await this.storage.updateSignal(signal.id, { emailSent: true });
      }
      
      // Emit signal event for anyone listening
      this.emit('new_signal', { ...signal, emailSent });
      
      console.log(`Generated new signal for ${index.name} using ${strategy.strategyName} strategy`);
      
      return true;
    } catch (error) {
      console.error(`Error generating signal for ${index.name}:`, error);
      return false;
    }
  }

  /**
   * Analyze digit pattern to determine signal
   */
  private analyzeDigitPattern(
    digits: number[], 
    strategy: StrategyPerformance
  ): { predictedSignal: string; signalReason: string; entryPoint: string; winProbability: string } | null {
    const recentDigits = digits.slice(-10);  // Last 10 digits
    
    // Count even and odd digits
    const evenCount = recentDigits.filter(d => d % 2 === 0).length;
    const oddCount = recentDigits.filter(d => d % 2 === 1).length;
    
    // Count high and low digits
    const highCount = recentDigits.filter(d => d >= 5).length;
    const lowCount = recentDigits.filter(d => d < 5).length;
    
    // Get the last consecutive digits of the same type
    let consecutiveCount = 1;
    let consecutiveType = '';
    
    for (let i = recentDigits.length - 1; i > 0; i--) {
      const current = recentDigits[i];
      const prev = recentDigits[i - 1];
      
      let sameType = false;
      
      if (strategy.strategyName === 'Even/Odd') {
        sameType = (current % 2 === 0 && prev % 2 === 0) || (current % 2 === 1 && prev % 2 === 1);
        consecutiveType = current % 2 === 0 ? 'even' : 'odd';
      } else if (strategy.strategyName === 'Over/Under') {
        sameType = (current >= 5 && prev >= 5) || (current < 5 && prev < 5);
        consecutiveType = current >= 5 ? 'over' : 'under';
      } else {
        // Matches/Differs requires a different approach
        break;
      }
      
      if (sameType) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    // Generate result based on strategy type
    switch (strategy.strategyName) {
      case 'Even/Odd': {
        // Check if we've reached the required number of consecutive digits
        if (consecutiveCount >= this.options.entryAfterConsecutiveCount) {
          const lastDigit = recentDigits[recentDigits.length - 1];
          const isLastEven = lastDigit % 2 === 0;
          
          // After X consecutive even digits, predict an odd (and vice versa)
          const predictedSignal = isLastEven ? 'ODD' : 'EVEN';
          const oppositeType = isLastEven ? 'odd' : 'even';
          
          return {
            predictedSignal,
            signalReason: `After ${consecutiveCount} consecutive ${consecutiveType} digits, probability of an ${oppositeType} digit is higher based on market patterns.`,
            entryPoint: `After ${this.options.entryAfterConsecutiveCount} consecutive ${consecutiveType} digits`,
            winProbability: strategy.winRate
          };
        }
        break;
      }
      
      case 'Over/Under': {
        // Similar logic for Over/Under
        if (consecutiveCount >= this.options.entryAfterConsecutiveCount) {
          const lastDigit = recentDigits[recentDigits.length - 1];
          const isLastHigh = lastDigit >= 5;
          
          const predictedSignal = isLastHigh ? 'UNDER' : 'OVER';
          const oppositeType = isLastHigh ? 'under 5' : 'over 4';
          
          return {
            predictedSignal,
            signalReason: `After ${consecutiveCount} consecutive digits ${consecutiveType} threshold, probability of digit ${oppositeType} is higher based on market patterns.`,
            entryPoint: `After ${this.options.entryAfterConsecutiveCount} consecutive ${consecutiveType}`,
            winProbability: strategy.winRate
          };
        }
        break;
      }
      
      case 'Matches/Differs': {
        // For matches/differs we look at the distribution of recent digits
        const counts = new Array(10).fill(0);
        recentDigits.forEach(digit => counts[digit]++);
        
        // Find most and least frequent digits
        let mostFrequent = 0;
        let leastFrequent = 0;
        
        for (let i = 0; i < counts.length; i++) {
          if (counts[i] > counts[mostFrequent]) mostFrequent = i;
          if (counts[i] < counts[leastFrequent] || counts[leastFrequent] === 0) leastFrequent = i;
        }
        
        // If a digit appeared many times, predict it won't match next time
        if (counts[mostFrequent] >= this.options.entryAfterConsecutiveCount) {
          return {
            predictedSignal: 'DIFFERS',
            signalReason: `Digit ${mostFrequent} has appeared ${counts[mostFrequent]} times recently, indicating statistical reversion.`,
            entryPoint: `When digit ${mostFrequent} appears`,
            winProbability: strategy.winRate
          };
        }
        
        // If a digit hasn't appeared at all, predict it may appear soon
        if (counts[leastFrequent] === 0) {
          return {
            predictedSignal: 'MATCHES',
            signalReason: `Digit ${leastFrequent} hasn't appeared in the last ${recentDigits.length} digits, increasing probability of appearance.`,
            entryPoint: `Next digit matches ${leastFrequent}`,
            winProbability: strategy.winRate
          };
        }
        break;
      }
    }
    
    return null;  // No valid signal generated
  }
}