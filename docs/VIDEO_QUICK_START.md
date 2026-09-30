# LTX-2 Video Generation Quick Start

## 60-Second Overview

LTX-2 is integrated into KMCE to enable **automated video generation** for marketing and outreach. Content agents can now create professional videos from text prompts.

## Quick Setup

### 1️⃣ Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2️⃣ Download Models (Optional for GPU)
```bash
pip install huggingface-hub
hf download Lightricks/LTX-2.5 \
    diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors \
    text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors \
    vae/ltx-2.5-video-vae-bf16.safetensors \
    vae/ltx-2.5-audio-vae-bf16.safetensors \
    latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors \
    --local-dir backend/models/ltx-2.5
```

### 3️⃣ Configure `.env`
```env
LTX_MODELS_PATH=./models/ltx-2.5
VIDEO_OUTPUT_DIR=/tmp/videos
VIDEO_GENERATION_ENABLED=true
```

## API Quick Reference

### Generate Video
```bash
curl -X POST http://localhost:8000/educators/123/videos/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional video explaining nursing CEU requirements and benefits",
    "title": "CEU Benefits Overview",
    "campaign_id": 456,
    "duration_seconds": 60
  }'
```

Response:
```json
{
  "job_id": 789,
  "status": "PENDING",
  "educator_id": 123,
  "created_at": "2026-09-30T04:35:00Z"
}
```

### Check Status
```bash
curl http://localhost:8000/videos/job/789
```

### List Educator Videos
```bash
curl http://localhost:8000/educators/123/videos?limit=20
```

### Link to Campaign
```bash
curl -X POST http://localhost:8000/videos/job/789/link-to-outreach/999
```

## Python Usage

```python
from app.video_service import VideoGenerationService

service = VideoGenerationService()

# Create video
job = service.create_video_job(
    educator_id=123,
    prompt="Create a compelling video about continuing education benefits",
    title="CE Benefits",
    campaign_id=456,
    duration_seconds=60
)

# Check status
video = service.get_video_job(job['id'])
print(f"Status: {video['status']}")
print(f"URL: {video.get('output_url')}")

# Link to outreach
service.link_video_to_outreach(
    video_job_id=job['id'],
    outreach_job_id=999,
    educator_id=123
)
```

## Content Agent Integration

```python
class VideoContentAgent:
    async def create_outreach_video(self, lead, campaign):
        # Generate contextual prompt
        prompt = f"Create a personalized video for {lead.name} about {campaign.offer}"
        
        # Submit video generation
        job = self.video_service.create_video_job(
            educator_id=campaign.educator_id,
            prompt=prompt,
            campaign_id=campaign.id,
            duration_seconds=30
        )
        
        # Wait for completion
        await self.video_service.generate_video(
            job['id'], prompt, duration_seconds=30
        )
        
        # Link to campaign
        self.video_service.link_video_to_outreach(
            job['id'], outreach_id, campaign.educator_id
        )
        
        # Return video URL for inclusion
        completed_job = self.video_service.get_video_job(job['id'])
        return completed_job['output_url']
```

## Database Queries

### Recent Jobs
```sql
SELECT * FROM video_generation_jobs 
WHERE educator_id = 123 
ORDER BY created_at DESC LIMIT 10;
```

### Video Performance
```sql
SELECT v.*, COUNT(DISTINCT va.outreach_job_id) uses
FROM video_generation_jobs v
LEFT JOIN video_assets va ON v.id = va.video_job_id
WHERE v.educator_id = 123
GROUP BY v.id
ORDER BY uses DESC;
```

## Performance Tips

| Task | Optimization |
|------|--------------|
| **Fast iteration** | Use 30-second videos for testing |
| **Batch processing** | Queue multiple jobs, process in parallel |
| **Memory savings** | Reduce `duration_seconds` or `num_frames` |
| **Quality boost** | Increase `num_inference_steps` (default: 50) |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| GPU not detected | `pip install nvidia-cuda-runtime-cu12` |
| Model not found | Verify `LTX_MODELS_PATH` in `.env` |
| Out of memory | Reduce video duration to 30 seconds |
| Jobs pending | Check job status with `/videos/job/{id}` |

## Next Steps

- Read [LTX2_INTEGRATION_GUIDE.md](./LTX2_INTEGRATION_GUIDE.md) for full documentation
- See [VIDEO_GENERATION_SETUP.md](../backend/VIDEO_GENERATION_SETUP.md) for detailed setup
- Check [LTX-2 GitHub](https://github.com/Lightricks/LTX-2) for advanced features

## Key Stats

- **Video Duration**: 30-120 seconds recommended
- **Generation Time**: 30 sec - 5 min on A100 GPU
- **Model Size**: ~66 GB total
- **CPU Fallback**: Available (mock generator for testing)

## API Status

All endpoints are live and ready to use:
- ✅ POST `/educators/{id}/videos/generate`
- ✅ GET `/educators/{id}/videos`
- ✅ GET `/videos/job/{id}`
- ✅ POST `/videos/job/{id}/link-to-outreach/{job_id}`
