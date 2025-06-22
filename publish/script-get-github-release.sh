#!/bin/bash

TAG=$1
TOKEN=$2

function get_latest_release() {
    local TAG=$1
    local TOKEN=$2
    curl --silent -H "Accept: application/vnd.github.v3+json" -H "Authorization: token $TOKEN" "https://api.github.com/repos/fronix/kenku-fm/releases/tags/$TAG" |
        grep -m 1 '"id":' |
        sed -E 's/[^0-9]*//g'
}

RESULT=$(get_latest_release "$TAG" "$TOKEN")

echo "$RESULT"