#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

function printUsage {
	echo "$(cut -c 3- <<EOF
		Build this project.
		Usage:
			$0 -h | --help
			$0
				[--prod | --dev]
				[--compress | --no-compress]
				[--preact | --react]
				[--pretty]
		Where:
			-h --help
				Show this help.
			--prod
				Build for production with all optimizations and minimizations, and
				without runtime diagnostics and source map files.
				All files will be output to the `build-prod` directory.
			--dev
				Build for development with runtime diagnostics and source map files, and
				without optimizations and minimizations.
				All files will be output to the `build-dev` directory.
			--compress | --no-compress
				Compress (or not) all output files to .gz and .br forms.
			--preact | --react
				Select either Preact or React as the JSX library.
			--pretty
				Format css and js niceley in a production build.
				Usefull for inspecting the optimized and minified code.
				Note: Has no effect on a dev build which has not been minified.
EOF
	)"
}

# read command line arguments
buildVariant=production
buildOutputDir=build-prod
compressionEnabled=
react=preact
pretty=false
while [ $# != 0 ]; do
	case "$1" in
		--help | -h )
			printUsage
			exit 0
			;;
		--prod )
			buildVariant=production
			buildOutputDir=build-prod
			shift
			;;
		--dev )
			buildVariant=development
			buildOutputDir=build-dev
			shift
			;;
		--compress )
			compressionEnabled=true
			shift
			;;
		--no-compress )
			compressionEnabled=
			shift
			;;
		--preact )
			react=preact
			shift
			;;
		--react )
			react=react
			shift
			;;
		--pretty | --beautify )
			pretty=true
			shift
			;;
		-* )
			echo "Unrecognized option \"$1\"" >&2
			printUsage >&2
			exit 1
			;;
		* )
			echo "Unexpected argument \"$1\"" >&2
			printUsage >&2
			exit 1
			;;
	esac
done

# setup npm environment at the root of this project
root="$(cd "$(dirname "$0")/.."; pwd)"
PATH="$root/node_modules/.bin:$PATH"
cd "$root"

# ensure that required javascript packages are installed
scripts/install.sh --lazy

# remove any previous build artifacts
rm -rf "$buildOutputDir" || true

# build with rollup
rollup \
	-c .rollup.config.js \
	--environment "NODE_ENV:$buildVariant" \
	--environment "REACT:$react" \
	--environment "PRETTY:$pretty"

pushd "$buildOutputDir" >/dev/null

echo
if [ "$compressionEnabled" ]; then
	echo "🗜  Compressing all files..."
else
	echo "📂  Output files..."
fi

# loop over all output files
find . -type f \
	-not -name '*.gz' \
	-not -name '*.br' \
	-not -name '*.map' \
	| cut -c 3- \
	| sort \
	| while read -r file
do
	if [ "$compressionEnabled" ]; then
		# compress the file and print sizes
		node "$root/scripts/compress.js" "$file"
	else
		# print the file size
		node -e '
			const fs = require("fs")
			const file = '"'$file'"'
			console.log(`╰── ${file.padEnd(40)}${fs.statSync(file).size.toString().padStart(9)} B`)'
	fi
done

popd >/dev/null
