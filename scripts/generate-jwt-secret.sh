#!/usr/bin/env bash
set -euo pipefail

OUT_FILE=${1:-./jwt_secret.key}
if [ -f "$OUT_FILE" ]; then
  echo "File $OUT_FILE already exists. To overwrite, remove it first." >&2
  exit 2
fi

# Generate a 64-byte hex secret
openssl rand -hex 64 > "$OUT_FILE"
chmod 600 "$OUT_FILE"
cat <<EOF
Wrote new JWT secret to: $OUT_FILE
Add to your environment:
  export JWT_SECRET_FILE=$OUT_FILE
On production, store the secret in your vault and expose via secrets manager.
EOF
