---
paths:
    - 'tests/**'
---

# Tests

## Pin factory status in state-assuming tests

ConsultationFactory randomizes status (completed/chatting) and cough_risk. Any test that assumes reuse, counts, or a specific state must pin attributes explicitly (e.g. create(['status' => 'chatting'])), otherwise the suite goes red at random.
