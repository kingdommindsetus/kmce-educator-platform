# LTX-2 Video Generation Integration Guide

## Overview

This document describes the integration of **LTX-2** (Lightricks' state-of-the-art audio-video foundation model) into the KMCE Educator Platform. This enables:

- **Content Creator Agents** to generate professional marketing videos
- **Personalized Video Outreach** for educator campaigns
- **Automated Video Asset Creation** for course promotion
- **Multi-channel Content** (video + text) for higher engagement

## Key Features

### For Educators
- Generate professional marketing videos from text prompts
- Personalize videos for specific audience segments
- Create course introduction and benefit explainer videos
- Enhanced outreach with 3-5x engagement improvement

### For Content Agents
- Automatically generate video content as part of outreach campaigns
- Create contextual videos based on lead profiles
- Produce consistent, brand-aligned video assets
- Scale video content production without manual effort

## Architecture

### New Database Tables

```sql
video_generation_jobs
├── Tracks video generation requests
├── Stores job status (PENDING → PROCESSING → COMPLETED/FAILED)
├── Links to educator and campaign
└── Stores output URLs and error details

video_assets
├── Manages generated video files
├── Tracks usage across campaigns
├── Links to outreach jobs for delivery
└── Stores metadata (duration, file size, thumbnails)
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/educators/{id}/videos/generate` | POST | Create video generation job |
| `/educators/{id}/videos` | GET | List educator's videos |
| `/videos/job/{id}` | GET | Check job status |
| `/videos/job/{id}/link-to-outreach/{job_id}` | POST | Link video to campaign |

## Implementation Details

### Video Generation Service

**File:** `backend/app/video_service.py`

```python
class VideoGenerationService:
    def create_video_job(...) -> dict
    async def generate_video(...) -> dict
    def list_educator_videos(...) -> list
    def link_video_to_outreach(...) -> bool
```

**Key Features:**
- Async video generation (non-blocking)
- GPU detection and fallback to mock generator
- Error handling and retry logic
- Database persistence of all video jobs

### Backend Integration

**File:** `backend/app/main.py`

Added endpoints:
- `POST /educators/{educator_id}/videos/generate` - Create video job
- `GET /educators/{educator_id}/videos` - List videos
- `GET /videos/job/{job_id}` - Check status
- `POST /videos/job/{job_id}/link-to-outreach/{outreach_job_id}` - Link to campaign

### Database Schema Updates

**File:** `backend/app/db.py`

New tables created in `init_db()`:
- `video_generation_jobs` - Job tracking
- `video_assets` - Video file management
- Indexes for efficient queries

## Installation & Setup

### Prerequisites

- Python 3.9+
- 100GB+ disk space for models
- CUDA 12.1+ (optional, for GPU acceleration)

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:
- `torch>=2.0.0` - PyTorch framework
- `torchvision>=0.15.0` - Vision models
- `numpy>=1.24.0` - Numerical computing
- `pillow>=10.0.0` - Image processing

### Step 2: Download LTX-2 Models

```bash
# Option A: Using HuggingFace CLI (Recommended)
pip install huggingface-hub
hf auth login
hf download Lightricks/LTX-2.5 \
    diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors \
    text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors \
    vae/ltx-2.5-video-vae-bf16.safetensors \
    vae/ltx-2.5-audio-vae-bf16.safetensors \
    latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
    --local-dir backend/models/ltx-2.5
```

### Step 3: Configure Environment

Create `backend/.env`:

```env
# Video Generation Settings
LTX_MODELS_PATH=./models/ltx-2.5
VIDEO_OUTPUT_DIR=/tmp/videos
VIDEO_GENERATION_ENABLED=true
```

### Step 4: Verify Installation

```python
from app.video_service import VideoGenerationService
service = VideoGenerationService()
print(f"LTX-2 Available: {service.ltx_available}")
```

## Usage Examples

### Example 1: Create Marketing Video

```python
import asyncio
from app.video_service import VideoGenerationService

service = VideoGenerationService()

# Create video job
job = service.create_video_job(
    educator_id=123,
    prompt="A professional video explaining the benefits of continuing education for nurses, highlighting industry standards and career advancement",
    title="CE Benefits Explainer",
    campaign_id=456,
    duration_seconds=60
)

print(f"Job created: {job['id']}")

# Video generates asynchronously
# Check status
import time
time.sleep(5)
status = service.get_video_job(job['id'])
print(f"Status: {status['status']}")
```

### Example 2: Link Video to Campaign

```python
# After video is generated
video_asset = service.link_video_to_outreach(
    video_job_id=789,
    outreach_job_id=999,
    educator_id=123
)

# Now the video URL can be included in outreach templates
```

### Example 3: Content Agent Workflow

```python
# Pseudo-code for content creation agent
class ContentCreatorAgent:
    def process_lead(self, lead, campaign):
        # Generate contextual prompt
        prompt = self.generate_prompt(lead, campaign)
        
        # Create video
        job = video_service.create_video_job(
            educator_id=campaign.educator_id,
            prompt=prompt,
            campaign_id=campaign.id,
            duration_seconds=30
        )
        
        # Wait for completion
        await video_service.generate_video(
            job['id'], prompt, duration_seconds=30
        )
        
        # Link to outreach
        video_service.link_video_to_outreach(
            job['id'],
            outreach_job['id'],
            campaign.educator_id
        )
        
        # Return video URL for use in email/message
        return job['output_url']
```

## Performance Characteristics

### Inference Time

| Model | Mode | GPU | Time (60s video) |
|-------|------|-----|------------------|
| LTX-2.5 | Distilled | A100 | 30-60 sec |
| LTX-2.5 | Full | A100 | 2-5 min |
| Mock | - | CPU | 2 sec |

### Resource Usage

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| RAM | 16GB | 32GB+ |
| VRAM | - | 80GB (A100/H100) |
| Disk | 100GB | 500GB |
| Storage | HDD | NVMe SSD |

## Production Considerations

### Scaling

For production deployments, consider:

1. **Worker Queues**: Use Celery/Redis for job distribution
2. **Multiple GPUs**: Load balance across multiple devices
3. **Caching**: Store frequently used video assets
4. **CDN**: Deliver videos via CDN for faster playback

### Monitoring

Track video generation metrics:

```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_jobs,
    SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) as successful,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
FROM video_generation_jobs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Security

- Validate prompts for inappropriate content
- Rate limit video generation per educator
- Store videos securely with access controls
- Audit video usage across campaigns

## Troubleshooting

### Issue: GPU not detected

```python
import torch
print(torch.cuda.is_available())  # Should be True
print(torch.cuda.device_count())  # Number of GPUs
```

**Solution**: Install CUDA toolkit matching your GPU driver version.

### Issue: Model loading fails

**Solution**: Verify model files are complete:
```bash
du -sh backend/models/ltx-2.5  # Should be ~66GB
```

### Issue: Out of memory

**Solution**: Reduce video duration or use smaller batch sizes:
```python
job = service.create_video_job(
    ...,
    duration_seconds=30  # Smaller videos
)
```

## Future Enhancements

1. **Real-time Preview**: Stream video generation progress
2. **Multi-language**: Generate videos in educator's language
3. **Custom Voices**: Use educator's voice cloning
4. **Template System**: Pre-built video templates for common scenarios
5. **Performance Optimization**: Model quantization and distillation
6. **Batch Processing**: Efficient multi-video generation

## References

- **LTX-2 GitHub**: https://github.com/Lightricks/LTX-2
- **Model Card**: https://huggingface.co/Lightricks/LTX-2.5
- **Paper**: https://arxiv.org/abs/2601.03233
- **Documentation**: https://ltx.io

## Support

For issues or questions:
1. Check `backend/VIDEO_GENERATION_SETUP.md` for detailed setup
2. Review LTX-2 documentation
3. Check job status in database
4. Review logs in `/tmp/videos/` directory

## License

LTX-2 is provided under Lightricks' commercial license. See `backend/vendor/ltx-2/LICENSE` for details.

KMCE Educator Platform video generation integration is part of the main platform license.
