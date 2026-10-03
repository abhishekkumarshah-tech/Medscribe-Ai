from __future__ import annotations

import sys
from types import SimpleNamespace

import pytest
from app import ai_service
from app.ai_service import AIServiceError


def test_offline_structurer_preserves_note_text_and_does_not_misclassify_throat(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    note = "Patient c/o sore throat and fever. Exam: temp 38.4C, throat erythematous. Assess: likely pharyngitis. Plan: follow up in one week."

    result = ai_service.generate_draft(note)

    assert result["model"] == "offline-structuring-v1"
    assert "sore throat and fever" in result["draft"].split("Examination Findings")[0]
    assert "Examination Findings\n  - Exam: temp 38.4C, throat erythematous." in result["draft"]
    assert "Assessment (as noted by physician)" in result["draft"]
    assert "Plan\n  - Plan: follow up in one week." in result["draft"]
    assert result["generated_at"].tzinfo is None  # naive UTC for SQL compatibility


def test_live_provider_receives_only_note_text_with_timeout(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-a-real-secret")
    monkeypatch.setenv("CARENOTE_AI_MODEL", "test-model")
    captured = {}

    class FakeClient:
        def __init__(self, **kwargs):
            captured["client_options"] = kwargs
            self.messages = SimpleNamespace(create=self.create)

        def create(self, **kwargs):
            captured["request"] = kwargs
            return SimpleNamespace(
                content=[SimpleNamespace(type="text", text="Assessment\n  - As noted.")]
            )

    monkeypatch.setitem(sys.modules, "anthropic", SimpleNamespace(Anthropic=FakeClient))
    result = ai_service.generate_draft("Clinician's raw source note.")

    assert result["draft"] == "Assessment\n  - As noted."
    assert result["model"] == "test-model"
    assert captured["client_options"]["timeout"] == 45.0
    assert captured["client_options"]["max_retries"] == 1
    assert captured["request"]["messages"] == [
        {
            "role": "user",
            "content": "Clinician note text:\n<note>\nClinician's raw source note.\n</note>",
        }
    ]


def test_configured_provider_failure_does_not_fall_back_to_offline_output(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-a-real-secret")

    def provider_failure(_notes):
        raise AIServiceError("provider details should not escape")

    monkeypatch.setattr(ai_service, "_real_generate_draft", provider_failure)
    with pytest.raises(AIServiceError):
        ai_service.generate_draft("A source note.")


def test_empty_live_provider_response_is_an_error(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-not-a-real-secret")

    class EmptyClient:
        def __init__(self, **_kwargs):
            self.messages = SimpleNamespace(create=lambda **_request: SimpleNamespace(content=[]))

    monkeypatch.setitem(sys.modules, "anthropic", SimpleNamespace(Anthropic=EmptyClient))
    with pytest.raises(AIServiceError):
        ai_service.generate_draft("A source note.")
