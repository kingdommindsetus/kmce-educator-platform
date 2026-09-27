from pathlib import Path

def test_founder_ui_uses_live_api_and_has_controls():
    page=(Path(__file__).resolve().parents[2]/"frontend"/"app"/"page.tsx").read_text()
    assert "/admin/educators" in page
    assert "PENDING APPROVAL" in page
    assert "Save edit" in page
    assert "Approve" in page
    assert "Reject" in page
    assert "184" not in page
    assert "Dr Jane Smith" not in page

def test_approval_is_not_send():
    api=(Path(__file__).resolve().parents[1]/"app"/"main.py").read_text()
    assert '@app.post("/outreach/{job_id}/approve")' in api
    assert "smtp" not in api.lower()
