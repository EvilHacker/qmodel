#!/bin/bash

#
# List all known SVG attributes that have kebab-case names.
#
# Data is downloaded and extracted from the following online sources:
# * https://www.w3.org/TR/SVG2/attindex.html
# * https://www.w3.org/TR/SVG11/attindex.html
# * https://github.com/Thomazella/react-known-props/tree/master/src/generated
#

# exit from the script immediately if an error is encountered
set -e

function downloadSvgKebabProps {
	(
		# SVG 2.0 spec
		curl https://www.w3.org/TR/SVG2/attindex.html#PresentationAttributes \
			| grep -o '>[a-zA-Z0-9_]*-[a-zA-Z0-9_-]*<'

		# SVG 1.1 spec
		curl https://www.w3.org/TR/SVG11/attindex.html#PresentationAttributes \
			| grep -o '‘[a-zA-Z0-9_]*-[a-zA-Z0-9_-]*‘'

		# known by react
		local thomazella=https://raw.githubusercontent.com/Thomazella/react-known-props/master/src/generated
		curl "$thomazella"/svgPropToReactPropMap.js \
			| grep -o '"[a-zA-Z0-9_]*-[a-zA-Z0-9_-]*"'
		curl "$thomazella"/reactSvgElementsToPropsMap.js \
			| sed 's/"[a-zA-Z0-9_-]*":/"?":/g' \
			| grep -o '"[a-zA-Z0-9_]*-[a-zA-Z0-9_-]*"'

	) | tr -d '<>‘"' | sort -u
}

svgKebabProps="$(downloadSvgKebabProps)"
svgKebabPropPrefixes="$((grep -v '^panose-1'| cut -d - -f 1 | sort -u | tr '\n' '|') <<< "$svgKebabProps")"

echo
echo "$svgKebabProps"
echo
echo "/^(?:"${svgKebabPropPrefixes%|}")[A-Z]|^panose1/"
