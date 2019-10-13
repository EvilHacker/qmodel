#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

root="$(cd "$(dirname "$0")/.."; pwd)"

cd "$root"

# if --lazy option given, check if the list of required javascript packages has been changed
if [ "$1" != "--lazy" ] \
	|| [ scripts/install.sh -nt node_modules/.installed ] \
	|| [ scripts/patchNodeModules.js -nt node_modules/.installed ] \
	|| [ package.json -nt node_modules/.installed ] \
	|| [ package-lock.json -nt node_modules/.installed ]
then
	# empty the cache
	rm -rf .cache || true

	# install all required javascript packages (if not installed already) and remove unneeded packages
	npm install

	# apply patches to the javascript packages
	node scripts/patchNodeModules.js

	# update timestamp on this file to indicate when packages were last checked
	touch node_modules/.installed
fi

# check if any configuration files, local plugins, or macros have changed
newer="-newer node_modules/.installed -print -quit"
if [ "$(find . -type f -maxdepth 1 '(' -name '.*.js' -or -name '.*rc' ')' $newer)" ] \
	|| [ "$(find modules -type f -path 'modules/*-plugin-*' $newer)" ] \
	|| [ "$(find source -type f -name '*.macro.js' $newer)" ]
then
	# empty the cache
	rm -rf .cache || true

	# update timestamp on this file to indicate when packages were last checked
	touch node_modules/.installed
fi
