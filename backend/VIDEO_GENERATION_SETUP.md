# LTX-2 Video Generation Integration

This guide explains how to set up and use the LTX-2 video generation capabilities in the KMCE Educator Platform.

## Overview

LTX-2 is a state-of-the-art DiT-based audio-video foundation model that enables:
- **Synchronized audio and video generation** from text prompts
- **Multiple performance modes** from real-time to highest quality
- **Production-ready outputs** for professional use
- **Content agents** can automatically generate marketing videos

## Architecture

### Database Schema

Three new tables support video generation:

1. **video_generation_jobs**: Tracks video generation requests and status
2. **video_assets**: Manages generated video files and their usage
3. Integration points with existing `outreach_jobs` for campaign content

### API Endpoints

#### Create Video Generation Job
```
POST /educators/{educator_id}/videos/generate

Request:
{
  "prompt": "A professional educator explaining their course benefits",
  "title": "Course Introduction Video",
  "campaign_id": 123,
  "duration_seconds": 60
}

Response:
{
  "job_id": 456,
  "status": "PENDING",
  "educator_id": 789,
  "created_at": "2026-09-30T04:35:00Z"
}
```

#### List Educator Videos
```
GET /educators/{educator_id}/videos?limit=20
```

#### Check Video Job Status
```
GET /videos/job/{job_id}
```

#### Link Video to Outreach Campaign
```
POST /videos/job/{job_id}/link-to-outreach/{outreach_job_id}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt

# Optional: For GPU acceleration
pip install nvidia-cuda-runtime-cu12>=12.1 nvidia-cudnn-cu12>=9.0
```

### 2. Download LTX-2 Models

The system supports two configurations:

**Option A: Local GPU Setup (Recommended for High Performance)**

```bash
# Install HuggingFace CLI
pip install huggingface-hub

# Login with your HuggingFace token
hf auth login

# Download models (~66 GB)
hf download Lightricks/LTX-2.5 \
    diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors \
    text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors \
    vae/ltx-2.5-video-vae-bf16.safetensors \
    vae/ltx-2.5-audio-vae-bf16.safetensors \
    latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
    --local-dir models/ltx-2.5
```

**Option B: Cloud/Mock Setup (For Testing)**

The system includes a mock video generator for development and testing without GPU requirements.

### 3. Configure Environment

Create `.env` file in the backend directory:

```env
# Video Generation
LTX_MODELS_PATH=/path/to/models/ltx-2.5
VIDEO_OUTPUT_DIR=/tmp/videos
VIDEO_GENERATION_ENABLED=true

# Optional: Queue settings for background jobs
VIDEO_QUEUE_BACKEND=simple  # or 'celery' for production
VIDEO_MAX_CONCURRENT_JOBS=2

# Storage (for production deployment)
VIDEO_STORAGE_TYPE=local  # or 's3', 'gcs'
VIDEO_STORAGE_BUCKET=videos-bucket
```

### 4. Database Migration

The database schema is automatically initialized on first startup via `init_db()`.

## Usage Examples

### Content Creator Agent Integration

```python
# Example: Content creation agent generating marketing video
from app.video_service import VideoGenerationService

video_service = VideoGenerationService()

# Create video generation job
job = video_service.create_video_job(
    educator_id=789,
    prompt="Professional video explaining why CEUs matter for nurses",
    title="CEU Benefits Explainer",
    campaign_id=123,
    duration_seconds=60
)

# Job processes asynchronously
# Check status with: video_service.get_video_job(job["id"])
```

### Outreach with Video

```python
# 1. Create outreach job as usual
outreach_job_id = 999

# 2. Generate supporting video
video_job = await video_service.generate_video(
    job_id=123,
    prompt="Personal introduction from the educator",
    duration_seconds=30
)

# 3. Link video to outreach
video_service.link_video_to_outreach(
    video_job_id=123,
    outreach_job_id=999,
    educator_id=789
)

# 4. Video URL can now be included in outreach content
```

## Performance Considerations

### Inference Time

Model performance varies by mode:

- **Distilled (Fast)**: ~30-60 seconds for 60-second video on A100
- **Full (High Quality)**: ~2-5 minutes for 60-second video on A100
- **CPU Fallback**: Mock generator for development (~2 seconds)

### Resource Requirements

**Minimum:**
- 16GB RAM
- 100GB disk space for models

**Recommended (for real-time applications):**
- 80GB+ VRAM (A100 or H100)
- 500GB disk space
- High-speed storage (NVMe preferred)

## Content Agent Capabilities

The integration enables content agents to:

1. **Generate Educational Content**: Videos explaining courses and benefits
2. **Create Personalized Outreach**: Custom videos for lead engagement
3. **Produce Marketing Materials**: Campaign videos with AI-generated narration
4. **Enable Video Messaging**: Professional communication through video

### Example Agent Workflow

```
Agent: Content Creator
Input: Lead info + Campaign details
Steps:
1. Generate video script from lead context
2. Create video using LTX-2 with optimized prompt
3. Link to outreach campaign
4. Include video URL in email/message template
5. Track video performance metrics
Output: Enhanced outreach with 3x engagement potential
```

## Monitoring and Logging

### Check Video Job Status

```python
job = video_service.get_video_job(job_id=123)
print(f"Status: {job['status']}")
print(f"Output URL: {job['output_url']}")
if job['status'] == 'FAILED':
    print(f"Error: {job['error_message']}")
```

### Database Queries

```sql
-- List recent video jobs
SELECT * FROM video_generation_jobs 
WHERE educator_id = ? 
ORDER BY created_at DESC;

-- Check video usage
SELECT * FROM video_assets 
WHERE educator_id = ? 
ORDER BY created_at DESC;
```

## Troubleshooting

### GPU Not Detected

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU count: {torch.cuda.device_count()}")
print(f"GPU name: {torch.cuda.get_device_name(0)}")
```

### Model Loading Issues

1. Verify model files are complete (should total ~66GB)
2. Check disk space: `df -h /path/to/models`
3. Ensure HuggingFace authentication: `hf auth login`

### Out of Memory

Reduce `duration_seconds` or `num_inference_steps`:

```python
job = video_service.create_video_job(
    ...,
    duration_seconds=30  # Shorter videos use less memory
)
```

## Production Deployment

### Load Balancing

For production, deploy multiple video generation workers:

```yaml
# Docker Compose example
services:
  video-worker-1:
    image: kmce/video-generator
    environment:
      - WORKER_ID=1
      - QUEUE_BROKER=redis://queue:6379
  
  video-worker-2:
    image: kmce/video-generator
    environment:
      - WORKER_ID=2
      - QUEUE_BROKER=redis://queue:6379
```

### Storage

For production, configure cloud storage:

```python
# In config.py
VIDEO_STORAGE_TYPE = "s3"  # or "gcs"
VIDEO_STORAGE_BUCKET = "educator-videos-prod"
```

## References

- **LTX-2 Repository**: https://github.com/Lightricks/LTX-2
- **Model Card**: https://huggingface.co/Lightricks/LTX-2.5
- **Paper**: https://arxiv.org/abs/2601.03233
- **Documentation**: https://ltx.io/docs

## License

LTX-2 is provided under the Lightricks license. See LICENSE files in the LTX-2 repository.
