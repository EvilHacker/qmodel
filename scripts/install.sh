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
			sed "s@$search@$replace@" "$file" > "${file%.*}.patched.${file##*.}"
			mv "${file%.*}.patched.${file##*.}" "$file"
		done
	}

	# patch "parcel" so that CSS Modules configuration can be overridden, but note that
	# a fix for this should be available in a future "parcel" release
	searchAndReplace \
		' generateScopedName:' \
		' _generateScopedName:' \
		node_modules/parcel-bundler/src/transforms/postcss.js

	# precomputed source mappings and minified version of "preact" will no longer valid - remove them
	rm -f node_modules/preact/dist/preact.min.js
	rm -f node_modules/preact/dist/preact*.map
	searchAndReplace \
		"//# sourceMappingURL=.*" "" \
		node_modules/preact/dist/preact*.js

	# patch "preact" so that textarea children are not diff'ed (for IE and Edge compatability)
	searchAndReplace \
		"if (!hydrating \&\& vchildren \&\& " \
		"if (vnode.nodeName === 'textarea') {} else if ( !hydrating \&\& vchildren \&\& " \
		node_modules/preact/dist/preact*.js

	# remove unused exports from "preact"
	searchAndReplace \
		"\(createElement\: h,$\)" "// \1 //" \
		node_modules/preact/dist/preact*.js
	searchAndReplace \
		"\(cloneElement: cloneElement,$\)" "// \1 //" \
		node_modules/preact/dist/preact*.js
	searchAndReplace \
		"\(rerender: rerender,$\)" "// \1 //" \
		node_modules/preact/dist/preact*.js

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
