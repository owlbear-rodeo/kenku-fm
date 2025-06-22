#!/bin/bash

TOKEN=$2
RELEASE_ID=$3
FILE=$1
FILE_TYPE=$(file -b --mime-type "$FILE")
ASSET_NAME=$4

curl -X POST \
    -H "Content-Type: $FILE_TYPE" \
    -T "$FILE" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://uploads.github.com/repos/fronix/kenku-fm/releases/"${RELEASE_ID}"/assets?name="${ASSET_NAME}"