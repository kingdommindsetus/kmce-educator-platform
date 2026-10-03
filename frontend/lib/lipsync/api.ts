/**
 * Lip Sync API Client
 * Handles communication with backend lip sync service
 */

import type { PhonemeFrame, LipSyncConfig } from './core';

export interface ProcessAudioRequest {
  audioPath?: string;
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  config?: LipSyncConfig;
}

export interface ProcessAudioResponse {
  success: boolean;
  frames: PhonemeFrame[];
  metadata: {
    totalDuration: number;
    frameCount: number;
    processingTime: number;
  };
}

export interface ExportAnimationRequest {
  frames: PhonemeFrame[];
  format?: 'json' | 'vrm' | 'gltf';
  characterName?: string;
}

class LipSyncAPI {
  private baseURL: string;

  constructor(baseURL: string = '/api/lipsync') {
    this.baseURL = baseURL;
  }

  /**
   * Process audio file and get phoneme frames
   */
  async processAudio(request: ProcessAudioRequest): Promise<ProcessAudioResponse> {
    const response = await fetch(`${this.baseURL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioPath: request.audioPath,
        audioUrl: request.audioUrl,
        config: request.config
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to process audio: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Process audio with streaming updates
   */
  async *streamProcessAudio(request: ProcessAudioRequest) {
    const response = await fetch(`${this.baseURL}/process-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to process audio: ${response.statusText}`);
    }

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            console.error('Failed to parse streaming data:', e);
          }
        }
      }
    }
  }

  /**
   * Get animation data compatible with 3D models
   */
  async getAnimationData(
    frames: PhonemeFrame[],
    characterType: 'avatar' | 'realistic' | 'cartoon' = 'realistic'
  ) {
    const response = await fetch(`${this.baseURL}/animation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames, characterType })
    });

    if (!response.ok) {
      throw new Error(`Failed to get animation data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Export animation in different formats
   */
  async exportAnimation(request: ExportAnimationRequest) {
    const response = await fetch(`${this.baseURL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to export animation: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    } else {
      return response.blob();
    }
  }

  /**
   * Validate audio file before processing
   */
  async validateAudio(audioPath: string) {
    const response = await fetch(`${this.baseURL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioPath })
    });

    return response.json();
  }

  /**
   * Get processing status for long-running operations
   */
  async getStatus(jobId: string) {
    const response = await fetch(`${this.baseURL}/status/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
let apiInstance: LipSyncAPI | null = null;

export function getLipSyncAPI(baseURL?: string): LipSyncAPI {
  if (!apiInstance) {
    apiInstance = new LipSyncAPI(baseURL);
  }
  return apiInstance;
}

export default LipSyncAPI;
