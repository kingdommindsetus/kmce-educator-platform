/**
 * Lip Sync Rendering Module
 * Production-grade audio-to-animation system for KMCE Educator Platform
 */

export { LipSyncEngine } from './core';
export type { Phoneme, Viseme, PhonemeFrame, LipSyncConfig } from './core';
export { LipSyncAnimationRenderer } from './AnimationRenderer';
export { useLipSync } from './hooks';
export { getLipSyncAPI } from './api';

import type { Viseme, PhonemeFrame } from './core';

/**
 * High-level interface for lip sync operations
 */
export interface LipSyncService {
  processAudio(audioPath: string): Promise<PhonemeFrame[]>;
  getVisemeAtTime(frames: PhonemeFrame[], time: number): Viseme;
  exportAnimationData(frames: PhonemeFrame[]): string;
}

/**
 * Create a lip sync service instance
 */
export function createLipSyncService(): LipSyncService {
  return {
    async processAudio(audioPath: string) {
      const response = await fetch('/api/lipsync/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioPath })
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);
      const { frames } = await response.json();
      return frames;
    },

    getVisemeAtTime(frames: PhonemeFrame[], time: number) {
      const frame = frames.find(f => f.startTime <= time && time < f.endTime);
      return frame?.viseme ?? 'X';
    },

    exportAnimationData(frames: PhonemeFrame[]) {
      return JSON.stringify({
        format: 'lipsync-v1',
        frames,
        metadata: {
          totalDuration: frames[frames.length - 1]?.endTime ?? 0,
          frameCount: frames.length,
          generatedAt: new Date().toISOString()
        }
      }, null, 2);
    }
  };
}
