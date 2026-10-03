import { NextRequest, NextResponse } from 'next/server';

/**
 * Export animation in various formats
 * POST /api/lipsync/export
 */
export async function POST(request: NextRequest) {
  try {
    const { frames, format = 'json', characterName = 'Character' } = await request.json();

    if (!frames || !Array.isArray(frames)) {
      return NextResponse.json(
        { error: 'frames array is required' },
        { status: 400 }
      );
    }

    let responseBody: any;
    let contentType: string;
    let filename: string;

    switch (format.toLowerCase()) {
      case 'json':
        responseBody = JSON.stringify(
          {
            format: 'lipsync-export-v1',
            characterName,
            frames,
            metadata: {
              totalDuration: frames[frames.length - 1]?.endTime ?? 0,
              frameCount: frames.length,
              exportedAt: new Date().toISOString()
            }
          },
          null,
          2
        );
        contentType = 'application/json';
        filename = `${characterName}-lipsync.json`;
        break;

      case 'gltf':
        responseBody = generateGLTFData(frames, characterName);
        contentType = 'model/gltf+json';
        filename = `${characterName}-lipsync.gltf`;
        break;

      case 'vrm':
        responseBody = generateVRMData(frames, characterName);
        contentType = 'application/json';
        filename = `${characterName}-lipsync.vrm`;
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

/**
 * Generate glTF format animation data
 */
function generateGLTFData(frames: any[], characterName: string) {
  const duration = frames[frames.length - 1]?.endTime ?? 0;

  // Create glTF-compatible animation structure
  const gltfData = {
    asset: {
      generator: 'KMCE Lip Sync Engine v1.0',
      version: '2.0'
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: characterName, mesh: 0, animation: 0 }],
    meshes: [{ primitives: [{}] }],
    animations: [
      {
        name: 'LipSync',
        channels: generateGLTFChannels(frames),
        samplers: generateGLTFSamplers(frames)
      }
    ],
    metadata: {
      duration,
      frameCount: frames.length,
      exportedAt: new Date().toISOString()
    }
  };

  return JSON.stringify(gltfData, null, 2);
}

/**
 * Generate VRM format animation data (for VTuber avatars)
 */
function generateVRMData(frames: any[], characterName: string) {
  const vrmData = {
    format: 'VRM',
    formatVersion: '0.0',
    meta: {
      title: `${characterName} Lip Sync`,
      version: '1.0',
      author: 'KMCE Educator Platform',
      licenseUrl: 'https://vrm.dev/licenses/1.0/',
      exportedAt: new Date().toISOString()
    },
    humanoid: {
      armStretch: 0.05,
      legStretch: 0.05,
      upperArmTwist: 0.5,
      lowerArmTwist: 0.5,
      upperLegTwist: 0.5,
      lowerLegTwist: 0.5,
      armAndHandsHeight: 0.81,
      legHeight: 0.89,
      footHeight: 0.1,
      hasTranslationDoF: false
    },
    animations: {
      lipSync: generateVRMBlendShapes(frames)
    }
  };

  return JSON.stringify(vrmData, null, 2);
}

/**
 * Generate glTF animation channels
 */
function generateGLTFChannels(frames: any[]) {
  const blendShapes = new Set<string>();

  for (const frame of frames) {
    const shapes = getBlendShapesForViseme(frame.viseme);
    for (const shape of Object.keys(shapes)) {
      blendShapes.add(shape);
    }
  }

  return Array.from(blendShapes).map((shapeName, index) => ({
    sampler: index,
    target: {
      node: 0,
      path: `morphTargets/${shapeName}`
    }
  }));
}

/**
 * Generate glTF samplers
 */
function generateGLTFSamplers(frames: any[]) {
  const blendShapes = new Set<string>();

  for (const frame of frames) {
    const shapes = getBlendShapesForViseme(frame.viseme);
    for (const shape of Object.keys(shapes)) {
      blendShapes.add(shape);
    }
  }

  return Array.from(blendShapes).map(shapeName => {
    const times: number[] = [];
    const values: number[] = [];

    for (const frame of frames) {
      times.push(frame.startTime);
      const shapes = getBlendShapesForViseme(frame.viseme);
      values.push((shapes[shapeName] || 0) * frame.confidence);
    }

    return {
      input: { times },
      output: { values },
      interpolation: 'LINEAR'
    };
  });
}

/**
 * Generate VRM blend shapes
 */
function generateVRMBlendShapes(frames: any[]) {
  const blendShapeGroups: Record<string, any> = {};

  for (const frame of frames) {
    const time = frame.startTime;
    const shapes = getBlendShapesForViseme(frame.viseme);

    for (const [shapeName, value] of Object.entries(shapes)) {
      if (!blendShapeGroups[shapeName]) {
        blendShapeGroups[shapeName] = [];
      }

      blendShapeGroups[shapeName].push({
        time,
        value: (value as number) * frame.confidence
      });
    }
  }

  return blendShapeGroups;
}

/**
 * Get blend shapes for a viseme
 */
function getBlendShapesForViseme(viseme: string): Record<string, number> {
  const map: Record<string, Record<string, number>> = {
    'A': { jawOpen: 0.5, mouthStretch: 0.3 },
    'B': { jawOpen: 0.1, mouthClose: 0.8 },
    'C': { jawOpen: 0.3, mouthRound: 0.7 },
    'D': { jawOpen: 0.4, tongueTip: 0.6 },
    'E': { jawOpen: 0.2, mouthStretch: 0.9 },
    'F': { jawOpen: 0.2, mouthRound: 0.4 },
    'G': { jawOpen: 0.3, backTongue: 0.6 },
    'H': { jawOpen: 0.1, tongueOut: 0.3 },
    'X': { jawOpen: 0 }
  };

  return map[viseme] || {};
}
