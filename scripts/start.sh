#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

root="$(cd "$(dirname "$0")/.."; pwd)"

cd "$root"

# ensure that required javascript packages are installed
scripts/install.sh --lazy

if [ "$1" == "--prod" ]; then
	# ensure that the production variant has been built
	if [ ! -f build-prod/index.html ]; then
		npm run build
	fi

	# serve the built files
	http-server build-prod --gzip -p 1234
else
	# use "parcel" to serve and monitor source files for changes
	parcel serve \
		--out-dir build-dev \
		source/index.html
fi
