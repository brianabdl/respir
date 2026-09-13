---
paths:
    - 'database/migrations/**'
---

# Migrations

## pgvector: test DB is a Postgres database named ":memory:"

pgvector: the test suite connects to a REAL PostgreSQL database literally named ":memory:" (phpunit.xml sets DB_DATABASE=:memory: while DB_CONNECTION=pgsql is forced on the CLI). That database needs `CREATE EXTENSION vector` run once as the postgres superuser — local app connection cannot create it. The enable_pgvector_extension migration checks pg_extension first and only creates when missing, and skips entirely for non-pgsql drivers, so sqlite/CI does not break. cough_embeddings uses Laravel's native Blueprint vector('embedding', 512) + vectorIndex() (hnsw, vector_cosine_ops).
