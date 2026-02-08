import type { NetWorthHistoryRepository } from './repo';
import type { NetWorthPoint } from '@/features/dashboard/hooks/useNetWorthHistory';
import { v4 as uuidv4 } from 'uuid';

/**
 * Simulate API delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Random delay between 50-200ms for realistic simulation
 */
const randomDelay = () => delay(Math.floor(Math.random() * 150) + 50);

/**
 * Mock entity type matching database structure
 */
interface MockNetWorthHistoryEntity {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  created_at: string;
  updated_at: string;
}

// In-memory data store (no auto-seeding)
// Use global object to persist across Vite HMR module reloads
const GLOBAL_STORAGE_KEY = '__coinbag_mock_net_worth_history__';
declare global {
  interface Window {
    [GLOBAL_STORAGE_KEY]?: MockNetWorthHistoryEntity[];
  }
}

// Initialize or restore history array from global storage
let history: MockNetWorthHistoryEntity[] = [];
if (typeof window !== 'undefined') {
  const windowStorageData = window[GLOBAL_STORAGE_KEY];
  
  if (windowStorageData !== undefined && windowStorageData !== null && Array.isArray(windowStorageData)) {
    try {
      const restored = JSON.parse(JSON.stringify(windowStorageData));
      history = restored;
      window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(restored));
    } catch (e) {
      console.error('Failed to restore net worth history from window storage:', e);
      history = [];
    }
  } else if (windowStorageData === undefined) {
    window[GLOBAL_STORAGE_KEY] = [];
    history = [];
  } else {
    console.warn('Window storage exists but is invalid type:', typeof windowStorageData);
    history = [];
  }
}

/**
 * Helper function to seed mock history (for tests only)
 */
export function seedMockNetWorthHistory(hist: MockNetWorthHistoryEntity[]): void {
  history = [...hist];
  if (typeof window !== 'undefined') {
    window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(history));
  }
}

/**
 * Helper function to clear mock history (for tests)
 */
export function clearMockNetWorthHistory(): void {
  history = [];
  if (typeof window !== 'undefined') {
    window[GLOBAL_STORAGE_KEY] = [];
  }
}

/**
 * Mock implementation of NetWorthHistoryRepository
 */
export class MockNetWorthHistoryRepository implements NetWorthHistoryRepository {
  async list(
    _getToken?: () => Promise<string | null>,
    startDate?: string,
    endDate?: string
  ) {
    await randomDelay();
    
    let filtered = [...history];
    
    // Filter by date range if provided
    if (startDate) {
      filtered = filtered.filter((h) => h.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((h) => h.date <= endDate);
    }
    
    // Sort by date ascending
    filtered.sort((a, b) => a.date.localeCompare(b.date));
    
    // Map to NetWorthPoint
    const points: NetWorthPoint[] = filtered.map((h) => ({
      date: h.date,
      value: h.net_worth,
    }));
    
    return {
      data: points,
      error: undefined,
    };
  }

  async createSnapshot(
    _getToken: () => Promise<string | null>,
    date: string,
    netWorth: number,
    totalAssets: number,
    totalLiabilities: number
  ) {
    await randomDelay();
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        error: {
          error: 'Date must be in YYYY-MM-DD format',
          code: 'VALIDATION_ERROR',
        },
      };
    }
    
    // Check if snapshot already exists
    const existingIndex = history.findIndex((h) => h.date === date);
    const now = new Date().toISOString();
    
    if (existingIndex >= 0) {
      // Update existing snapshot
      const existing = history[existingIndex]!;
      history[existingIndex] = {
        id: existing.id,
        user_id: existing.user_id,
        date: existing.date,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        created_at: existing.created_at,
        updated_at: now,
      };
    } else {
      // Create new snapshot
      const newSnapshot: MockNetWorthHistoryEntity = {
        id: uuidv4(),
        user_id: 'mock-user-id',
        date,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        created_at: now,
        updated_at: now,
      };
      history.push(newSnapshot);
    }
    
    // Sync to global storage
    if (typeof window !== 'undefined') {
      window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(history));
    }
    
    // Find the created/updated snapshot
    const snapshot = history.find((h) => h.date === date);
    
    if (!snapshot) {
      return {
        error: {
          error: 'Failed to create snapshot',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
    
    return {
      data: {
        id: snapshot.id,
        date: snapshot.date,
        net_worth: snapshot.net_worth,
        total_assets: snapshot.total_assets,
        total_liabilities: snapshot.total_liabilities,
      },
    };
  }
}
