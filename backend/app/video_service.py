import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings
from app.db import get_connection


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class VideoGenerationService:
    def __init__(self):
        self.models_path = os.getenv("LTX_MODELS_PATH", "/models/ltx-2.5")
        self.output_dir = Path(os.getenv("VIDEO_OUTPUT_DIR", "/tmp/videos"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.ltx_available = self._check_ltx_available()

    def _check_ltx_available(self) -> bool:
        try:
            import torch
            from ltx_pipelines.distilled import StableVideoDiffusionPipeline
            return torch.cuda.is_available()
        except ImportError:
            return False

    def create_video_job(
        self,
        educator_id: int,
        prompt: str,
        title: Optional[str] = None,
        campaign_id: Optional[int] = None,
        duration_seconds: int = 60,
        priority: str = "NORMAL",
    ) -> dict:
        conn = get_connection()
        try:
            ts = now_iso()
            cur = conn.execute(
                """INSERT INTO video_generation_jobs(
                    educator_id, campaign_id, prompt, title, duration_seconds,
                    status, model_version, created_at
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    educator_id,
                    campaign_id,
                    prompt,
                    title or f"Video for {educator_id}",
                    duration_seconds,
                    "PENDING",
                    "ltx-2.5",
                    ts,
                ),
            )
            job_id = cur.lastrowid
            conn.commit()
            return {
                "id": job_id,
                "educator_id": educator_id,
                "status": "PENDING",
                "created_at": ts,
            }
        finally:
            conn.close()

    def get_video_job(self, job_id: int) -> Optional[dict]:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT * FROM video_generation_jobs WHERE id = ?", (job_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def list_educator_videos(self, educator_id: int, limit: int = 20) -> list:
        conn = get_connection()
        try:
            rows = conn.execute(
                """SELECT * FROM video_generation_jobs
                   WHERE educator_id = ?
                   ORDER BY created_at DESC
                   LIMIT ?""",
                (educator_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    async def generate_video(
        self, job_id: int, prompt: str, duration_seconds: int = 60
    ) -> dict:
        if not self.ltx_available:
            return await self._mock_generate_video(job_id, prompt, duration_seconds)

        try:
            import torch
            from ltx_pipelines.distilled import StableVideoDiffusionPipeline

            conn = get_connection()
            conn.execute(
                "UPDATE video_generation_jobs SET status = ?, started_at = ? WHERE id = ?",
                ("PROCESSING", now_iso(), job_id),
            )
            conn.commit()
            conn.close()

            device = "cuda" if torch.cuda.is_available() else "cpu"
            pipeline = StableVideoDiffusionPipeline.from_pretrained(
                self.models_path, torch_dtype=torch.bfloat16
            )
            pipeline = pipeline.to(device)

            num_frames = max(1, int(duration_seconds / 2.5))
            output = pipeline(
                prompt=prompt,
                num_frames=num_frames,
                guidance_scale=7.5,
                num_inference_steps=50,
            )

            video_path = (
                self.output_dir / f"video_job_{job_id}_{datetime.now().timestamp()}.mp4"
            )
            output.videos[0].export(str(video_path))

            conn = get_connection()
            output_url = f"/videos/job_{job_id}"
            conn.execute(
                """UPDATE video_generation_jobs
                   SET status = ?, output_path = ?, output_url = ?, completed_at = ?
                   WHERE id = ?""",
                ("COMPLETED", str(video_path), output_url, now_iso(), job_id),
            )
            conn.commit()
            conn.close()

            return {
                "job_id": job_id,
                "status": "COMPLETED",
                "output_path": str(video_path),
                "output_url": output_url,
            }
        except Exception as e:
            conn = get_connection()
            conn.execute(
                """UPDATE video_generation_jobs
                   SET status = ?, error_message = ?, completed_at = ?
                   WHERE id = ?""",
                ("FAILED", str(e), now_iso(), job_id),
            )
            conn.commit()
            conn.close()

            return {"job_id": job_id, "status": "FAILED", "error": str(e)}

    async def _mock_generate_video(
        self, job_id: int, prompt: str, duration_seconds: int
    ) -> dict:
        await asyncio.sleep(2)
        conn = get_connection()
        video_url = f"https://example.com/videos/job_{job_id}.mp4"
        conn.execute(
            """UPDATE video_generation_jobs
               SET status = ?, output_url = ?, completed_at = ?
               WHERE id = ?""",
            ("COMPLETED", video_url, now_iso(), job_id),
        )
        conn.commit()
        conn.close()
        return {
            "job_id": job_id,
            "status": "COMPLETED",
            "output_url": video_url,
            "mock": True,
        }

    def link_video_to_outreach(
        self, video_job_id: int, outreach_job_id: int, educator_id: int
    ) -> bool:
        conn = get_connection()
        try:
            video_job = conn.execute(
                "SELECT * FROM video_generation_jobs WHERE id = ?", (video_job_id,)
            ).fetchone()
            if not video_job:
                return False

            conn.execute(
                """INSERT INTO video_assets(
                    video_job_id, educator_id, outreach_job_id,
                    asset_type, url, created_at
                ) VALUES(?, ?, ?, ?, ?, ?)""",
                (video_job_id, educator_id, outreach_job_id, "MARKETING", video_job["output_url"], now_iso()),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def get_video_asset(self, video_asset_id: int) -> Optional[dict]:
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT * FROM video_assets WHERE id = ?", (video_asset_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
