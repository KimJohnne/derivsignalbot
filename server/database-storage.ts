import { 
  users, 
  volatilityIndexes, 
  signals, 
  strategyPerformance, 
  User, 
  InsertUser, 
  VolatilityIndex, 
  InsertVolatilityIndex, 
  Signal, 
  InsertSignal, 
  StrategyPerformance, 
  InsertStrategyPerformance 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Volatility Index Methods
  async getVolatilityIndexes(): Promise<VolatilityIndex[]> {
    return await db.select().from(volatilityIndexes);
  }

  async getVolatilityIndexById(id: number): Promise<VolatilityIndex | undefined> {
    const [index] = await db.select().from(volatilityIndexes).where(eq(volatilityIndexes.id, id));
    return index || undefined;
  }

  async getVolatilityIndexByName(name: string): Promise<VolatilityIndex | undefined> {
    const [index] = await db.select().from(volatilityIndexes).where(eq(volatilityIndexes.name, name));
    return index || undefined;
  }

  async updateVolatilityIndex(id: number, data: Partial<InsertVolatilityIndex>): Promise<VolatilityIndex | undefined> {
    const [updated] = await db
      .update(volatilityIndexes)
      .set(data)
      .where(eq(volatilityIndexes.id, id))
      .returning();
    return updated || undefined;
  }

  async createVolatilityIndex(insertIndex: InsertVolatilityIndex): Promise<VolatilityIndex> {
    const [index] = await db
      .insert(volatilityIndexes)
      .values(insertIndex)
      .returning();
    return index;
  }

  // Signal Methods
  async getSignals(limit: number = 100): Promise<Signal[]> {
    return await db
      .select()
      .from(signals)
      .orderBy(desc(signals.timestamp))
      .limit(limit);
  }

  async getSignalById(id: number): Promise<Signal | undefined> {
    const [signal] = await db.select().from(signals).where(eq(signals.id, id));
    return signal || undefined;
  }

  async getSignalsByVolatilityIndex(volatilityIndexId: number, limit: number = 100): Promise<Signal[]> {
    return await db
      .select()
      .from(signals)
      .where(eq(signals.volatilityIndexId, volatilityIndexId))
      .orderBy(desc(signals.timestamp))
      .limit(limit);
  }

  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const [signal] = await db
      .insert(signals)
      .values(insertSignal)
      .returning();
    return signal;
  }

  async updateSignal(id: number, data: Partial<InsertSignal>): Promise<Signal | undefined> {
    const [updated] = await db
      .update(signals)
      .set(data)
      .where(eq(signals.id, id))
      .returning();
    return updated || undefined;
  }

  // Strategy Performance Methods
  async getStrategyPerformance(): Promise<StrategyPerformance[]> {
    return await db.select().from(strategyPerformance);
  }

  async getStrategyPerformanceByType(strategyType: string, strategyName: string): Promise<StrategyPerformance | undefined> {
    const [performance] = await db
      .select()
      .from(strategyPerformance)
      .where(
        sql`${strategyPerformance.strategyType} = ${strategyType} AND ${strategyPerformance.strategyName} = ${strategyName}`
      );
    return performance || undefined;
  }

  async createStrategyPerformance(insertPerformance: InsertStrategyPerformance): Promise<StrategyPerformance> {
    const [performance] = await db
      .insert(strategyPerformance)
      .values(insertPerformance)
      .returning();
    return performance;
  }

  async updateStrategyPerformance(id: number, data: Partial<InsertStrategyPerformance>): Promise<StrategyPerformance | undefined> {
    const [updated] = await db
      .update(strategyPerformance)
      .set(data)
      .where(eq(strategyPerformance.id, id))
      .returning();
    return updated || undefined;
  }

  // Initialize the database with default data
  async initializeDefaultData(): Promise<void> {
    // Check if volatility indexes exist
    const existingIndexes = await db.select().from(volatilityIndexes);
    
    if (existingIndexes.length === 0) {
      // Create default volatility indexes
      await db.insert(volatilityIndexes).values([
        {
          name: 'Volatility 10',
          symbol: 'R_10',
          currentPrice: '10000.00',
          percentChange: '0.00%',
          absoluteChange: '0.00',
          lastUpdated: new Date(),
        },
        {
          name: 'Volatility 25',
          symbol: 'R_25',
          currentPrice: '25000.00',
          percentChange: '0.00%',
          absoluteChange: '0.00',
          lastUpdated: new Date(),
        },
        {
          name: 'Volatility 50',
          symbol: 'R_50',
          currentPrice: '50000.00',
          percentChange: '0.00%',
          absoluteChange: '0.00',
          lastUpdated: new Date(),
        },
        {
          name: 'Volatility 75',
          symbol: 'R_75',
          currentPrice: '75000.00',
          percentChange: '0.00%',
          absoluteChange: '0.00',
          lastUpdated: new Date(),
        },
        {
          name: 'Volatility 100',
          symbol: 'R_100',
          currentPrice: '100000.00',
          percentChange: '0.00%',
          absoluteChange: '0.00',
          lastUpdated: new Date(),
        },
      ]);
      
      console.log('Initialized default volatility indexes');
    }
    
    // Check if strategy performance data exists
    const existingPerformance = await db.select().from(strategyPerformance);
    
    if (existingPerformance.length === 0) {
      // Get the volatility indexes to reference their IDs
      const indexes = await db.select().from(volatilityIndexes);
      const indexMap = new Map(indexes.map(index => [index.name, index.id]));
      
      // Create strategy performance data for each index
      const performanceData: InsertStrategyPerformance[] = [];
      
      // Using Array.from to convert the iterator to an array
      Array.from(indexMap.entries()).forEach(([name, id]) => {
        // Even/Odd strategies
        performanceData.push({
          strategyType: 'Digits',
          strategyName: 'Even/Odd',
          volatilityIndexId: id,
          winRate: '62.5%',
          sampleSize: 80,
          lastUpdated: new Date()
        });
        
        // Over/Under strategies
        performanceData.push({
          strategyType: 'Digits',
          strategyName: 'Over/Under',
          volatilityIndexId: id,
          winRate: '58.3%',
          sampleSize: 60,
          lastUpdated: new Date()
        });
        
        // Matches/Differs strategies
        performanceData.push({
          strategyType: 'Digits',
          strategyName: 'Matches/Differs',
          volatilityIndexId: id,
          winRate: '51.2%',
          sampleSize: 40,
          lastUpdated: new Date()
        });
      });
      
      await db.insert(strategyPerformance).values(performanceData);
      console.log('Initialized default strategy performance data');
    }
  }
}