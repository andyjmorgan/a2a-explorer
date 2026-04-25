-- Runs once on an empty data volume via /docker-entrypoint-initdb.d.
-- pgcrypto provides pgp_sym_encrypt / pgp_sym_decrypt used by the agents module to keep
-- saved auth header values encrypted at rest.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
