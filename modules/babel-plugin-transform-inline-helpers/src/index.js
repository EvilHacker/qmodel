/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Inline or import and call shared Babel runtime helper functions.
 *
 * This runtime is suitable for production builds only.
 * The helpers have been simplified and are as "loose" as possible.
 * All diagnostic runtime error checks and throws of exceptions have been removed.
 * It is assumed that the application has already been debugged with a
 * development build that contains a complete and "strict" runtime with diagnostics.
 *
 * This plugin is expected to be used together with babel "loose" mode to
 * minimize the number of referenced helpers; e.g. in babel configuration:
 * @example
 * {
 * 	"presets": [
 * 		[
 * 			"@babel/preset-env",
 * 			{
 * 				"loose": true,
 * 			}
 * 		]
 * 	]
 * }
 *
 * @description
 * Options: Specify only one of the first three option keys.
 * @example
 * {
 * 	// 1) import each helper from its own module from this directory of modules
 * 	helpersDir: "@babel/runtime/helpers"|undefined,
 *
 * 	// 2) import all helpers by name from a single module
 * 	helpersModule: "babel-helpers"|undefined,
 *
 * 	// 3) whether to use helper support in rollup-plugin-babel
 * 	useRollupHelpers: true|undefined
 *
 * 	// optionally, warn if an unexpected helper is encountered
 * 	expectedHelpers: ["assertThisInitialized", "defineProperty"]|undefined
 * }
 *
 * @description
 * Selected Babel runtime helper functions adapted from
 * * node_modules/@babel/runtime/helpers/
 */

/* eslint-disable no-console */

const {
	addNamed: addNamedImport,
	addDefault: addDefaultImport,
} = require('@babel/helper-module-imports')

module.exports = ({types: t}, options = {}) => {
	const helpersDir = options.helpersDir || "@babel/runtime/helpers"
	const helpersModule = options.helpersModule ||
		(options.useRollupHelpers && "\0rollupPluginBabelHelpers.js")

	// make a set of all expected helpers
	let expectedHelpers = undefined
	if (options.expectedHelpers !== undefined) {
		expectedHelpers = {}
		options.expectedHelpers.forEach(helperName => {
			expectedHelpers[helperName] = true
		})
	}

	const allInlineHelpers = {
		// no-op - just return the single argument
		assertThisInitialized: call => call.arguments[0],

		// set a property of an object by name
		defineProperty: call => t.assignmentExpression(
			"=",
			t.memberExpression(
				call.arguments[0],
				call.arguments[1],
				true
			),
			call.arguments[2]
		),
	}

	let currentInlineHelpers = {}

	return {
		name: 'helpers',

		pre(file) {
			// work-around the rollup-plugin-babel preflightCheck()
			if (file.code == 'class Foo extends Bar {};\nexport default Foo;') {
				return
			}

			// name -> identifier
			const helpers = {}

			// identifier.name -> inline(call)
			currentInlineHelpers = {}

			// handle all helpers required by the code being compiled
			file.set("helperGenerator", name => {
				// check if this helper has not yet been encountered
				let identifier = helpers[name]
				if (!identifier) {
					// check if this is a supported helper
					if (!file.availableHelper(name)) {
						throw new Error(`Warning: unavailable helper function: ${name}`)
					}

					// optionally, warn if an unexpected helper is encountered
					if (expectedHelpers !== undefined) {
						if (!expectedHelpers[name])
						{
							console.warn(`Warning: unexpected helper function: ${name}`)
						}
					}

					// check if this helper can be inlined or if it needs to be imported
					const inline = allInlineHelpers[name]
					if (inline) {
						// create a dummy identifier
						identifier = file.scope.generateUidIdentifier(`inlineBabelHelper$${name}`)
						currentInlineHelpers[identifier.name] = inline
					} else {
						// import helper from a single module or from a directory of individual modules
						identifier = helpersModule
							? addNamedImport(file.path, name, helpersModule)
							: addDefaultImport(file.path, `${helpersDir}/${name}`)
					}
					helpers[name] = identifier
				}

				return identifier
			})
		},

		visitor: {
			CallExpression(path) {
				// check if this is a call to a helper that can be inlined
				const inline = currentInlineHelpers[path.node.callee.name]
				if (inline) {
					// replace the call to the helper function with inline code
					path.replaceWith(inline(path.node))
				}
			}
		}
	}
}
