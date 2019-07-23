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

	function searchAndReplace {
		local search="$1"; shift
		local replace="$1"; shift
		while [ "$#" -gt 0 ]; do
			local file="$1"; shift
			perl -i -pe "s@$search@$replace@" "$file"
		done
	}

	# patch "parcel" so that CSS Modules configuration can be overridden, but note that
	# a fix for this should be available in a future "parcel" release
	searchAndReplace \
		' generateScopedName:' \
		' _generateScopedName:' \
		node_modules/parcel-bundler/src/transforms/postcss.js

	# can't patch pre-minified version of "preact" - remove it to be certain that it is not used
	rm -f node_modules/preact/dist/preact.min*

	# source mapping included with "preact" are buggy - remove them;
	# would rather have accurate source mappings to built "dist" code instead
	find node_modules/preact -type f -name '*.map' -delete
	searchAndReplace \
		"//# sourceMappingURL=.*" "" \
		node_modules/preact/*.js \
		node_modules/preact/dist/*js

	# patch "preact" so that textarea children are not diff'ed (for IE and Edge compatability)
	searchAndReplace \
		"if \(!hydrating && vchildren && " \
		"if (vnode.nodeName === 'textarea') {} else if ( !hydrating && vchildren && " \
		node_modules/preact/dist/preact.*js

	# remove unused exports from "preact"
	searchAndReplace \
		"(createElement|cloneElement|createRef|rerender)(: [a-zA-Z]*,)$" "// \1\2 //" \
		node_modules/preact/dist/preact.*js

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
