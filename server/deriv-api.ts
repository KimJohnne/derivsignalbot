import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class DerivAPI extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiUrl: string;
  private appId: string;
  private _isConnected: boolean = false;
  private requestsMap: Map<string, any> = new Map();
  private requestIdCounter: number = 1;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  
  // Public getter for connection status
  get isConnected(): boolean {
    return this._isConnected;
  }

  constructor() {
    super();
    this.apiUrl = process.env.DERIV_API_URL || 'wss://ws.binaryws.com/websockets/v3';
    this.appId = process.env.DERIV_APP_ID || '1089'; // Default to app ID 1089 which is for testing
  }

  public async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this._isConnected) {
        resolve(true);
        return;
      }

      this.ws = new WebSocket(`${this.apiUrl}?app_id=${this.appId}`);
      
      this.ws.on('open', () => {
        console.log('Connected to Deriv API');
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.setupPingInterval();
        resolve(true);
      });

      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          this.handleMessage(response);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (!this._isConnected) {
          reject(error);
        }
        this.emit('error', error);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from Deriv API');
        this._isConnected = false;
        this.clearPingInterval();
        this.attemptReconnect();
      });

      // Set a connection timeout
      setTimeout(() => {
        if (!this._isConnected) {
          this.ws?.terminate();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts');
    }
  }

  private setupPingInterval() {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      this.ping().catch(error => {
        console.error('Ping failed:', error);
      });
    }, 30000);
  }

  private clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async ping(): Promise<any> {
    return this.send({ ping: 1 });
  }

  private handleMessage(response: any) {
    // Handle request responses
    if (response.req_id && this.requestsMap.has(response.req_id.toString())) {
      const { resolve, reject } = this.requestsMap.get(response.req_id.toString());
      this.requestsMap.delete(response.req_id.toString());
      
      if (response.error) {
        reject(response.error);
      } else {
        resolve(response);
      }
    }
    
    // Emit events for subscribers
    if (response.msg_type) {
      this.emit(response.msg_type, response);
    }
  }

  public async send(request: any): Promise<any> {
    if (!this._isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const reqId = this.requestIdCounter++;
      request.req_id = reqId;
      
      this.requestsMap.set(reqId.toString(), { resolve, reject });
      
      this.ws?.send(JSON.stringify(request), (error) => {
        if (error) {
          this.requestsMap.delete(reqId.toString());
          reject(error);
        }
      });
    });
  }

  public async getActiveSymbols(): Promise<any> {
    return this.send({ active_symbols: 'brief', product_type: 'basic' });
  }

  public async getTicks(symbol: string): Promise<any> {
    return this.send({ ticks: symbol });
  }

  public async subscribeToTicks(symbol: string): Promise<any> {
    return this.send({ ticks: symbol, subscribe: 1 });
  }

  public async unsubscribeFromTicks(id: string): Promise<any> {
    return this.send({ forget: id });
  }

  public async getTicksHistory(symbol: string, options: any = {}): Promise<any> {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: options.count || 100,
      end: options.end || 'latest',
      start: options.start || 1,
      style: options.style || 'ticks',
    });
  }

  public async getCandlesHistory(symbol: string, options: any = {}): Promise<any> {
    return this.send({
      ticks_history: symbol,
      adjust_start_time: 1,
      count: options.count || 100,
      end: options.end || 'latest',
      start: options.start || 1,
      style: 'candles',
      granularity: options.granularity || 60, // Default to 1 minute candles
    });
  }

  public disconnect(): void {
    this.clearPingInterval();
    if (this._isConnected && this.ws) {
      this.ws.close();
    }
  }
}

// Create a singleton instance
export const derivAPI = new DerivAPI();
