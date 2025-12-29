import type { Asset } from '@/types/domain';
import type { AssetsRepository } from './repo';
import { v4 as uuidv4 } from 'uuid';
import { logger, getCorrelationId } from '@/lib/logger';

/**
 * Simulate API delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Random delay between 50-200ms for realistic simulation
 */
const randomDelay = () => delay(Math.floor(Math.random() * 150) + 50);

// In-memory data store (no auto-seeding)
// Use global object to persist across Vite HMR module reloads
const GLOBAL_STORAGE_KEY = '__coinbag_mock_assets__';
declare global {
  interface Window {
    [GLOBAL_STORAGE_KEY]?: Asset[];
  }
}

// Initialize or restore assets array from global storage
// CRITICAL: This code runs on every module reload (HMR). We must NEVER lose user data.
// Always create a copy to avoid reference issues
let assets: Asset[] = [];
if (typeof window !== 'undefined') {
  const windowStorageData = window[GLOBAL_STORAGE_KEY];
  
  // PRIME DIRECTIVE: Never delete user data. Only restore or initialize if truly empty.
  if (windowStorageData !== undefined && windowStorageData !== null && Array.isArray(windowStorageData)) {
    // Window storage exists and is a valid array - RESTORE IT
    // Restore even if empty array - empty is a valid state that user may have created
    try {
      const restored = JSON.parse(JSON.stringify(windowStorageData));
      assets = restored;
      // Ensure window storage is synced (defensive - re-sync to ensure consistency)
      window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(restored));
    } catch (e) {
      // JSON parsing failed - this should never happen with valid data
      // Log error but preserve window storage as-is (don't overwrite)
      console.error('Failed to restore assets from window storage:', e, 'Preserving window storage as-is');
      // Don't set assets = [] here - leave it as [] from initialization
      // Don't overwrite window storage - preserve whatever was there
    }
  } else if (windowStorageData === undefined) {
    // Window storage doesn't exist - initialize with empty array
    // This is safe because there's no existing data to lose
    window[GLOBAL_STORAGE_KEY] = [];
    assets = [];
  } else {
    // Window storage exists but is null or invalid type
    // PRIME DIRECTIVE: Don't overwrite - preserve it (might be set by something else)
    // Just leave assets as [] - don't touch window storage
    console.warn('Window storage exists but is invalid type:', typeof windowStorageData, 'Preserving as-is');
    assets = [];
  }
}

/**
 * Helper function to seed mock assets (for tests only)
 */
export function seedMockAssets(assts: Asset[]): void {
  assets = [...assts];
  // Sync to global storage for HMR persistence (store a deep copy)
  if (typeof window !== 'undefined') {
    window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(assets));
  }
}

/**
 * Helper function to clear mock assets (for tests)
 */
export function clearMockAssets(): void {
  assets = [];
  // Sync to global storage for HMR persistence
  if (typeof window !== 'undefined') {
    window[GLOBAL_STORAGE_KEY] = [];
  }
}

/**
 * Mock implementation of AssetsRepository
 */
export class MockAssetsRepository implements AssetsRepository {
  async list(_getToken?: () => Promise<string | null>) {
    await randomDelay();
    return {
      data: [...assets],
      error: undefined,
    };
  }

  async get(id: string, _getToken?: () => Promise<string | null>) {
    await randomDelay();
    const asset = assets.find((a) => a.id === id);
    if (!asset) {
      return {
        error: {
          error: 'Asset not found.',
          code: 'NOT_FOUND',
        },
      };
    }
    return { data: asset };
  }

  async create(input: Omit<Asset, 'id'>, _getToken?: () => Promise<string | null>) {
    const assetsBefore = assets.map(a => ({id: a.id, name: a.name, type: a.type}));
    const correlationId = getCorrelationId();
    
    logger.info(
      'DB:ASSET_INSERT',
      'MockAssetsRepository.create called',
      {
        inputType: input.type,
        inputName: input.name,
        inputValue: input.value,
        assetsBeforeCount: assets.length,
        assetsBefore: assetsBefore,
        repoType: 'MockAssetsRepository',
      },
      correlationId || undefined
    );

    await randomDelay();

    const newAsset: Asset = {
      id: uuidv4(),
      ...input,
    };

    assets.push(newAsset);
    
    logger.info(
      'DB:ASSET_INSERT',
      'Asset added to in-memory array',
      {
        newAssetId: newAsset.id,
        newAssetName: newAsset.name,
        newAssetType: newAsset.type,
        assetsAfterCount: assets.length,
        operation: 'push', // Confirms additive operation
      },
      correlationId || undefined
    );
    // CRITICAL: Sync to global storage IMMEDIATELY after modifying assets
    // This ensures data persists across HMR module reloads
    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.parse(JSON.stringify(assets));
        window[GLOBAL_STORAGE_KEY] = serialized;
        // Verify sync succeeded
        if (!Array.isArray(window[GLOBAL_STORAGE_KEY]) || window[GLOBAL_STORAGE_KEY].length !== assets.length) {
          console.error('Window storage sync failed! Expected', assets.length, 'assets but got', window[GLOBAL_STORAGE_KEY]?.length || 0);
          // Retry sync
          window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(assets));
        }
      } catch (e) {
        console.error('Failed to sync assets to window storage:', e);
        // Don't throw - asset was created successfully, just sync failed
      }
    }
    return { data: newAsset };
  }

  async update(id: string, input: Partial<Omit<Asset, 'id'>>, _getToken?: () => Promise<string | null>) {
    await randomDelay();

    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      return {
        error: {
          error: 'Asset not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const existing = assets[index];
    if (!existing) {
      return {
        error: {
          error: 'Asset not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    const updated: Asset = {
      id: existing.id,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      value: input.value ?? existing.value,
      change1D: input.change1D ?? existing.change1D,
      change1W: input.change1W ?? existing.change1W,
      dateAdded: input.dateAdded ?? existing.dateAdded,
      institution: input.institution ?? existing.institution,
      notes: input.notes ?? existing.notes,
    };

    assets[index] = updated;
    // Sync to global storage for HMR persistence (store a deep copy)
    if (typeof window !== 'undefined') {
      window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(assets));
    }
    return { data: updated };
  }

  async remove(id: string, _getToken?: () => Promise<string | null>) {
    const correlationId = getCorrelationId();
    const assetsBefore = assets.map(a => ({id: a.id, name: a.name, type: a.type}));
    const assetToDelete = assets.find(a => a.id === id);
    
    logger.warn(
      'DB:ASSET_DELETE',
      'MockAssetsRepository.remove called',
      {
        assetId: id,
        assetName: assetToDelete?.name,
        assetType: assetToDelete?.type,
        assetsBeforeCount: assets.length,
        assetsBefore: assetsBefore,
        repoType: 'MockAssetsRepository',
      },
      correlationId || undefined
    );

    await randomDelay();

    const index = assets.findIndex((a) => a.id === id);
    if (index === -1) {
      logger.error(
        'DB:ASSET_DELETE',
        'Asset not found for deletion',
        { assetId: id },
        correlationId || undefined
      );
      return {
        error: {
          error: 'Asset not found.',
          code: 'NOT_FOUND',
        },
      };
    }

    assets.splice(index, 1);
    
    logger.warn(
      'DB:ASSET_DELETE',
      'Asset removed from in-memory array',
      {
        assetId: id,
        assetsAfterCount: assets.length,
        operation: 'splice', // Confirms deletion operation
      },
      correlationId || undefined
    );
    // Sync to global storage for HMR persistence (store a deep copy)
    if (typeof window !== 'undefined') {
      window[GLOBAL_STORAGE_KEY] = JSON.parse(JSON.stringify(assets));
    }
    return {};
  }
}
