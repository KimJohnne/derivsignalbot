import { 
  users, type User, type InsertUser,
  volatilityIndexes, type VolatilityIndex, type InsertVolatilityIndex,
  signals, type Signal, type InsertSignal,
  strategyPerformance, type StrategyPerformance, type InsertStrategyPerformance
} from "@shared/schema";

// Import DatabaseStorage
import { DatabaseStorage } from "./database-storage";

export interface IStorage {
  // User Methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Volatility Index Methods
  getVolatilityIndexes(): Promise<VolatilityIndex[]>;
  getVolatilityIndexById(id: number): Promise<VolatilityIndex | undefined>;
  getVolatilityIndexByName(name: string): Promise<VolatilityIndex | undefined>;
  updateVolatilityIndex(id: number, data: Partial<InsertVolatilityIndex>): Promise<VolatilityIndex | undefined>;
  createVolatilityIndex(index: InsertVolatilityIndex): Promise<VolatilityIndex>;

  // Signal Methods
  getSignals(limit?: number): Promise<Signal[]>;
  getSignalById(id: number): Promise<Signal | undefined>;
  getSignalsByVolatilityIndex(volatilityIndexId: number, limit?: number): Promise<Signal[]>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  updateSignal(id: number, data: Partial<InsertSignal>): Promise<Signal | undefined>;

  // Strategy Performance Methods
  getStrategyPerformance(): Promise<StrategyPerformance[]>;
  getStrategyPerformanceByType(strategyType: string, strategyName: string): Promise<StrategyPerformance | undefined>;
  createStrategyPerformance(performance: InsertStrategyPerformance): Promise<StrategyPerformance>;
  updateStrategyPerformance(id: number, data: Partial<InsertStrategyPerformance>): Promise<StrategyPerformance | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private volatilityIndexes: Map<number, VolatilityIndex>;
  private signals: Map<number, Signal>;
  private strategyPerformance: Map<number, StrategyPerformance>;
  
  currentUserId: number;
  currentVolatilityIndexId: number;
  currentSignalId: number;
  currentStrategyPerformanceId: number;

  constructor() {
    this.users = new Map();
    this.volatilityIndexes = new Map();
    this.signals = new Map();
    this.strategyPerformance = new Map();
    
    this.currentUserId = 1;
    this.currentVolatilityIndexId = 1;
    this.currentSignalId = 1;
    this.currentStrategyPerformanceId = 1;
    
    // Initialize with default volatility indexes
    this.initializeVolatilityIndexes();
    this.initializeStrategyPerformance();
  }

  // Initialize with default volatility indexes
  private initializeVolatilityIndexes() {
    const now = new Date();
    
    const defaultVolatilityIndexes: InsertVolatilityIndex[] = [
      { 
        name: "Volatility 10", 
        symbol: "VOL10", 
        currentPrice: "982.45", 
        highPrice: "985.10", 
        lowPrice: "980.20", 
        percentChange: "+0.42%", 
        absoluteChange: "4.15", 
        lastUpdated: now
      },
      { 
        name: "Volatility 25", 
        symbol: "VOL25", 
        currentPrice: "1789.23", 
        highPrice: "1795.60", 
        lowPrice: "1783.15", 
        percentChange: "+0.67%", 
        absoluteChange: "11.95", 
        lastUpdated: now
      },
      { 
        name: "Volatility 50", 
        symbol: "VOL50", 
        currentPrice: "2145.78", 
        highPrice: "2156.92", 
        lowPrice: "2141.30", 
        percentChange: "-0.28%", 
        absoluteChange: "-6.01", 
        lastUpdated: now
      },
      { 
        name: "Volatility 75", 
        symbol: "VOL75", 
        currentPrice: "8724.56", 
        highPrice: "8750.10", 
        lowPrice: "8698.42", 
        percentChange: "+1.02%", 
        absoluteChange: "88.12", 
        lastUpdated: now
      },
      { 
        name: "Volatility 100", 
        symbol: "VOL100", 
        currentPrice: "5462.91", 
        highPrice: "5470.23", 
        lowPrice: "5458.65", 
        percentChange: "+0.18%", 
        absoluteChange: "9.71", 
        lastUpdated: now
      }
    ];
    
    defaultVolatilityIndexes.forEach(index => {
      this.createVolatilityIndex(index);
    });
  }

  // Initialize with default strategy performance
  private initializeStrategyPerformance() {
    const now = new Date();
    
    const defaultStrategyPerformance: InsertStrategyPerformance[] = [
      {
        strategyType: "Digits",
        strategyName: "Even/Odd",
        volatilityIndexId: 4, // Volatility 75
        winRate: "68%",
        sampleSize: 100,
        lastUpdated: now
      },
      {
        strategyType: "Digits",
        strategyName: "Over/Under",
        volatilityIndexId: 4, // Volatility 75
        winRate: "75%",
        sampleSize: 100,
        lastUpdated: now
      },
      {
        strategyType: "Digits",
        strategyName: "Matches/Differs",
        volatilityIndexId: 4, // Volatility 75
        winRate: "62%",
        sampleSize: 100,
        lastUpdated: now
      },
      {
        strategyType: "Manual",
        strategyName: "Candlestick",
        volatilityIndexId: 4, // Volatility 75
        winRate: "70%",
        sampleSize: 100,
        lastUpdated: now
      }
    ];
    
    defaultStrategyPerformance.forEach(performance => {
      this.createStrategyPerformance(performance);
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Volatility Index Methods
  async getVolatilityIndexes(): Promise<VolatilityIndex[]> {
    return Array.from(this.volatilityIndexes.values());
  }

  async getVolatilityIndexById(id: number): Promise<VolatilityIndex | undefined> {
    return this.volatilityIndexes.get(id);
  }

  async getVolatilityIndexByName(name: string): Promise<VolatilityIndex | undefined> {
    return Array.from(this.volatilityIndexes.values()).find(
      (index) => index.name === name,
    );
  }

  async updateVolatilityIndex(id: number, data: Partial<InsertVolatilityIndex>): Promise<VolatilityIndex | undefined> {
    const index = this.volatilityIndexes.get(id);
    if (!index) return undefined;
    
    const updatedIndex = { ...index, ...data };
    this.volatilityIndexes.set(id, updatedIndex);
    
    return updatedIndex;
  }

  async createVolatilityIndex(insertIndex: InsertVolatilityIndex): Promise<VolatilityIndex> {
    const id = this.currentVolatilityIndexId++;
    const index: VolatilityIndex = { ...insertIndex, id };
    this.volatilityIndexes.set(id, index);
    return index;
  }

  // Signal Methods
  async getSignals(limit: number = 100): Promise<Signal[]> {
    const allSignals = Array.from(this.signals.values());
    return allSignals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async getSignalById(id: number): Promise<Signal | undefined> {
    return this.signals.get(id);
  }

  async getSignalsByVolatilityIndex(volatilityIndexId: number, limit: number = 100): Promise<Signal[]> {
    const filteredSignals = Array.from(this.signals.values())
      .filter((signal) => signal.volatilityIndexId === volatilityIndexId);
      
    return filteredSignals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const id = this.currentSignalId++;
    const signal: Signal = { ...insertSignal, id };
    this.signals.set(id, signal);
    return signal;
  }

  async updateSignal(id: number, data: Partial<InsertSignal>): Promise<Signal | undefined> {
    const signal = this.signals.get(id);
    if (!signal) return undefined;
    
    const updatedSignal = { ...signal, ...data };
    this.signals.set(id, updatedSignal);
    
    return updatedSignal;
  }

  // Strategy Performance Methods
  async getStrategyPerformance(): Promise<StrategyPerformance[]> {
    return Array.from(this.strategyPerformance.values());
  }

  async getStrategyPerformanceByType(strategyType: string, strategyName: string): Promise<StrategyPerformance | undefined> {
    return Array.from(this.strategyPerformance.values()).find(
      (performance) => performance.strategyType === strategyType && performance.strategyName === strategyName,
    );
  }

  async createStrategyPerformance(insertPerformance: InsertStrategyPerformance): Promise<StrategyPerformance> {
    const id = this.currentStrategyPerformanceId++;
    const performance: StrategyPerformance = { ...insertPerformance, id };
    this.strategyPerformance.set(id, performance);
    return performance;
  }

  async updateStrategyPerformance(id: number, data: Partial<InsertStrategyPerformance>): Promise<StrategyPerformance | undefined> {
    const performance = this.strategyPerformance.get(id);
    if (!performance) return undefined;
    
    const updatedPerformance = { ...performance, ...data };
    this.strategyPerformance.set(id, updatedPerformance);
    
    return updatedPerformance;
  }
}

// Switch to DatabaseStorage for PostgreSQL persistent storage
// To switch back to in-memory storage, uncomment the line below and comment out the DatabaseStorage line
// export const storage = new MemStorage();

// Create and export an instance of DatabaseStorage
export const storage = new DatabaseStorage();