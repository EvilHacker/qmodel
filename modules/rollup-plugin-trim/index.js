/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * TODO: handle source map
 */

module.exports = function stylelintPlugin() {
	return {
		name: 'trim',

		renderChunk(code, chunk, options) {
			if (options.sourcemap) {
				// don't break the source map
				return undefined
			}

			code = code.trim()
			if (code.endsWith(";")) {
				// remove trailing semicolon
				code = code.slice(0, -1).trim()
			}
			if (code.startsWith("'use strict';")) {
				// remove 'use strict' prefix
				code = code.slice(13).trim()
			}
			if (code.startsWith("(function(){") && code.endsWith("})()")) {
				// remove iife wrapper
				code = code.slice(12, -4).trim()
			}

			return code
		}
	}
}
