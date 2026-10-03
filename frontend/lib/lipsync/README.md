# KMCE Lip Sync Rendering Engine

Professional-grade audio-to-mouth animation system for the KMCE Educator Platform. Synchronizes character mouth movements with audio in real-time using AI-driven phoneme detection and blend shape animation.

## Features

✨ **Production-Ready**
- Enterprise-grade phoneme detection
- Real-time animation rendering
- Multiple character model support (realistic, cartoon, avatar)
- GPU-optimized Canvas rendering

🎯 **Advanced Audio Processing**
- Energy-based voice activity detection
- MFCC (Mel-Frequency Cepstral Coefficients) analysis
- Temporal smoothing for natural motion
- Confidence scoring for animation quality

📊 **Multiple Export Formats**
- JSON for web integration
- glTF for 3D model compatibility
- VRM for VTuber avatars

🚀 **Easy Integration**
- React hooks for seamless component integration
- API client for server-side processing
- TypeScript types for full type safety

## Installation

The lip sync module is included in the KMCE frontend. No additional dependencies required beyond what's already in the project.

## Quick Start

### 1. Basic Component Usage

```tsx
import { LipSyncAnimationRenderer } from '@/lib/lipsync/AnimationRenderer';

export function MyComponent() {
  return (
    <LipSyncAnimationRenderer
      audioSource="/path/to/audio.mp3"
      characterModel="realistic"
      width={512}
      height={512}
    />
  );
}
```

### 2. Using React Hooks

```tsx
import { useLipSync } from '@/lib/lipsync/hooks';

export function MyComponent() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { viseme, phonemeFrames, isProcessing } = useLipSync(audioRef.current);

  return (
    <>
      <audio ref={audioRef} src="/audio.mp3" controls />
      <p>Current viseme: {viseme}</p>
      {phonemeFrames.length > 0 && (
        <p>Processed {phonemeFrames.length} frames</p>
      )}
    </>
  );
}
```

### 3. Server-Side Audio Processing

```tsx
import { getLipSyncAPI } from '@/lib/lipsync/api';

async function processAudio() {
  const api = getLipSyncAPI();
  const response = await api.processAudio({
    audioPath: '/path/to/audio.mp3',
    config: {
      targetFrameRate: 30,
      smoothingWindow: 3
    }
  });

  console.log('Frames:', response.frames);
  console.log('Processing time:', response.metadata.processingTime);
}
```

## API Reference

### LipSyncEngine

Core engine for audio processing and phoneme detection.

```typescript
const engine = new LipSyncEngine({
  targetFrameRate: 30,        // Animation frames per second
  smoothingWindow: 3,         // Temporal smoothing window
  confidenceThreshold: 0.3,   // Minimum confidence for frame inclusion
  audioSampleRate: 16000      // Input audio sample rate
});

// Process audio
const frames = await engine.processAudio(audioData);

// Get viseme at specific time
const viseme = engine.getVisemeAtTime(2.5);

// Get interpolated blend shape value [0-1]
const value = engine.getInterpolatedVisemeValue(2.5);
```

### LipSyncAnimationRenderer

React component for rendering animated mouth.

```tsx
<LipSyncAnimationRenderer
  audioSource="/audio.mp3"          // URL or HTMLAudioElement
  characterModel="realistic"        // 'realistic' | 'cartoon' | 'avatar'
  onVisemeChange={handleChange}     // Callback when viseme changes
  width={512}                       // Canvas width in pixels
  height={512}                      // Canvas height in pixels
  className="my-class"              // CSS class
/>
```

### Hooks

#### useLipSync

```typescript
const {
  viseme,           // Current Viseme ('A'-'H', 'X')
  isProcessing,     // Boolean loading state
  phonemeFrames,    // Array of PhonemeFrame objects
  error,            // Error message if any
  processAudio,     // Function to process new audio
  startAnimation,   // Start animation loop
  stopAnimation     // Stop animation loop
} = useLipSync(audioElement);
```

#### useLipSyncAnimation

```typescript
const {
  viseme,              // Current viseme
  blendShapeWeights    // Record of blend shape name -> weight [0-1]
} = useLipSyncAnimation(frames, currentTime, onVisemeChange);
```

#### useLipSyncPlayback

```typescript
const {
  audioRef,        // HTMLAudioElement reference
  viseme,          // Current viseme
  phonemeFrames,   // Phoneme frame data
  isProcessing,    // Loading state
  isPlaying,       // Playback state
  currentTime,     // Current playback time in seconds
  duration,        // Total audio duration in seconds
  play,            // Start playback
  pause,           // Pause playback
  seek             // Seek to time
} = useLipSyncPlayback('/audio.mp3');
```

### API Endpoints

#### POST /api/lipsync/process

Process audio file and return phoneme frames.

**Request:**
```json
{
  "audioPath": "/path/to/audio.mp3",
  "config": {
    "targetFrameRate": 30,
    "smoothingWindow": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "frames": [
    {
      "phoneme": "A",
      "viseme": "A",
      "startTime": 0.0,
      "endTime": 0.033,
      "confidence": 0.85
    }
  ],
  "metadata": {
    "totalDuration": 5.2,
    "frameCount": 156,
    "processingTime": 234
  }
}
```

#### POST /api/lipsync/animation

Get blend shape animation data for 3D models.

**Request:**
```json
{
  "frames": [...],
  "characterType": "realistic"
}
```

**Response:**
```json
{
  "format": "lipsync-animation-v1",
  "characterType": "realistic",
  "blendShapes": {
    "jawOpen": [...],
    "mouthStretch": [...]
  },
  "keyframes": [...],
  "metadata": {...}
}
```

#### POST /api/lipsync/export

Export animation in various formats (JSON, glTF, VRM).

**Request:**
```json
{
  "frames": [...],
  "format": "json",  // or "gltf", "vrm"
  "characterName": "MyCharacter"
}
```

## Viseme Reference

Visemes are mouth shapes that correspond to phonemes:

| Viseme | Description | Phonemes |
|--------|-------------|----------|
| A | Open mouth (ah) | A, AA, AE, AH |
| B | Closed lips (m, p, b sounds) | B, P, M |
| C | Rounded lips (o, oo sounds) | C, O, OO |
| D | Tongue tip up (d, t, n sounds) | D, T, N, L, R |
| E | Smile (e, i sounds) | E, I |
| F | Lower lip in (f, v sounds) | F, V |
| G | Tongue back (g, k sounds) | G, K |
| H | Open lips (h sound) | H, Y |
| X | Neutral/silence | sil |

## Blend Shapes

The animation system uses the following blend shapes for deformation:

- `jawOpen` - Jaw openness (0-1)
- `mouthStretch` - Horizontal mouth stretch (0-1)
- `mouthClose` - Mouth closing (0-1)
- `mouthRound` - Mouth rounding (0-1)
- `lipCornerIn` - Lip corners inward (0-1)
- `lipCornerOut` - Lip corners outward (0-1)
- `tongueTip` - Tongue tip position (0-1)
- `backTongue` - Back of tongue position (0-1)
- `tongueOut` - Tongue protrusion (0-1)
- `lowerLipIn` - Lower lip inward (0-1)
- `mouthSharp` - Mouth sharpness (0-1)
- `lipCornerRelax` - Lip corner relaxation (0-1)

## Advanced Usage

### Custom Audio Processing

```tsx
import LipSyncEngine from '@/lib/lipsync/core';

async function customProcessing(audioUrl: string) {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const audioData = audioBuffer.getChannelData(0);

  const engine = new LipSyncEngine({
    audioSampleRate: audioBuffer.sampleRate,
    targetFrameRate: 60  // Higher FPS for smoother animation
  });

  const frames = await engine.processAudio(audioData);
  return frames;
}
```

### Integration with Three.js

```tsx
import * as THREE from 'three';
import { useLipSyncAnimation } from '@/lib/lipsync/hooks';

function Avatar({ modelUrl, audioUrl }) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const { blendShapeWeights } = useLipSyncAnimation(frames, currentTime);

  useEffect(() => {
    if (!model) return;

    // Apply blend shapes to model
    const mesh = model.getObjectByName('Face') as THREE.SkinnedMesh;
    if (!mesh?.morphTargetInfluences) return;

    // Update morph target weights based on blend shapes
    const morphMap = {
      jawOpen: 0,
      mouthStretch: 1,
      mouthClose: 2
    };

    for (const [name, weight] of Object.entries(blendShapeWeights)) {
      const morphIndex = morphMap[name as keyof typeof morphMap];
      if (morphIndex !== undefined && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[morphIndex] = weight;
      }
    }
  }, [blendShapeWeights, model]);

  return <></>; // Render model
}
```

### Real-Time Streaming

```tsx
import { getLipSyncAPI } from '@/lib/lipsync/api';

async function streamLipSync(audioUrl: string) {
  const api = getLipSyncAPI();
  
  for await (const chunk of api.streamProcessAudio({ audioUrl })) {
    console.log('Received frame:', chunk);
    // Process frames as they arrive
  }
}
```

## Performance Optimization

### 1. Frame Rate Adjustment

```tsx
const engine = new LipSyncEngine({
  targetFrameRate: 24  // Lower FPS for better performance
});
```

### 2. Smoothing Window

Adjust temporal smoothing for better quality vs. performance:

```tsx
const engine = new LipSyncEngine({
  smoothingWindow: 2  // Smaller window = less smoothing, faster
});
```

### 3. Confidence Threshold

Filter low-confidence frames:

```tsx
const engine = new LipSyncEngine({
  confidenceThreshold: 0.5  // Only include confident frames
});
```

## Troubleshooting

### Audio Processing Fails

1. Ensure audio file is accessible and CORS-enabled
2. Check browser audio context permissions
3. Verify audio sample rate is supported (8kHz - 48kHz)

### Mouth Animation Doesn't Sync

1. Check audio playback timing
2. Verify frame rate matches audio processor
3. Test with `showDebugInfo={true}` in demo component

### Memory Issues

1. Reduce audio buffer size
2. Lower target frame rate
3. Increase confidence threshold to filter frames

## Contributing

To extend the lip sync system:

1. **Add new visemes**: Update `PHONEME_TO_VISEME_MAP` in `core.ts`
2. **New character models**: Add rendering function in `AnimationRenderer.tsx`
3. **Export formats**: Add handler in `frontend/app/api/lipsync/export/route.ts`
4. **Phoneme detection**: Improve `classifyPhoneme()` in `core.ts`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+

Requires Web Audio API support.

## License

Part of KMCE Educator Platform. All rights reserved.

## References

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Viseme Standards](https://www.fon.hum.uva.nl/david/ma_phonetics/2010_17_Visemes.pdf)
- [glTF Animation Specification](https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#animations)
- [VRM Format](https://vrm.dev/)
