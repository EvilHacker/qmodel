#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

root="$(cd "$(dirname "$0")/.."; pwd)"

cd "$root"

# remove all build artifacts
rm -rf .cache parcel-debug-*.log build-dev build-prod || true

if [ "$1" == "--all" ]; then
	# remove all local javascript packages too
	rm -rf node_modules || true
fi
