#!/bin/bash

function get_latest_release() {
    local TAG=$1
    local TOKEN=$2
    curl --silent -H "Accept: application/vnd.github.v3+json" -H "Authorization: token $TOKEN" "https://api.github.com/repos/owlbear-rodeo/kenku-fm/releases/tags/$TAG" |
        grep -m 1 '"id":' |
        sed -E 's/[^0-9]*//g'
}

TOKEN=$2
RELEASE_TAG=$3
RELEASE_ID=$(get_latest_release "$RELEASE_TAG" "$TOKEN")
FILE=$1
FILE_SIZE=$(stat -f%z "$FILE")
FILE_TYPE=$(file -b --mime-type "$FILE")
ASSET_NAME=$4

curl -X POST \
    -H "Content-Length: $FILE_SIZE" \
    -H "Content-Type: $FILE_TYPE" \
    -T "$FILE" \
    -H "Authorization: token $TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://uploads.github.com/repos/owlbear-rodeo/kenku-fm/releases/"${RELEASE_ID}"/assets?name="${ASSET_NAME}"