#!/bin/bash

CERTIFICATE_PFX=certificate.pfx;
echo "${WINDOWS_CERT_P12}" | base64 -d > $CERTIFICATE_PFX;