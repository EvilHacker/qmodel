/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * This is a Babel macro to minify code snippets at compile time by
 * removing unnecessary whitespace.
 *
 * It is designed to handle only the simple code snippets in this project, and
 * is NOT intended for general use. For example, it will modify the contents of
 * string literals and does not work with comments.
 *
 * For example, the following code:
 *
 * @example
 * import c from './codeSnippet.macro'
 * var code = c`
 * 	for (var i = ${start}; i < ${stop}; ++i) {
 * 		while (doSomething(i, ${value} + i)) {
 * 			doSomethingElse(i);
 * 		}
 * 	}`
 *
 * @description
 * Will be minified to:
 *
 * @example
 * var code = `for(var i=${start};i<${stop};++i){while(doSomething(i,${value}+i)){doSomethingElse(i);}}`
 */

const { createMacro, MacroError } = require('babel-plugin-macros')

function minifyCodeSnippet(code) {
	// remove unnecessary whitespace
	return code
		.trim()
		.replace(/[ \t\n\r]+/g, " ")
		.replace(/([,;:!?()[\]{}])[ ]/g, "$1")
		.replace(/[ ]([,;:!?()[\]{}])/g, "$1")
		.replace(/([+\-*/%&|^<>~='"`])[ ]([a-zA-Z0-9_])/g, "$1$2")
		.replace(/([a-zA-Z0-9_])[ ]([+\-*/%&|^<>~='"`])/g, "$1$2")
}

module.exports = createMacro(({references}) => {
	for (const tag in references) {
		references[tag].forEach(path => {
			const literalPath = path.parentPath
			const literalNode = literalPath.node

			if (literalPath.type !== 'TaggedTemplateExpression') {
				const error = new MacroError(
					`Expected macro usage: ${tag}\`code("in a \${template}", string);\``)
				if (literalNode.loc) {
					error.loc = literalNode.loc.start
				}
				throw error
			}

			// minify every string in the literal
			literalNode.quasi.quasis.forEach(({value}) => {
				value.cooked = minifyCodeSnippet(value.cooked)
			})

			// convert the tagged template literal to a regular template string
			literalPath.replaceWith(literalNode.quasi)
		})
	}
})
