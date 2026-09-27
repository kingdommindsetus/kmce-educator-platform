from pathlib import Path

def test_generator_has_no_send_capability():
    text=(Path(__file__).resolve().parents[1]/"build_approval_queue.py").read_text()
    assert "PENDING_APPROVAL" in text
    assert "smtp" not in text.lower()
    assert "send_message" not in text.lower()
    assert "event date, CE hours, and tuition are still pending" in text
    assert "AGD PACE Provider #441585" in text
