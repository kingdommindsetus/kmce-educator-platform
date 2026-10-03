import { NextRequest, NextResponse } from 'next/server';

/**
 * Process audio file for lip sync rendering
 * POST /api/lipsync/process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioPath, audioUrl, config } = body;

    if (!audioPath && !audioUrl) {
      return NextResponse.json(
        { error: 'Either audioPath or audioUrl is required' },
        { status: 400 }
      );
    }

    // Fetch audio data
    let audioBuffer: ArrayBuffer;
    try {
      const response = await fetch(audioUrl || audioPath, {
        headers: { 'Range': 'bytes=0-' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      audioBuffer = await response.arrayBuffer();
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to load audio: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Process with lip sync engine
    // Note: This uses Node.js runtime, so we use a simpler processing approach
    const startTime = Date.now();

    // Generate phoneme frames from audio analysis
    const frames = await processAudioToPhonemes(audioBuffer, config);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      frames,
      metadata: {
        totalDuration: frames[frames.length - 1]?.endTime ?? 0,
        frameCount: frames.length,
        processingTime
      }
    });
  } catch (error) {
    console.error('Lip sync processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Simple phoneme detection from audio buffer
 * This is a server-side implementation for Node.js environment
 */
async function processAudioToPhonemes(
  audioBuffer: ArrayBuffer,
  config: any = {}
): Promise<any[]> {
  const frameRate = config.targetFrameRate || 30;
  const sampleRate = config.audioSampleRate || 16000;

  // Convert to Float32Array
  const audioData = new Float32Array(audioBuffer);

  // Simple energy-based frame analysis
  const frameSize = Math.floor(sampleRate / frameRate);
  const frameCount = Math.floor(audioData.length / frameSize);

  const frames = [];
  const phonemeMap = ['A', 'E', 'I', 'O', 'U', 'M', 'S', 'B', 'D', 'G'];

  for (let i = 0; i < frameCount; i++) {
    const start = i * frameSize;
    const end = Math.min(start + frameSize, audioData.length);
    const frameData = audioData.subarray(start, end);

    // Calculate energy
    let energy = 0;
    for (let j = 0; j < frameData.length; j++) {
      energy += frameData[j] * frameData[j];
    }
    energy = Math.sqrt(energy / frameData.length);

    const startTime = i / frameRate;
    const endTime = (i + 1) / frameRate;

    // Simple phoneme classification based on energy
    let phoneme = 'sil';
    let viseme = 'X';

    if (energy > 0.02) {
      const phoneIdx = Math.floor(energy * 1000) % phonemeMap.length;
      phoneme = phonemeMap[phoneIdx];
      viseme = mapPhonemeToViseme(phoneme);
    }

    frames.push({
      phoneme,
      viseme,
      startTime,
      endTime,
      confidence: Math.min(1, energy / 0.05)
    });
  }

  return frames;
}

/**
 * Map phoneme to viseme
 */
function mapPhonemeToViseme(phoneme: string): string {
  const map: Record<string, string> = {
    'A': 'A', 'E': 'E', 'I': 'D', 'O': 'C', 'U': 'F',
    'M': 'B', 'B': 'B', 'P': 'B',
    'S': 'C', 'Z': 'C', 'SH': 'C',
    'D': 'D', 'T': 'D', 'L': 'D',
    'G': 'G', 'K': 'G',
    'F': 'F', 'V': 'F',
    'sil': 'X'
  };
  return map[phoneme] || 'X';
}
