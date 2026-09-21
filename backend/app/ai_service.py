"""
AI service abstraction.

Single entry point: generate_draft(raw_notes, patient_context) -> str

- If ANTHROPIC_API_KEY (or OPENAI_API_KEY) is set in the environment, this
  calls the real LLM to turn free-text consultation notes into a structured
  draft.
- If no key is configured, it falls back to a deterministic MOCK AI mode
  so the whole product demo works offline, reproducibly, with no network
  calls and no cost. The mock is intentionally simple pattern-extraction —
  it does NOT diagnose or invent clinical facts; it only reorganizes what
  the doctor typed.

Every call site must treat the result as an unreviewed AI DRAFT: the
calling code is responsible for labelling it as such and requiring doctor
approval before it becomes part of the final record.
"""
import os
import re
import datetime as dt

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL_NAME = os.getenv("CARENOTE_AI_MODEL", "claude-sonnet-4-6")

SYSTEM_PROMPT = """You are a clinical documentation assistant. You convert a doctor's
unstructured consultation notes into a clean, structured clinical note draft.

Rules:
- Use ONLY information present in the doctor's notes. Never invent symptoms,
  history, vitals, diagnoses, or medications that were not stated.
- Do NOT diagnose. If the notes mention a suspected condition, present it as
  "Assessment (as noted by physician)", not as a confirmed diagnosis.
- Output the following sections, omitting a section only if the notes truly
  give nothing for it: Chief Complaint, History of Present Illness,
  Examination Findings, Assessment, Plan.
- Keep clinical terminology the doctor used; do not embellish.
- Output plain text with section headings, no markdown asterisks.
"""


def _mock_generate_draft(raw_notes: str, patient_context: str) -> str:
    """Deterministic, offline structuring of free-text notes.

    This is intentionally conservative: it buckets sentences by keyword
    into standard clinical-note sections rather than synthesizing new
    content, so it never introduces information the doctor did not write.
    """
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|\n+', raw_notes) if s.strip()]

    buckets = {
        "Chief Complaint": [],
        "History of Present Illness": [],
        "Examination Findings": [],
        "Assessment (as noted by physician)": [],
        "Plan": [],
    }

    exam_kw = ["exam", "bp", "blood pressure", "pulse", "temp", "auscultation",
               "palpation", "hr", "spo2", "rr", "vitals", "inspection"]
    assess_kw = ["assess", "diagnos", "suspect", "likely", "impression", "r/o", "rule out"]
    plan_kw = ["plan", "prescrib", "advise", "follow up", "follow-up", "refer",
               "recommend", "start", "continue", "medication", "dose", "mg"]
    chief_kw = ["complain", "presents with", "c/o", "reports", "chief complaint"]

    for s in sentences:
        low = s.lower()
        if any(k in low for k in plan_kw):
            buckets["Plan"].append(s)
        elif any(k in low for k in assess_kw):
            buckets["Assessment (as noted by physician)"].append(s)
        elif any(k in low for k in exam_kw):
            buckets["Examination Findings"].append(s)
        elif any(k in low for k in chief_kw) or not buckets["Chief Complaint"]:
            buckets["Chief Complaint"].append(s)
        else:
            buckets["History of Present Illness"].append(s)

    # First sentence is almost always the presenting complaint if nothing matched yet
    if not buckets["Chief Complaint"] and sentences:
        buckets["Chief Complaint"].append(sentences[0])

    lines = []
    for section, items in buckets.items():
        if items:
            lines.append(section)
            for it in items:
                lines.append(f"  - {it}")
            lines.append("")

    if not lines:
        lines = ["Chief Complaint", "  - (No structured content could be extracted from the notes provided.)"]

    return "\n".join(lines).strip()


def _real_generate_draft(raw_notes: str, patient_context: str) -> str:
    """Calls the configured LLM. Only used when an API key is present."""
    import anthropic  # imported lazily so the mock path has zero extra deps

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_prompt = f"""Patient context: {patient_context}

Doctor's raw consultation notes:
\"\"\"{raw_notes}\"\"\"

Produce the structured draft now."""

    resp = client.messages.create(
        model=MODEL_NAME,
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text for block in resp.content if hasattr(block, "text")).strip()


def generate_draft(raw_notes: str, patient_context: str = "") -> dict:
    """Returns {"draft": str, "model": str, "generated_at": iso str}."""
    if ANTHROPIC_API_KEY:
        try:
            draft = _real_generate_draft(raw_notes, patient_context)
            model = MODEL_NAME
        except Exception as exc:  # network/lib issues -> safe fallback, never crash the demo
            draft = _mock_generate_draft(raw_notes, patient_context)
            draft += f"\n\n[Note: live AI call failed ({exc.__class__.__name__}); showing offline structuring instead.]"
            model = "mock-fallback"
    else:
        draft = _mock_generate_draft(raw_notes, patient_context)
        model = "mock-ai-v1"

    return {
        "draft": draft,
        "model": model,
        "generated_at": dt.datetime.utcnow(),
    }
