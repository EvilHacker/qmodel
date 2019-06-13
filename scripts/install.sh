#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

root="$(cd "$(dirname "$0")/.."; pwd)"

cd "$root"

# if --lazy option given, check if the list of required javascript packages has been changed
if [ "$1" != "--lazy" ] \
	|| [ scripts/install.sh -nt node_modules/.installed ] \
	|| [ package.json -nt node_modules/.installed ] \
	|| [ package-lock.json -nt node_modules/.installed ]
then
	# empty the cache
	rm -rf .cache || true

	# install all required javascript packages (if not installed already) and remove unneeded packages
	npm install

	# update timestamp on this file to indicate when packages were last checked
	touch node_modules/.installed
fi

# check if any configuration files have changed
if [ "$(find . -maxdepth 1 '(' -name '.*.js' -or -name '.*rc' ')' -newer node_modules/.installed -print -quit)" ]
then
	# empty the cache
	rm -rf .cache || true

	# update timestamp on this file to indicate when packages were last checked
	touch node_modules/.installed
fi
