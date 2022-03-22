#!/bin/bash

WINDOWS_CERT_PASSWORD=$1
CERTIFICATE_PFX=certificate.pfx;
echo "${WINDOWS_CERT_P12}" | base64 -d > $CERTIFICATE_PFX;

yarn install --non-interactive --frozen-lockfile --cwd ./publish/windows/

node ./publish/windows/index.js "./" v1.0.0-beta-2