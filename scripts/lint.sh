#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

root="$(cd "$(dirname "$0")/.."; pwd)/"

cd "$root"

# JS
eslint -f node_modules/eslint-friendly-formatter source

# CSS
stylelint --formatter unix --allow-empty-input 'source/*.css source/**/*.css' | while read -r line; do
	# strip full path to current directory from start of line
	if [ "${line:0:${#root}}" = "$root" ]; then
		line="${line:${#root}}"
	fi
	echo "$line"
done
