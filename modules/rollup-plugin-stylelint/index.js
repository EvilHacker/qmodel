/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

/* eslint-disable no-console */

import { relative } from 'path'
import { createFilter } from "rollup-pluginutils" // cspell:disable-line
import stylelint from 'stylelint'

export default function stylelintPlugin(options = {}) {
	const filter = createFilter(options.include || /[.]css$/, options.exclude)

	return {
		name: 'stylelint',

		async transform(code, id) {
			if (!filter(id)) {
				return
			}

			await stylelint
				.lint({
					...options,
					code,
					codeFilename: id
				})
				.then(result => {
					if (result.output) {
						console.warn(result.output)
					}
					if (result.errored) { // cspell:disable-line
						throw new Error(`[rollup-plugin-stylelint] error(s) in ${relative(__dirname, id)}`)
					}
				})
		}
	}
}
