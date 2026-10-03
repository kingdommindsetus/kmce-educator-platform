'use client';

import React, { useEffect, useRef, useState } from 'react';
import LipSyncEngine, { PhonemeFrame, Viseme } from './core';

interface AnimationRendererProps {
  audioSource: HTMLAudioElement | string;
  characterModel?: 'avatar' | 'realistic' | 'cartoon';
  onVisemeChange?: (viseme: Viseme) => void;
  className?: string;
  width?: number;
  height?: number;
}

// Blend shape weights for each viseme (mouth deformation targets)
const VISEME_BLEND_SHAPES: Record<Viseme, Record<string, number>> = {
  'A': { jawOpen: 0.5, mouthStretch: 0.3, lipCornerOut: 0.2 },
  'B': { jawOpen: 0.1, mouthClose: 0.8, lipCornerIn: 0.6 },
  'C': { jawOpen: 0.3, mouthRound: 0.7, lipCornerIn: 0.4 },
  'D': { jawOpen: 0.4, mouthSharp: 0.5, tongueTip: 0.6 },
  'E': { jawOpen: 0.2, mouthStretch: 0.9, lipCornerOut: 0.8 },
  'F': { jawOpen: 0.2, mouthRound: 0.4, lowerLipIn: 0.7 },
  'G': { jawOpen: 0.3, mouthRound: 0.3, backTongue: 0.6 },
  'H': { jawOpen: 0.1, mouthOpen: 0.2, tongueOut: 0.3 },
  'X': { jawOpen: 0, mouthClose: 0.2, lipCornerRelax: 1.0 }
};

export const LipSyncAnimationRenderer: React.FC<AnimationRendererProps> = ({
  audioSource,
  characterModel = 'realistic',
  onVisemeChange,
  className = '',
  width = 512,
  height = 512
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<LipSyncEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentViseme, setCurrentViseme] = useState<Viseme>('X');
  const [error, setError] = useState<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof audioSource === 'string') {
      const audio = new Audio(audioSource);
      audioRef.current = audio;
    } else {
      audioRef.current = audioSource;
    }

    return () => {
      if (audioRef.current && typeof audioSource === 'string') {
        audioRef.current.pause();
      }
    };
  }, [audioSource]);

  // Process audio and start animation
  useEffect(() => {
    const startAnimation = async () => {
      if (!audioRef.current || !canvasRef.current) return;

      try {
        setIsProcessing(true);
        setError(null);

        // Create audio context and get audio data
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        // Load audio file
        const response = await fetch(
          typeof audioSource === 'string' ? audioSource : audioRef.current.src
        );
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Extract mono audio
        const rawData = audioBuffer.getChannelData(0);

        // Initialize lip sync engine
        engineRef.current = new LipSyncEngine({
          targetFrameRate: 30,
          smoothingWindow: 3,
          confidenceThreshold: 0.3,
          audioSampleRate: audioBuffer.sampleRate
        });

        // Process audio
        await engineRef.current.processAudio(rawData);

        // Start animation loop
        animateFrame(audioRef.current);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process audio');
        console.error('Lip sync error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    const animateFrame = (audio: HTMLAudioElement) => {
      if (!engineRef.current || !canvasRef.current) return;

      const render = () => {
        const currentTime = audio.currentTime;
        const viseme = engineRef.current!.getVisemeAtTime(currentTime);
        const interpolatedValue = engineRef.current!.getInterpolatedVisemeValue(currentTime);

        if (viseme !== currentViseme) {
          setCurrentViseme(viseme);
          onVisemeChange?.(viseme);
        }

        renderViseme(canvasRef.current!, viseme, interpolatedValue, characterModel);
        animationFrameRef.current = requestAnimationFrame(render);
      };

      audio.play();
      render();
    };

    startAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioSource, characterModel, currentViseme, onVisemeChange]);

  return (
    <div className={`lipsync-container ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="lipsync-canvas"
        style={{ border: '2px solid #ccc', borderRadius: '8px' }}
      />
      {isProcessing && <div className="lipsync-status">Processing audio...</div>}
      {error && <div className="lipsync-error">{error}</div>}
      <div className="lipsync-debug" style={{ fontSize: '12px', marginTop: '8px' }}>
        Current Viseme: <strong>{currentViseme}</strong>
      </div>
    </div>
  );
};

/**
 * Render mouth animation on canvas
 */
function renderViseme(
  canvas: HTMLCanvasElement,
  viseme: Viseme,
  intensity: number,
  model: 'avatar' | 'realistic' | 'cartoon'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f0e6d2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw face
  drawFace(ctx, centerX, centerY, canvas.width * 0.4);

  // Get blend shapes for current viseme
  const blendShapes = VISEME_BLEND_SHAPES[viseme];

  // Draw mouth with animation
  drawMouth(
    ctx,
    centerX,
    centerY,
    viseme,
    blendShapes,
    intensity,
    model
  );

  // Draw eyes
  drawEyes(ctx, centerX, centerY, canvas.width * 0.35);
}

function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.fillStyle = '#fdb957';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4a574';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawEyes(ctx: CanvasRenderingContext2D, x: number, y: number, faceRadius: number) {
  const eyeY = y - faceRadius * 0.3;
  const leftEyeX = x - faceRadius * 0.25;
  const rightEyeX = x + faceRadius * 0.25;

  [leftEyeX, rightEyeX].forEach(eyeX => {
    // Eye white
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, faceRadius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, faceRadius * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  viseme: Viseme,
  blendShapes: Record<string, number>,
  intensity: number,
  model: 'avatar' | 'realistic' | 'cartoon'
) {
  const mouthY = y + 40;
  const jawOpen = (blendShapes.jawOpen || 0) * intensity;
  const mouthStretch = (blendShapes.mouthStretch || 0) * intensity;
  const mouthRound = (blendShapes.mouthRound || 0) * intensity;

  if (model === 'realistic') {
    drawRealisticMouth(ctx, x, mouthY, jawOpen, mouthStretch, mouthRound);
  } else if (model === 'cartoon') {
    drawCartoonMouth(ctx, x, mouthY, jawOpen, mouthStretch, mouthRound);
  } else {
    drawAvatarMouth(ctx, x, mouthY, jawOpen, mouthStretch, mouthRound);
  }
}

function drawRealisticMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  jawOpen: number,
  mouthStretch: number,
  mouthRound: number
) {
  const width = 60 + mouthStretch * 20;
  const height = 20 + jawOpen * 30;

  ctx.strokeStyle = '#8b4545';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#cd5c5c';

  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lips
  ctx.strokeStyle = '#a0303f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y - height / 3, width / 2.5, 4, 0, 0, Math.PI);
  ctx.stroke();
}

function drawCartoonMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  jawOpen: number,
  mouthStretch: number,
  mouthRound: number
) {
  const width = 50 + mouthStretch * 25;
  const height = 15 + jawOpen * 35;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#ff6b9d';

  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Smile curve based on mouth state
  if (jawOpen < 0.3) {
    ctx.beginPath();
    ctx.arc(x, y + 5, width / 3, Math.PI * 0.3, Math.PI * 0.7);
    ctx.stroke();
  }
}

function drawAvatarMouth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  jawOpen: number,
  mouthStretch: number,
  mouthRound: number
) {
  const baseWidth = 55;
  const width = baseWidth + mouthStretch * 22;
  const height = 18 + jawOpen * 28;

  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath();

  // Mouth shape varies with jawOpen
  if (jawOpen > 0.5) {
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else {
    // Mouth line when closed/neutral
    ctx.moveTo(x - width / 2, y);
    ctx.quadraticCurveTo(x, y + height * 0.5, x + width / 2, y);
    ctx.quadraticCurveTo(x, y - height * 0.2, x - width / 2, y);
  }

  ctx.fill();
  ctx.strokeStyle = '#cc2a5e';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default LipSyncAnimationRenderer;
