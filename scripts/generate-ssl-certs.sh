#!/bin/bash

# Generate self-signed SSL certificates for localhost HTTPS development
# This script creates certificates valid for localhost and 127.0.0.1

set -e

CERT_DIR=".certs"
KEY_FILE="${CERT_DIR}/localhost-key.pem"
CERT_FILE="${CERT_DIR}/localhost-cert.pem"

# Create certs directory if it doesn't exist
mkdir -p "${CERT_DIR}"

# Check if certificates already exist
if [ -f "${KEY_FILE}" ] && [ -f "${CERT_FILE}" ]; then
  echo "✅ SSL certificates already exist at ${CERT_DIR}/"
  echo "   To regenerate, delete the files and run this script again."
  exit 0
fi

echo "🔐 Generating self-signed SSL certificates for localhost..."

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout "${KEY_FILE}" \
  -out "${CERT_FILE}" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificate files:"
echo "   Key:  ${KEY_FILE}"
echo "   Cert: ${CERT_FILE}"
echo ""
echo "⚠️  Browser Warning:"
echo "   Your browser will show a security warning for self-signed certificates."
echo "   This is normal for development. Click 'Advanced' → 'Proceed to localhost'"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart your dev server: pnpm dev"
echo "   2. Access your app at: https://localhost:5173"
echo "   3. Accept the certificate warning in your browser"





