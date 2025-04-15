import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format decimal number with specified precision
export function formatNumber(value: number | string, precision: number = 2): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return numValue.toFixed(precision);
}

// Format change numbers (add + sign for positive values)
export function formatChange(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return numValue > 0 ? `+${numValue.toFixed(2)}` : numValue.toFixed(2);
}

// Format timestamp to local time string
export function formatTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

// Format timestamp to East African Time (EAT)
export function formatEATime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Create API URL with query parameters
export function createApiUrl(path: string, params: Record<string, string | number | boolean> = {}): string {
  const url = new URL(`/api${path}`, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  return url.toString();
}

// Extract colors from CSS variables
export function getCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Determine if a percentage change is positive, negative, or neutral
export type ChangeDirection = 'positive' | 'negative' | 'neutral';

export function getChangeDirection(value: string | number): ChangeDirection {
  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace('%', '').replace('+', '')) 
    : value;
    
  if (numValue > 0) return 'positive';
  if (numValue < 0) return 'negative';
  return 'neutral';
}

// Build a WebSocket URL based on current location
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
