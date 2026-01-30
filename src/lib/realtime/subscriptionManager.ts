/**
 * Realtime Subscription Manager
 * 
 * Ensures only one realtime subscription exists per statementImportId
 * Prevents subscription churn and CHANNEL_ERROR loops
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger, getCorrelationId } from '../logger';

// Track active channels by statementImportId
const activeChannels = new Map<string, RealtimeChannel>();

/**
 * Get active channel for a statement import
 */
export function getActiveChannel(statementImportId: string): RealtimeChannel | undefined {
  return activeChannels.get(statementImportId);
}

/**
 * Register a channel for a statement import
 * If a channel already exists, it will be unsubscribed first
 */
export function registerChannel(
  statementImportId: string,
  channel: RealtimeChannel,
  correlationId?: string
): void {
  const corrId = correlationId || getCorrelationId() || 'unknown';
  
  // Check if channel already exists
  const existingChannel = activeChannels.get(statementImportId);
  if (existingChannel) {
    logger.warn(
      'Realtime:SubscriptionManager',
      'Unsubscribing existing channel before registering new one',
      {
        correlationId: corrId,
        statementImportId,
      },
      corrId
    );
    
    // Unsubscribe existing channel
    try {
      // Get the supabase client from the channel to remove it
      // Note: We need to track the supabase client separately or pass it
      // For now, we'll rely on the channel's unsubscribe method
      if (typeof (existingChannel as any).unsubscribe === 'function') {
        (existingChannel as any).unsubscribe();
      }
    } catch (error) {
      logger.error(
        'Realtime:SubscriptionManager',
        'Error unsubscribing existing channel',
        {
          correlationId: corrId,
          statementImportId,
          error: error instanceof Error ? error.message : String(error),
        },
        corrId
      );
    }
    
    activeChannels.delete(statementImportId);
  }
  
  // Register new channel
  activeChannels.set(statementImportId, channel);
  
  logger.info(
    'Realtime:SubscriptionManager',
    'Channel registered',
    {
      correlationId: corrId,
      statementImportId,
      activeChannelCount: activeChannels.size,
    },
    corrId
  );
}

/**
 * Unregister and unsubscribe a channel
 */
export function unregisterChannel(
  statementImportId: string,
  supabaseClient?: any,
  correlationId?: string
): void {
  const corrId = correlationId || getCorrelationId() || 'unknown';
  const channel = activeChannels.get(statementImportId);
  
  if (!channel) {
    logger.debug(
      'Realtime:SubscriptionManager',
      'No channel found to unregister',
      {
        correlationId: corrId,
        statementImportId,
      },
      corrId
    );
    return;
  }
  
  try {
    // Remove channel from Supabase client
    if (supabaseClient && typeof supabaseClient.removeChannel === 'function') {
      supabaseClient.removeChannel(channel);
    } else if (typeof (channel as any).unsubscribe === 'function') {
      (channel as any).unsubscribe();
    }
    
    activeChannels.delete(statementImportId);
    
    logger.info(
      'Realtime:SubscriptionManager',
      'Channel unregistered',
      {
        correlationId: corrId,
        statementImportId,
        activeChannelCount: activeChannels.size,
      },
      corrId
    );
  } catch (error) {
    logger.error(
      'Realtime:SubscriptionManager',
      'Error unregistering channel',
      {
        correlationId: corrId,
        statementImportId,
        error: error instanceof Error ? error.message : String(error),
      },
      corrId
    );
    
    // Still remove from map even if unsubscribe fails
    activeChannels.delete(statementImportId);
  }
}

/**
 * Check if a channel is already registered
 */
export function hasActiveChannel(statementImportId: string): boolean {
  return activeChannels.has(statementImportId);
}

/**
 * Get all active channel IDs (for debugging)
 */
export function getActiveChannelIds(): string[] {
  return Array.from(activeChannels.keys());
}

/**
 * Clear all channels (for cleanup/testing)
 */
export function clearAllChannels(supabaseClient?: any): void {
  const channelIds = Array.from(activeChannels.keys());
  
  for (const statementImportId of channelIds) {
    unregisterChannel(statementImportId, supabaseClient);
  }
  
  logger.info(
    'Realtime:SubscriptionManager',
    'All channels cleared',
    {
      clearedCount: channelIds.length,
    },
    getCorrelationId() || undefined
  );
}

