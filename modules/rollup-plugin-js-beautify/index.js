/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * TODO: handle source map
 */

const beautify = require('js-beautify/js/lib/beautify').js_beautify

module.exports = function jsBeautifyPlugin(pluginOptions = {}) {
	return {
		name: 'js-beautify',

		renderChunk(code, chunk, options) {
			if (options.sourcemap) {
				// don't break the source map
				return undefined
			}

			return beautify(code, pluginOptions)
		}
	}
}