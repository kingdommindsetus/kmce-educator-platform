import { NextRequest, NextResponse } from 'next/server';

/**
 * Get animation data compatible with 3D models
 * POST /api/lipsync/animation
 */
export async function POST(request: NextRequest) {
  try {
    const { frames, characterType = 'realistic' } = await request.json();

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { error: 'frames array is required' },
        { status: 400 }
      );
    }

    // Generate blend shape animations
    const blendShapeAnimations = generateBlendShapeAnimation(frames, characterType);

    // Export formats for different 3D engines
    const animationData = {
      format: 'lipsync-animation-v1',
      characterType,
      blendShapes: blendShapeAnimations,
      keyframes: generateKeyframes(frames),
      metadata: {
        totalDuration: frames[frames.length - 1]?.endTime ?? 0,
        frameRate: 30,
        totalFrames: frames.length,
        exportedAt: new Date().toISOString()
      }
    };

    return NextResponse.json(animationData);
  } catch (error) {
    console.error('Animation generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate animation' },
      { status: 500 }
    );
  }
}

/**
 * Generate blend shape animations for character models
 */
function generateBlendShapeAnimation(frames: any[], characterType: string) {
  const blendShapeMap: Record<string, Record<string, number>> = {
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

  const animations: Record<string, any[]> = {};

  for (const frame of frames) {
    const blendShapes = blendShapeMap[frame.viseme] || blendShapeMap['X'];

    for (const [shapeName, value] of Object.entries(blendShapes)) {
      if (!animations[shapeName]) {
        animations[shapeName] = [];
      }

      animations[shapeName].push({
        time: frame.startTime,
        value: value * frame.confidence,
        easing: 'easeInOutQuad'
      });
    }
  }

  return animations;
}

/**
 * Generate keyframes for animation timeline
 */
function generateKeyframes(frames: any[]) {
  return frames.map((frame, index) => ({
    frameNumber: index,
    time: frame.startTime,
    viseme: frame.viseme,
    phoneme: frame.phoneme,
    confidence: frame.confidence,
    duration: frame.endTime - frame.startTime
  }));
}
