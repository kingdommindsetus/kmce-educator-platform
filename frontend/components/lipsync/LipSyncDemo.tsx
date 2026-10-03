'use client';

import React, { useState, useRef } from 'react';
import { LipSyncAnimationRenderer } from '@/lib/lipsync/AnimationRenderer';
import { useLipSync, useLipSyncPlayback } from '@/lib/lipsync/hooks';
import { getLipSyncAPI } from '@/lib/lipsync/api';
import type { Viseme, PhonemeFrame } from '@/lib/lipsync/core';

interface LipSyncDemoProps {
  audioUrl?: string;
  characterModel?: 'avatar' | 'realistic' | 'cartoon';
  showDebugInfo?: boolean;
}

/**
 * Complete demo component showcasing lip sync capabilities
 * Perfect for testing and integration
 */
export const LipSyncDemo: React.FC<LipSyncDemoProps> = ({
  audioUrl = '/sample-audio.mp3',
  characterModel = 'realistic',
  showDebugInfo = false
}) => {
  const [currentViseme, setCurrentViseme] = useState<Viseme>('X');
  const [phonemeFrames, setPhonemeFrames] = useState<PhonemeFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<typeof characterModel>(characterModel);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVisemeChange = (viseme: Viseme) => {
    setCurrentViseme(viseme);
  };

  const handleProcessAudio = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const api = getLipSyncAPI();
      const response = await api.processAudio({ audioUrl });

      setPhonemeFrames(response.frames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process audio');
      console.error('Processing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = async () => {
    if (phonemeFrames.length === 0) {
      setError('No frames to export');
      return;
    }

    try {
      const api = getLipSyncAPI();
      const blob = await api.exportAnimation({
        frames: phonemeFrames,
        format: 'json',
        characterName: 'KMCECharacter'
      });

      // Create download link
      const url = URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lipsync-animation.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="lipsync-demo-container" style={styles.container}>
      <h1 style={styles.heading}>KMCE Lip Sync Rendering</h1>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Character Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as any)}
            style={styles.select}
          >
            <option value="realistic">Realistic</option>
            <option value="cartoon">Cartoon</option>
            <option value="avatar">Avatar</option>
          </select>
        </div>

        <button onClick={handleProcessAudio} disabled={isLoading} style={styles.button}>
          {isLoading ? 'Processing...' : 'Process Audio'}
        </button>

        {phonemeFrames.length > 0 && (
          <button onClick={handleExportJSON} style={styles.buttonSecondary}>
            Export as JSON
          </button>
        )}
      </div>

      {/* Error display */}
      {error && <div style={styles.error}>{error}</div>}

      {/* Animation Renderer */}
      <div style={styles.rendererContainer}>
        <LipSyncAnimationRenderer
          audioSource={audioUrl}
          characterModel={selectedModel}
          onVisemeChange={handleVisemeChange}
          width={512}
          height={512}
        />
      </div>

      {/* Statistics */}
      {phonemeFrames.length > 0 && (
        <div style={styles.stats}>
          <h3 style={styles.statsTitle}>Animation Data</h3>
          <div style={styles.statGrid}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Total Frames:</span>
              <span style={styles.statValue}>{phonemeFrames.length}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Duration:</span>
              <span style={styles.statValue}>
                {(phonemeFrames[phonemeFrames.length - 1]?.endTime ?? 0).toFixed(2)}s
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Current Viseme:</span>
              <span style={styles.statValue}>{currentViseme}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Unique Visemes:</span>
              <span style={styles.statValue}>
                {new Set(phonemeFrames.map(f => f.viseme)).size}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {showDebugInfo && phonemeFrames.length > 0 && (
        <div style={styles.debugInfo}>
          <h3 style={styles.debugTitle}>Frame Data (First 10)</h3>
          <div style={styles.frameList}>
            {phonemeFrames.slice(0, 10).map((frame, idx) => (
              <div key={idx} style={styles.frameItem}>
                <span>{idx}:</span>
                <span>{frame.viseme}</span>
                <span>{frame.phoneme}</span>
                <span>{frame.confidence.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Inline styles for demo
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
    borderRadius: '12px'
  },
  heading: {
    fontSize: '28px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#1f2937'
  },
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  controlGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    cursor: 'pointer'
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  buttonSecondary: {
    padding: '10px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  rendererContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px'
  },
  stats: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb'
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#1f2937'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },
  debugInfo: {
    backgroundColor: '#f3f4f6',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginTop: '16px'
  },
  debugTitle: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#374151'
  },
  frameList: {
    fontFamily: 'monospace',
    fontSize: '11px',
    lineHeight: '1.6'
  },
  frameItem: {
    display: 'flex',
    gap: '16px',
    padding: '4px',
    borderBottom: '1px solid #e5e7eb',
    color: '#4b5563'
  }
};

export default LipSyncDemo;
