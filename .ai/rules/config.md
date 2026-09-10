---
paths:
    - config/database.php
---

# Config

## Valkey (Redis-compatible) is the queue/cache backend

Local infra uses Valkey 9.1.2 via systemd unit `valkey.service` (not redis.service). Laravel's `redis` driver/connection names and `REDIS_*` env vars are intentionally kept unchanged — protocol-compatible, no code/config rename. Any systemd unit or runbook that references redis.service must target valkey.service. `valkey-cli ping` verifies it; phpredis works against it.
