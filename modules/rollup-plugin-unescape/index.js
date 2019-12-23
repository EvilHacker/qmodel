/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Replace escape sequences with actual characters where possible.
 *
 * TODO: handle sequence like "\\u1234"
 * TODO: handle source map
 */

const unescapeUnicodeHex = (_, hex) => String.fromCharCode(parseInt(hex, 16))

module.exports = function unescapePlugin() {
	return {
		name: 'unescape',

		renderChunk(code, chunk, options) {
			if (options.sourcemap) {
				// don't break the source map
				return undefined
			}

			code = code.replace(/\\u([0-9a-fA-F]{4})/g, unescapeUnicodeHex)
			code = code.replace(/\\x([0-9a-fA-F]{2})/g, unescapeUnicodeHex)
			code = code.replace(/\\t/g, "\t")

			return code
		}
	}
}
