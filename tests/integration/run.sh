#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
crm_test_container="growth-os-test-$$"
trap 'docker rm -f "$crm_test_container" >/dev/null 2>&1 || true' EXIT
docker run --name "$crm_test_container" -e POSTGRES_PASSWORD=local-test-only -d postgres:17-alpine >/dev/null
for attempt in {1..30}; do
 if docker exec "$crm_test_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$crm_test_container" psql -U postgres -v ON_ERROR_STOP=1 < tests/integration/bootstrap.sql
docker exec -i "$crm_test_container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/202610050001_growth_foundation.sql
docker exec -i "$crm_test_container" psql -U postgres -v ON_ERROR_STOP=1 < tests/integration/workspace.sql
