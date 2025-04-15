import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "./storage";
import { derivAPI } from "./deriv-api";
import { sendSignalEmail, verifyEmailTransport, getLocalEmails } from "./email";
import { SignalGenerator } from "./signal-generator";
import { 
  insertSignalSchema, 
  insertVolatilityIndexSchema, 
  insertStrategyPerformanceSchema,
  VolatilityIndexNames
} from "@shared/schema";

// Utility to format response for validation errors
const handleZodError = (error: z.ZodError) => {
  const validationError = fromZodError(error);
  return {
    message: "Validation error",
    errors: validationError.details,
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // API routes
  const apiRouter = express.Router();
  
  // Initialize the database with default data if using DatabaseStorage
  try {
    if ('initializeDefaultData' in storage) {
      await (storage as any).initializeDefaultData();
      console.log('Database initialized with default data');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
  
  // Initialize signal generator
  const signalGenerator = new SignalGenerator(storage);
  
  // Initialize connections with external services
  try {
    // Connect to Deriv API
    await derivAPI.connect();
    
    // Verify email transport
    await verifyEmailTransport();
    
    // Listen for new signals from the generator and broadcast them
    signalGenerator.on('new_signal', (signal) => {
      broadcast({
        type: 'new_signal',
        data: signal
      });
    });
    
    // Start signal generator with default settings
    await signalGenerator.start();
    
    console.log('Signal generator started with default settings');
  } catch (error) {
    console.error('Failed to initialize external services:', error);
  }

  // Set up broadcast to all clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    // Send initial data to the client
    Promise.all([
      storage.getVolatilityIndexes(),
      storage.getSignals(10),
      storage.getStrategyPerformance()
    ]).then(([indexes, signals, performance]) => {
      ws.send(JSON.stringify({
        type: 'initial_data',
        data: {
          volatilityIndexes: indexes,
          recentSignals: signals,
          strategyPerformance: performance
        }
      }));
    });

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle client requests
        if (data.type === 'subscribe_ticks' && data.symbol) {
          try {
            const response = await derivAPI.subscribeToTicks(data.symbol);
            ws.send(JSON.stringify({
              type: 'subscription_result',
              data: response
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to subscribe to ticks'
            }));
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Subscribe to Deriv API events and broadcast to connected clients
  derivAPI.on('tick', (data) => {
    // Update volatility index data in storage
    const symbol = data.tick.symbol;
    const price = data.tick.quote.toString();
    
    // Find the volatility index by symbol and update it
    storage.getVolatilityIndexes().then(indexes => {
      const index = indexes.find(i => i.symbol === symbol);
      if (index) {
        const currentPrice = parseFloat(index.currentPrice);
        const newPrice = parseFloat(price);
        const absoluteChange = (newPrice - currentPrice).toFixed(2);
        const percentChangeNum = ((newPrice - currentPrice) / currentPrice * 100);
        const percentChange = percentChangeNum.toFixed(2);
        
        // Update the volatility index
        storage.updateVolatilityIndex(index.id, {
          currentPrice: price,
          absoluteChange: absoluteChange,
          percentChange: `${percentChangeNum > 0 ? '+' : ''}${percentChange}%`,
          lastUpdated: new Date()
        }).then(updatedIndex => {
          if (updatedIndex) {
            // Broadcast the updated index to all clients
            broadcast({
              type: 'volatility_update',
              data: updatedIndex
            });
          }
        });
      }
    });
  });

  // Volatility Indexes endpoints
  apiRouter.get('/volatility-indexes', async (req, res) => {
    try {
      const indexes = await storage.getVolatilityIndexes();
      res.json(indexes);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch volatility indexes' });
    }
  });

  apiRouter.get('/volatility-indexes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const index = await storage.getVolatilityIndexById(id);
      if (!index) {
        return res.status(404).json({ message: 'Volatility index not found' });
      }

      res.json(index);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch volatility index' });
    }
  });

  apiRouter.put('/volatility-indexes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const result = insertVolatilityIndexSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(handleZodError(result.error));
      }

      const index = await storage.updateVolatilityIndex(id, result.data);
      if (!index) {
        return res.status(404).json({ message: 'Volatility index not found' });
      }

      res.json(index);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update volatility index' });
    }
  });

  // Signal endpoints
  apiRouter.get('/signals', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const signals = await storage.getSignals(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch signals' });
    }
  });

  apiRouter.get('/signals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const signal = await storage.getSignalById(id);
      if (!signal) {
        return res.status(404).json({ message: 'Signal not found' });
      }

      res.json(signal);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch signal' });
    }
  });

  apiRouter.post('/signals', async (req, res) => {
    try {
      const result = insertSignalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(handleZodError(result.error));
      }

      // Create the signal
      const signal = await storage.createSignal(result.data);
      
      // Send email notification
      const emailSent = await sendSignalEmail(signal);
      
      // Update the signal with email status
      if (emailSent) {
        await storage.updateSignal(signal.id, { emailSent: true });
      }
      
      // Broadcast the new signal to all clients
      broadcast({
        type: 'new_signal',
        data: { ...signal, emailSent }
      });

      res.status(201).json(signal);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create signal' });
    }
  });

  apiRouter.put('/signals/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const result = insertSignalSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(handleZodError(result.error));
      }

      const signal = await storage.updateSignal(id, result.data);
      if (!signal) {
        return res.status(404).json({ message: 'Signal not found' });
      }

      // Broadcast the updated signal to all clients
      broadcast({
        type: 'signal_update',
        data: signal
      });

      res.json(signal);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update signal' });
    }
  });

  // Strategy Performance endpoints
  apiRouter.get('/strategy-performance', async (req, res) => {
    try {
      const performance = await storage.getStrategyPerformance();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch strategy performance' });
    }
  });

  apiRouter.post('/strategy-performance', async (req, res) => {
    try {
      const result = insertStrategyPerformanceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(handleZodError(result.error));
      }

      const performance = await storage.createStrategyPerformance(result.data);
      
      // Broadcast the new performance data to all clients
      broadcast({
        type: 'strategy_performance_update',
        data: performance
      });

      res.status(201).json(performance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create strategy performance' });
    }
  });

  apiRouter.put('/strategy-performance/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid ID' });
      }

      const result = insertStrategyPerformanceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(handleZodError(result.error));
      }

      const performance = await storage.updateStrategyPerformance(id, result.data);
      if (!performance) {
        return res.status(404).json({ message: 'Strategy performance not found' });
      }

      // Broadcast the updated performance data to all clients
      broadcast({
        type: 'strategy_performance_update',
        data: performance
      });

      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update strategy performance' });
    }
  });

  // Market data endpoints
  apiRouter.get('/market/candles/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const granularity = req.query.granularity ? parseInt(req.query.granularity as string) : 60;
      const count = req.query.count ? parseInt(req.query.count as string) : 100;
      
      const response = await derivAPI.getCandlesHistory(symbol, { granularity, count });
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch candles data' });
    }
  });

  apiRouter.get('/market/ticks/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const count = req.query.count ? parseInt(req.query.count as string) : 100;
      
      const response = await derivAPI.getTicksHistory(symbol, { count });
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch ticks data' });
    }
  });

  // Email endpoints
  apiRouter.get('/emails', (req, res) => {
    try {
      const emails = getLocalEmails();
      res.json({
        count: emails.length,
        emails: emails
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch local emails' });
    }
  });
  
  // Project download endpoint
  apiRouter.post('/project/download', async (req, res) => {
    try {
      const { exec } = require('child_process');
      const path = require('path');
      const fs = require('fs');
      const os = require('os');
      
      // Create a temporary directory for the ZIP
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deriv-trading-bot-'));
      const zipFilePath = path.join(tempDir, 'deriv-trading-bot.zip');
      const projectRoot = process.cwd();
      
      // Create a ZIP archive of the project (excluding node_modules, .git, etc.)
      const cmd = `zip -r "${zipFilePath}" . -x "node_modules/*" -x ".git/*" -x ".replit/*" -x "package-lock.json"`;
      
      exec(cmd, { cwd: projectRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error('ZIP creation error:', error);
          return res.status(500).json({ message: 'Failed to create project ZIP file' });
        }
        
        // Create a relative URL for the file
        const downloadUrl = `/api/project/download/file?path=${encodeURIComponent(zipFilePath)}`;
        
        res.json({ 
          message: 'ZIP file created successfully',
          downloadUrl: downloadUrl
        });
      });
    } catch (error) {
      console.error('Project download error:', error);
      res.status(500).json({ message: 'Failed to create project download' });
    }
  });
  
  // Serve the ZIP file for download
  apiRouter.get('/project/download/file', (req, res) => {
    try {
      const zipFilePath = req.query.path as string;
      if (!zipFilePath) {
        return res.status(400).json({ message: 'ZIP file path is required' });
      }
      
      res.download(zipFilePath, 'deriv-trading-bot.zip', (err) => {
        if (err) {
          console.error('Download error:', err);
          return res.status(500).json({ message: 'Failed to download the file' });
        }
        
        // Clean up the file after download
        const fs = require('fs');
        fs.unlink(zipFilePath, (unlinkErr: Error) => {
          if (unlinkErr) {
            console.error('Failed to delete temporary ZIP file:', unlinkErr);
          }
        });
      });
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ message: 'Failed to serve download file' });
    }
  });

  // Signal Generator endpoints
  apiRouter.get('/signal-generator/settings', (req, res) => {
    try {
      const settings = signalGenerator.getOptions();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch signal generator settings' });
    }
  });

  apiRouter.put('/signal-generator/settings', (req, res) => {
    try {
      const settings = req.body;
      
      // Validate settings
      if (settings.maxSignals !== undefined && (isNaN(settings.maxSignals) || settings.maxSignals < 1 || settings.maxSignals > 10)) {
        return res.status(400).json({ message: 'maxSignals must be a number between 1 and 10' });
      }
      
      if (settings.intervalMinutes !== undefined && (isNaN(settings.intervalMinutes) || settings.intervalMinutes < 1 || settings.intervalMinutes > 60)) {
        return res.status(400).json({ message: 'intervalMinutes must be a number between 1 and 60' });
      }
      
      if (settings.entryAfterConsecutiveCount !== undefined && (isNaN(settings.entryAfterConsecutiveCount) || settings.entryAfterConsecutiveCount < 1 || settings.entryAfterConsecutiveCount > 10)) {
        return res.status(400).json({ message: 'entryAfterConsecutiveCount must be a number between 1 and 10' });
      }
      
      // Update settings
      signalGenerator.setOptions(settings);
      
      // Restart signal generator
      signalGenerator.stop();
      signalGenerator.start();
      
      res.json(signalGenerator.getOptions());
    } catch (error) {
      res.status(500).json({ message: 'Failed to update signal generator settings' });
    }
  });
  
  apiRouter.post('/signal-generator/start', (req, res) => {
    try {
      signalGenerator.start();
      res.json({ status: 'started', settings: signalGenerator.getOptions() });
    } catch (error) {
      res.status(500).json({ message: 'Failed to start signal generator' });
    }
  });
  
  apiRouter.post('/signal-generator/stop', (req, res) => {
    try {
      signalGenerator.stop();
      res.json({ status: 'stopped' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to stop signal generator' });
    }
  });

  // Health check endpoint
  apiRouter.get('/health', async (req, res) => {
    const derivConnected = derivAPI.isConnected;
    
    res.json({
      status: 'OK',
      services: {
        derivAPI: derivConnected ? 'connected' : 'disconnected',
        emailService: 'configured', // We're now using local storage so this is always available
        emailTransport: process.env.EMAIL_PASS ? 'smtp_configured' : 'local_only',
        signalGenerator: 'running' // Add signal generator to health check
      },
      timestamp: new Date().toISOString()
    });
  });

  // Register API routes with prefix
  app.use('/api', apiRouter);

  return httpServer;
}
