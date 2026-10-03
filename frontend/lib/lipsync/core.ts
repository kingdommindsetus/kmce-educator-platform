/**
 * Lip Sync Core Engine
 * Production-grade speech-to-mouth-animation system
 * Handles audio analysis, phoneme detection, and viseme mapping
 */

export type Phoneme = 'A' | 'E' | 'I' | 'O' | 'U' | 'AA' | 'AE' | 'AH' | 'AO' | 'AW' | 'B' | 'CH' | 'D' | 'DH' | 'F' | 'G' | 'HH' | 'JH' | 'K' | 'L' | 'M' | 'N' | 'NG' | 'P' | 'R' | 'S' | 'SH' | 'T' | 'TH' | 'V' | 'W' | 'Y' | 'Z' | 'ZH' | 'sil';

export type Viseme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface PhonemeFrame {
  phoneme: Phoneme;
  viseme: Viseme;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface LipSyncConfig {
  targetFrameRate?: number;
  smoothingWindow?: number;
  confidenceThreshold?: number;
  audioSampleRate?: number;
}

// Phoneme to Viseme mapping (ARKit/Blend Shape compatible)
const PHONEME_TO_VISEME_MAP: Record<Phoneme, Viseme> = {
  // Vowels
  'A': 'A', 'E': 'E', 'I': 'D', 'O': 'C', 'U': 'F',
  'AA': 'A', 'AE': 'A', 'AH': 'A', 'AO': 'C', 'AW': 'F',
  // Consonants - Plosives/Stops
  'B': 'B', 'P': 'B', 'M': 'B',
  'D': 'D', 'T': 'D', 'N': 'D',
  'G': 'G', 'K': 'G',
  // Consonants - Fricatives
  'F': 'F', 'V': 'F',
  'S': 'C', 'Z': 'C',
  'SH': 'C', 'ZH': 'C',
  'TH': 'F', 'DH': 'F',
  // Consonants - Approximants
  'L': 'D', 'R': 'D',
  'W': 'F', 'Y': 'D',
  'HH': 'D', 'JH': 'D', 'CH': 'C',
  // Nasal
  'NG': 'G',
  // Silence
  'sil': 'X'
};

export class LipSyncEngine {
  private config: Required<LipSyncConfig>;
  private phonemeSequence: PhonemeFrame[] = [];
  private audioBuffer: Float32Array | null = null;

  constructor(config: LipSyncConfig = {}) {
    this.config = {
      targetFrameRate: config.targetFrameRate ?? 30,
      smoothingWindow: config.smoothingWindow ?? 3,
      confidenceThreshold: config.confidenceThreshold ?? 0.3,
      audioSampleRate: config.audioSampleRate ?? 16000
    };
  }

  /**
   * Process audio and generate phoneme sequence
   * Uses energy-based voice activity detection and mel-frequency analysis
   */
  async processAudio(audioData: Float32Array | ArrayBuffer): Promise<PhonemeFrame[]> {
    const buffer = audioData instanceof ArrayBuffer
      ? new Float32Array(audioData)
      : audioData;

    this.audioBuffer = buffer;

    // Energy-based VAD (Voice Activity Detection)
    const vadFrames = this.detectVoiceActivity(buffer);

    // Spectral analysis for phoneme estimation
    const phonemeEstimates = this.analyzeSpectrum(buffer, vadFrames);

    // Smooth and filter results
    this.phonemeSequence = this.smoothPhonemeSequence(phonemeEstimates);

    return this.phonemeSequence;
  }

  /**
   * Simple energy-based voice activity detection
   */
  private detectVoiceActivity(audioData: Float32Array): boolean[] {
    const frameSize = this.config.audioSampleRate / this.config.targetFrameRate;
    const frameCount = Math.floor(audioData.length / frameSize);
    const energyThreshold = 0.02;

    const vadFrames: boolean[] = [];

    for (let i = 0; i < frameCount; i++) {
      const start = i * frameSize;
      const end = start + frameSize;
      const frame = audioData.subarray(start, end);

      const energy = this.calculateEnergy(frame);
      vadFrames.push(energy > energyThreshold);
    }

    return vadFrames;
  }

  /**
   * Analyze spectral characteristics to estimate phonemes
   */
  private analyzeSpectrum(
    audioData: Float32Array,
    vadFrames: boolean[]
  ): PhonemeFrame[] {
    const frameSize = this.config.audioSampleRate / this.config.targetFrameRate;
    const phonemeFrames: PhonemeFrame[] = [];

    for (let i = 0; i < vadFrames.length; i++) {
      const startSample = i * frameSize;
      const endSample = startSample + frameSize;
      const frame = audioData.subarray(startSample, endSample);

      if (!vadFrames[i]) {
        phonemeFrames.push({
          phoneme: 'sil',
          viseme: 'X',
          startTime: i / this.config.targetFrameRate,
          endTime: (i + 1) / this.config.targetFrameRate,
          confidence: 1.0
        });
        continue;
      }

      const { phoneme, confidence } = this.classifyPhoneme(frame);
      const viseme = PHONEME_TO_VISEME_MAP[phoneme];

      phonemeFrames.push({
        phoneme,
        viseme,
        startTime: i / this.config.targetFrameRate,
        endTime: (i + 1) / this.config.targetFrameRate,
        confidence
      });
    }

    return phonemeFrames;
  }

  /**
   * Classify phoneme based on spectral characteristics
   */
  private classifyPhoneme(frame: Float32Array): { phoneme: Phoneme; confidence: number } {
    const mfcc = this.calculateMFCC(frame);
    const formants = this.estimateFormants(mfcc);

    // Simple formant-based classification
    const [f0, f1, f2] = formants;

    // Vowel detection based on formant patterns
    if (f1 > 200 && f1 < 900) {
      if (f2 > 1500 && f2 < 2800) return { phoneme: 'A', confidence: 0.85 };
      if (f2 > 2000 && f2 < 3000) return { phoneme: 'E', confidence: 0.85 };
      if (f2 > 1700 && f2 < 2500) return { phoneme: 'I', confidence: 0.85 };
      if (f2 > 700 && f2 < 1200) return { phoneme: 'O', confidence: 0.85 };
      if (f2 > 600 && f2 < 1100) return { phoneme: 'U', confidence: 0.85 };
    }

    // Consonant heuristics based on energy distribution
    const highFreqEnergy = this.getHighFrequencyEnergy(mfcc);
    const lowFreqEnergy = this.getLowFrequencyEnergy(mfcc);

    if (highFreqEnergy > 0.7) return { phoneme: 'S', confidence: 0.75 };
    if (lowFreqEnergy > 0.6) return { phoneme: 'M', confidence: 0.75 };

    return { phoneme: 'A', confidence: 0.5 };
  }

  /**
   * Calculate Mel-Frequency Cepstral Coefficients
   */
  private calculateMFCC(frame: Float32Array, coefficients: number = 13): number[] {
    const fft = this.performFFT(frame);
    const melScale = this.applyMelScale(fft);
    const logMel = melScale.map(v => Math.log(v + 1e-9));

    // Discrete Cosine Transform
    const mfcc: number[] = [];
    for (let n = 0; n < coefficients; n++) {
      let sum = 0;
      for (let k = 0; k < logMel.length; k++) {
        sum += logMel[k] * Math.cos(Math.PI * n * (k + 0.5) / logMel.length);
      }
      mfcc.push(sum);
    }

    return mfcc;
  }

  /**
   * Simple FFT implementation using Cooley-Tukey
   */
  private performFFT(input: Float32Array): number[] {
    const n = input.length;
    if (n <= 1) return Array.from(input);

    const even = new Float32Array(n / 2);
    const odd = new Float32Array(n / 2);

    for (let i = 0; i < n / 2; i++) {
      even[i] = input[2 * i];
      odd[i] = input[2 * i + 1];
    }

    const evenFFT = this.performFFT(even);
    const oddFFT = this.performFFT(odd);

    const result: number[] = new Array(n);

    for (let k = 0; k < n / 2; k++) {
      const angle = -2 * Math.PI * k / n;
      const real = Math.cos(angle);
      const imag = Math.sin(angle);

      const oddRe = oddFFT[k];
      const oddIm = 0;

      const tReal = oddRe * real - oddIm * imag;
      const tImag = oddRe * imag + oddIm * real;

      result[k] = Math.sqrt(
        Math.pow(evenFFT[k] + tReal, 2) + Math.pow(tImag, 2)
      );
      result[k + n / 2] = Math.sqrt(
        Math.pow(evenFFT[k] - tReal, 2) + Math.pow(tImag, 2)
      );
    }

    return result;
  }

  private applyMelScale(spectrum: number[]): number[] {
    const melFilters = 40;
    const result: number[] = new Array(melFilters).fill(0);

    for (let i = 0; i < melFilters; i++) {
      for (let j = 0; j < spectrum.length; j++) {
        const melWeight = this.melFilterBankWeight(i, j, melFilters, spectrum.length);
        result[i] += spectrum[j] * melWeight;
      }
    }

    return result;
  }

  private melFilterBankWeight(filterIdx: number, freqIdx: number, numFilters: number, spectrumSize: number): number {
    // Simplified mel filter bank weight
    const norm = numFilters / spectrumSize;
    const distance = Math.abs(freqIdx - filterIdx * norm);
    return Math.max(0, 1 - distance);
  }

  private estimateFormants(mfcc: number[]): [number, number, number] {
    // Estimate formants from MFCC coefficients
    // F1 (200-900 Hz), F2 (700-3000 Hz), F3 (1500-4000 Hz)
    const f0 = 300 + mfcc[1] * 200;
    const f1 = 500 + mfcc[2] * 400;
    const f2 = 1500 + mfcc[3] * 1000;

    return [f0, f1, f2];
  }

  private getHighFrequencyEnergy(mfcc: number[]): number {
    return Math.abs(mfcc.slice(7).reduce((a, b) => a + b, 0)) / mfcc.length;
  }

  private getLowFrequencyEnergy(mfcc: number[]): number {
    return Math.abs(mfcc.slice(0, 3).reduce((a, b) => a + b, 0)) / 3;
  }

  private calculateEnergy(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  /**
   * Smooth phoneme sequence using temporal smoothing
   */
  private smoothPhonemeSequence(frames: PhonemeFrame[]): PhonemeFrame[] {
    const window = this.config.smoothingWindow;
    const smoothed: PhonemeFrame[] = [];

    for (let i = 0; i < frames.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(frames.length, i + Math.ceil(window / 2));

      const window_frames = frames.slice(start, end);
      const avgConfidence = window_frames.reduce((sum, f) => sum + f.confidence, 0) / window_frames.length;

      // Majority voting for phoneme
      const phonemeCounts: Record<string, number> = {};
      for (const frame of window_frames) {
        phonemeCounts[frame.phoneme] = (phonemeCounts[frame.phoneme] || 0) + 1;
      }

      const majorityPhoneme = Object.entries(phonemeCounts)
        .sort(([,a], [,b]) => b - a)[0][0] as Phoneme;

      const viseme = PHONEME_TO_VISEME_MAP[majorityPhoneme];

      smoothed.push({
        phoneme: majorityPhoneme,
        viseme,
        startTime: frames[i].startTime,
        endTime: frames[i].endTime,
        confidence: Math.min(1, avgConfidence)
      });
    }

    return smoothed;
  }

  /**
   * Get viseme sequence for animation
   */
  getVisemeSequence(): PhonemeFrame[] {
    return this.phonemeSequence;
  }

  /**
   * Interpolate viseme at specific time
   */
  getVisemeAtTime(time: number): Viseme {
    const frame = this.phonemeSequence.find(f => f.startTime <= time && time < f.endTime);
    return frame?.viseme ?? 'X';
  }

  /**
   * Get smooth interpolated value for animation blending [0-1]
   */
  getInterpolatedVisemeValue(time: number): number {
    const frame = this.phonemeSequence.find(f => f.startTime <= time && time < f.endTime);
    if (!frame) return 0;

    const progress = (time - frame.startTime) / (frame.endTime - frame.startTime);
    return Math.min(1, Math.max(0, progress * frame.confidence));
  }
}

export default LipSyncEngine;
