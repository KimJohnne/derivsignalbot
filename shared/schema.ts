import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const volatilityIndexes = pgTable("volatility_indexes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  currentPrice: text("current_price").notNull(),
  highPrice: text("high_price"),
  lowPrice: text("low_price"),
  percentChange: text("percent_change"),
  absoluteChange: text("absolute_change"),
  lastUpdated: timestamp("last_updated").notNull(),
});

// Relations will be defined after all tables are declared

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  volatilityIndexId: integer("volatility_index_id").notNull(),
  volatilityName: text("volatility_name").notNull(),
  strategyType: text("strategy_type").notNull(),
  strategyName: text("strategy_name").notNull(),
  entryPoint: text("entry_point").notNull(),
  predictedSignal: text("predicted_signal").notNull(),
  signalReason: text("signal_reason").notNull(),
  winProbability: text("win_probability").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  emailSent: boolean("email_sent").default(false),
  outcome: text("outcome").default("pending"),
  metadata: jsonb("metadata"),
});

export const strategyPerformance = pgTable("strategy_performance", {
  id: serial("id").primaryKey(),
  strategyType: text("strategy_type").notNull(),
  strategyName: text("strategy_name").notNull(),
  volatilityIndexId: integer("volatility_index_id").notNull(),
  winRate: text("win_rate").notNull(),
  sampleSize: integer("sample_size").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertVolatilityIndexSchema = createInsertSchema(volatilityIndexes).omit({
  id: true,
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
});

export const insertStrategyPerformanceSchema = createInsertSchema(strategyPerformance).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVolatilityIndex = z.infer<typeof insertVolatilityIndexSchema>;
export type VolatilityIndex = typeof volatilityIndexes.$inferSelect;

export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signals.$inferSelect;

export type InsertStrategyPerformance = z.infer<typeof insertStrategyPerformanceSchema>;
export type StrategyPerformance = typeof strategyPerformance.$inferSelect;

// Enums for consistency
export const VolatilityIndexNames = {
  VOL_10: "Volatility 10",
  VOL_25: "Volatility 25",
  VOL_50: "Volatility 50",
  VOL_75: "Volatility 75",
  VOL_100: "Volatility 100",
  VOL_200: "Volatility 200",
} as const;

export const StrategyTypes = {
  DIGITS: "Digits",
  MANUAL: "Manual",
} as const;

export const DigitsStrategies = {
  EVEN_ODD: "Even/Odd",
  OVER_UNDER: "Over/Under",
  MATCHES_DIFFERS: "Matches/Differs",
} as const;

export const ManualStrategies = {
  CANDLESTICK: "Candlestick",
  TREND: "Trend",
  MOMENTUM: "Momentum",
} as const;

export const SignalOutcomes = {
  PENDING: "pending",
  WIN: "win",
  LOSS: "loss",
} as const;

// Define all relations after tables are declared to avoid circular references
export const volatilityIndexesRelations = relations(volatilityIndexes, ({ many }) => ({
  signals: many(signals),
  strategyPerformance: many(strategyPerformance),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  volatilityIndex: one(volatilityIndexes, {
    fields: [signals.volatilityIndexId],
    references: [volatilityIndexes.id],
  }),
}));

export const strategyPerformanceRelations = relations(strategyPerformance, ({ one }) => ({
  volatilityIndex: one(volatilityIndexes, {
    fields: [strategyPerformance.volatilityIndexId],
    references: [volatilityIndexes.id],
  }),
}));
