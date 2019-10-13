#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

function printUsage {
	echo "$(cut -c 3- <<EOF
		Build and continually watch source files for changes.
		Serve the output files on https://localhost:1234 .
		Usage:
			$0 -h | --help
			$0
				[--prod | --dev]
				[--preact | --react]
				[--port=<port>]
		Where:
			-h --help
				Show this help.
			--prod
				Build and serve production variant from the `build-prod` directory.
			--dev
				Build and serve development variant from the `build-prod` directory.
			--preact | --react
				Select either Preact or React as the JSX library.
			--pretty
				Format css and js niceley in a production build.
				Usefull for inspecting the optimized and minified code.
				Note: has no effect on a dev build which has not been minified.
			--port=<port>
				The TCP port number to serve from.
				Default port is 1234.
EOF
	)"
}

# read command line arguments
buildVariant=development
buildOutputDir=build-dev
react=preact
pretty=false
port=1234
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
		--preact )
			react=preact
			shift
			;;
		--react )
			react=react
			shift
			;;
		--pretty )
			pretty=true
			shift
			;;
		--port=* )
			port="${1#*=}"
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

# serve and watch with rollup
rollup --watch \
	-c .rollup.config.js \
	--environment "NODE_ENV:$buildVariant" \
	--environment "REACT:$react" \
	--environment "PRETTY:$pretty" \
	--environment "SERVER_PORT:$port"
