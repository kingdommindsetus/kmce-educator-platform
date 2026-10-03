'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import LipSyncEngine, { Viseme, PhonemeFrame } from './core';

/**
 * Hook for managing lip sync animation
 */
export function useLipSync(audioElement: HTMLAudioElement | null) {
  const engineRef = useRef<LipSyncEngine | null>(null);
  const [viseme, setViseme] = useState<Viseme>('X');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phonemeFrames, setPhonemeFrames] = useState<PhonemeFrame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize and process audio
  const processAudio = useCallback(async (audio: HTMLAudioElement) => {
    try {
      setIsProcessing(true);
      setError(null);

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create audio source from element
      const source = audioContext.createMediaElementAudioSource(audio);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      // Get audio data
      const response = await fetch(audio.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Extract audio channel
      const channelData = audioBuffer.getChannelData(0);

      // Process with lip sync engine
      engineRef.current = new LipSyncEngine({
        targetFrameRate: 30,
        smoothingWindow: 3,
        audioSampleRate: audioBuffer.sampleRate
      });

      const frames = await engineRef.current.processAudio(channelData);
      setPhonemeFrames(frames);

      return frames;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process audio';
      setError(message);
      console.error('Lip sync processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Start animation loop
  const startAnimation = useCallback(() => {
    if (!audioElement || !engineRef.current) return;

    const animate = () => {
      const currentTime = audioElement.currentTime;
      const newViseme = engineRef.current!.getVisemeAtTime(currentTime);
      setViseme(newViseme);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [audioElement]);

  // Stop animation loop
  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setViseme('X');
  }, []);

  // Process audio on mount
  useEffect(() => {
    if (!audioElement) return;

    processAudio(audioElement);

    return () => {
      stopAnimation();
    };
  }, [audioElement, processAudio, stopAnimation]);

  // Listen for audio playback
  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => startAnimation();
    const handlePause = () => stopAnimation();
    const handleEnded = () => stopAnimation();

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, [audioElement, startAnimation, stopAnimation]);

  return {
    viseme,
    isProcessing,
    phonemeFrames,
    error,
    processAudio,
    startAnimation,
    stopAnimation
  };
}

/**
 * Hook for rendering lip sync data with custom animation
 */
export function useLipSyncAnimation(
  frames: PhonemeFrame[],
  currentTime: number,
  onVisemeChange?: (viseme: Viseme) => void
) {
  const [viseme, setViseme] = useState<Viseme>('X');
  const [blendShapeWeights, setBlendShapeWeights] = useState<Record<string, number>>({});
  const prevVisemeRef = useRef<Viseme>('X');

  useEffect(() => {
    if (frames.length === 0) return;

    const frame = frames.find(f => f.startTime <= currentTime && currentTime < f.endTime);
    const newViseme = frame?.viseme ?? 'X';
    const confidence = frame?.confidence ?? 0;

    if (newViseme !== prevVisemeRef.current) {
      setViseme(newViseme);
      prevVisemeRef.current = newViseme;
      onVisemeChange?.(newViseme);
    }

    // Calculate smooth blend shape interpolation
    const weights = calculateBlendShapeWeights(newViseme, confidence);
    setBlendShapeWeights(weights);
  }, [frames, currentTime, onVisemeChange]);

  return { viseme, blendShapeWeights };
}

/**
 * Calculate blend shape weights for smooth animation
 */
function calculateBlendShapeWeights(viseme: Viseme, confidence: number): Record<string, number> {
  const baseWeights: Record<Viseme, Record<string, number>> = {
    'A': { jawOpen: 0.5, mouthStretch: 0.3 },
    'B': { jawOpen: 0.1, mouthClose: 0.8 },
    'C': { jawOpen: 0.3, mouthRound: 0.7 },
    'D': { jawOpen: 0.4, tongueTip: 0.6 },
    'E': { jawOpen: 0.2, mouthStretch: 0.9 },
    'F': { jawOpen: 0.2, mouthRound: 0.4 },
    'G': { jawOpen: 0.3, backTongue: 0.6 },
    'H': { jawOpen: 0.1, tongueOut: 0.3 },
    'X': { jawOpen: 0, mouthClose: 0.2 }
  };

  const weights = baseWeights[viseme] || {};

  // Apply confidence as strength multiplier
  const scaledWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    scaledWeights[key] = value * confidence;
  }

  return scaledWeights;
}

/**
 * Hook for managing lip sync playback with timeline
 */
export function useLipSyncPlayback(audioPath: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { viseme, phonemeFrames, isProcessing } = useLipSync(audioRef.current);

  useEffect(() => {
    const audio = new Audio(audioPath);
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioPath]);

  const play = useCallback(() => {
    audioRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return {
    audioRef: audioRef.current,
    viseme,
    phonemeFrames,
    isProcessing,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seek
  };
}
