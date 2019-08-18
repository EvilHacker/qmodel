/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Replace import statements with require() calls.
 *
 * The Parcel bundler tree-shaking does not work yet.
 * For now, this is useful to eliminate the extra code overhead that the
 * Parcel bundler adds to support CommonJS and ES6 module inter-operation.
 *
 * This code assumes that the default export of an ES6 module is an object
 * containing all the named exports.
 *
 * For example, the following code:
 *
 * @example
 * import Module1 from 'module1'
 * import {name1, name2 as a } from 'module2'
 * import Module3, {name3, name4 as b } from 'module3'
 *
 * @description
 * Will be transformed into:
 *
 * @example
 * const Module1 = require('module1')
 * const _module = require('module2')
 * const name1 = _module.name1
 * const a = _module.name2
 * const Module3 = require('module3')
 * const name3 = _module.name3
 * const b = _module.name4
 */

module.exports = ({types: t}) => ({
	visitor: {
		ImportDeclaration(path) {
			const {node} = path
			const {specifiers, source} = node
			if (specifiers && specifiers.length > 0) {
				let defaultImport = undefined
				const imports = []
				specifiers.forEach(specifier => {
					if (specifier.type == 'ImportDefaultSpecifier') {
						if (defaultImport) {
							// not expecting multiple default imports
							return
						}
						defaultImport = specifier.local
					} else if (specifier.type == 'ImportSpecifier') {
						imports.push(specifier)
					} else {
						// unknown specifier - don't do anything
						return
					}
				})

				if (!defaultImport) {
					// make up a name for the default import
					defaultImport = path.scope.generateUidIdentifier("import")
				}

				// require() call and assignment to a variable
				const defaultVariable = t.variableDeclaration(
					"const",
					[
						t.variableDeclarator(
							defaultImport,
							t.callExpression(
								t.identifier("require"),
								[
									source
								]
							)
						)
					]
				)

				// extract named imports and assign to variables
				const namedVariables = imports.map(i => t.variableDeclaration(
					"const",
					[
						t.variableDeclarator(
							i.local,
							t.memberExpression(
								defaultImport,
								i.imported
							)
						)
					]
				))

				path.replaceWithMultiple([defaultVariable, ...namedVariables])
			}
		}
	}
})