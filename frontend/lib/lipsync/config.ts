/**
 * Lip Sync Configuration
 * Centralized configuration for the lip sync rendering system
 */

export interface LipSyncConfig {
  // Audio processing
  audioSampleRate: number;
  targetFrameRate: number;
  smoothingWindow: number;
  confidenceThreshold: number;

  // Animation rendering
  animationDuration: number;
  interpolationMethod: 'linear' | 'easeInOut' | 'cubic';

  // Character models
  characterModels: {
    realistic: CharacterModelConfig;
    cartoon: CharacterModelConfig;
    avatar: CharacterModelConfig;
  };

  // Performance
  enableGPUAcceleration: boolean;
  maxFrameBuffer: number;
  cachePhonemeDuration: number;

  // API configuration
  apiBaseURL: string;
  processTimeout: number;
  retryAttempts: number;
}

export interface CharacterModelConfig {
  width: number;
  height: number;
  faceRadius: number;
  mouthShape: 'oval' | 'wide' | 'narrow';
  eyeStyle: 'realistic' | 'cartoon' | 'expressive';
  blendShapeScaling: Record<string, number>;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: LipSyncConfig = {
  // Audio processing
  audioSampleRate: 16000,
  targetFrameRate: 30,
  smoothingWindow: 3,
  confidenceThreshold: 0.3,

  // Animation rendering
  animationDuration: 0.033, // 1/30 second
  interpolationMethod: 'easeInOut',

  // Character models
  characterModels: {
    realistic: {
      width: 512,
      height: 512,
      faceRadius: 180,
      mouthShape: 'oval',
      eyeStyle: 'realistic',
      blendShapeScaling: {
        jawOpen: 1.0,
        mouthStretch: 1.2,
        mouthClose: 0.8,
        mouthRound: 1.1,
        tongueTip: 0.9,
        lipCornerIn: 1.0,
        lipCornerOut: 1.0
      }
    },
    cartoon: {
      width: 512,
      height: 512,
      faceRadius: 200,
      mouthShape: 'wide',
      eyeStyle: 'expressive',
      blendShapeScaling: {
        jawOpen: 1.3,
        mouthStretch: 1.5,
        mouthClose: 0.6,
        mouthRound: 1.4,
        tongueTip: 0.8,
        lipCornerIn: 0.8,
        lipCornerOut: 1.2
      }
    },
    avatar: {
      width: 512,
      height: 512,
      faceRadius: 190,
      mouthShape: 'narrow',
      eyeStyle: 'expressive',
      blendShapeScaling: {
        jawOpen: 1.1,
        mouthStretch: 1.0,
        mouthClose: 1.0,
        mouthRound: 1.2,
        tongueTip: 0.7,
        lipCornerIn: 1.0,
        lipCornerOut: 0.9
      }
    }
  },

  // Performance
  enableGPUAcceleration: true,
  maxFrameBuffer: 10000,
  cachePhonemeDuration: 3600000, // 1 hour

  // API configuration
  apiBaseURL: '/api/lipsync',
  processTimeout: 30000, // 30 seconds
  retryAttempts: 3
};

/**
 * Performance presets
 */
export const PRESETS = {
  quality: {
    targetFrameRate: 60,
    smoothingWindow: 5,
    confidenceThreshold: 0.2
  },
  balanced: {
    targetFrameRate: 30,
    smoothingWindow: 3,
    confidenceThreshold: 0.3
  },
  performance: {
    targetFrameRate: 24,
    smoothingWindow: 2,
    confidenceThreshold: 0.5
  },
  lowPower: {
    targetFrameRate: 15,
    smoothingWindow: 1,
    confidenceThreshold: 0.6
  }
} as const;

export type PresetName = keyof typeof PRESETS;

/**
 * Get preset configuration
 */
export function getPreset(name: PresetName): Partial<LipSyncConfig> {
  return PRESETS[name];
}

/**
 * Merge configurations
 */
export function mergeConfig(
  base: LipSyncConfig,
  overrides: Partial<LipSyncConfig>
): LipSyncConfig {
  return {
    ...base,
    ...overrides,
    characterModels: {
      ...base.characterModels,
      ...(overrides.characterModels || {})
    }
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: LipSyncConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.audioSampleRate < 8000 || config.audioSampleRate > 48000) {
    errors.push('audioSampleRate must be between 8000 and 48000');
  }

  if (config.targetFrameRate < 1 || config.targetFrameRate > 120) {
    errors.push('targetFrameRate must be between 1 and 120');
  }

  if (config.smoothingWindow < 1) {
    errors.push('smoothingWindow must be at least 1');
  }

  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push('confidenceThreshold must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Configuration context for React
 */
export interface LipSyncContextType {
  config: LipSyncConfig;
  updateConfig: (overrides: Partial<LipSyncConfig>) => void;
  applyPreset: (preset: PresetName) => void;
}

export const createDefaultContext = (): LipSyncContextType => ({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  applyPreset: () => {}
});
