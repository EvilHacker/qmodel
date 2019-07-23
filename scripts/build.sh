#!/bin/bash

# exit from the script immediately if an error is encountered
set -e

if [ "$1" == "--compress" ]; then
	compressionEnabled=true
	shift
fi

root="$(cd "$(dirname "$0")/.."; pwd)"

cd "$root"

# ensure that required javascript packages are installed
scripts/install.sh --lazy

# remove any previous build artifacts
rm -rf build-prod || true

# build with "parcel"
parcel build \
	--no-source-maps \
	--detailed-report 99 \
	--out-dir build-prod \
	--cache-dir .cache/prod \
	source/index.html
echo
parcel build \
	--no-source-maps \
	--experimental-scope-hoisting \
	--detailed-report 99 \
	--out-dir build-prod \
	--cache-dir .cache/prod \
	source/polyfills.js \
	source/favicon.ico

echo

cd build-prod

# minify all js files even more
echo "⚙️  Minifying all js files."
find . -type f -name '*.js' | cut -c 3- | while read -r file; do
	# this sequence minifies js well
	echo "╰── $file"
	terser "$file" --compress passes=1 --mangle \
		| uglifyjs --compress passes=2 --mangle \
		| uglifyjs --compress passes=2 -o "$file"
done

echo

# inline referenced js and css into all html files
echo "⚙️  Inlining js and css into all html files."
find . -type f -name '*.html' | cut -c 3- | while read -r file; do
	# inline referenced js and css into the html
	echo "╰── $file"
	html-inline -i "$file" -o "${file%.html}.inline.html"
	mv "${file%.html}.inline.html" "$file"
done

echo

# remove js and css files cuz they have been inlined into html
find . -type f -name 'source.????????.*' '(' -name '*.js' -or -name '*.css' ')' -delete || true

# optionally, compress all files
if [ "$compressionEnabled" ]; then
	function getFileSize {
		stat -c%s "$1" 2>/dev/null || stat -s "$1" | grep -o ' st_size=[0-9]*' | cut -c 10-
	}

	function compress {
		local file="$1"

		local size="$(getFileSize "$file")"
		printf "╰┬─ %-40s% 9d B\n" "$file" "$size"

		# compress to .gz
		local gzUtil
		if [ "$(which zopfli 2>/dev/null)" != "" ]; then
			gzUtil=zopfli
			zopfli --iterations 99 "$file"
		else
			gzUtil=gzip
			gzip --best --keep -f "$file"
		fi

		local sizeGz="$(getFileSize "$file.gz")"
		printf " ├  %-40s% 9d B (%3.1f%%) with %s\n" \
			"$file.gz" "$sizeGz" "$(node -p <<< "100 * $sizeGz / $size")" "$gzUtil"

		# compress to .br
		if [ "$(which brotli-cli 2>/dev/null)" != "" ]; then
			brotliOutput="$(brotli-cli "$file")"
			if [ "$brotliOutput" != "Processed 1 files" ] || [ ! -f "$file.br" ]; then
				echo "$brotliOutput" >&2
				exit 1
			fi

			local sizeBr="$(getFileSize "$file.br")"
			printf " ├  %-40s% 9d B (%3.1f%%) with brotli\n" \
				"$file.br" "$sizeBr" "$(node -p <<< "100 * $sizeBr / $size")"
		fi
	}

	# compress all files
	echo "🗜  Compressing all files."
	find . -type f -not -name '*.gz' -not -name '*.br' | cut -c 3- | while read -r file; do
		compress "$file"
	done
fi
