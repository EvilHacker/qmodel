/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Inline or call shared Babel runtime helper functions.
 *
 * You must prepend helpers.js to your build output.
 *
 * This runtime is suitable for production builds only.
 * The helpers have been simplified and are as "loose" as possible.
 * All diagnostic runtime error checks and throws of exceptions have been removed.
 * It is assumed that the application has already been debugged with a
 * development build that contains a complete and "strict" runtime with diagnostics.
 *
 * This plugin is expected to be used together with these other babel plugins with
 * the "loose" option set to true to minimize the number of referenced helpers.
 * * "transform-es2015-modules-commonjs"
 * * "@babel/transform-classes"
 *
 * Selected Babel runtime helper functions adapted from
 * * node_modules/@babel/runtime/helpers/
 */

const getGlobalName = name => `babelHelpers$${name}`

// supported runtime helpers (globalName -> {name, identifier, inline})
const helpers = {}

module.exports = ({types: t}) => {
	// populate supported runtime helpers
	[
		// calls to non-inlined helper functions in helpers.js
		"inheritsLoose",

		{
			// no-op - just return the single argument
			name: "assertThisInitialized",
			inline: call => call.arguments[0]
		},

		{
			// set a property of an object by name
			name: "defineProperty",
			inline: call => t.assignmentExpression(
				"=",
				t.memberExpression(
					call.arguments[0],
					call.arguments[1],
					true
				),
				call.arguments[2]
			)
		},
	].forEach(helper => {
		const globalName = getGlobalName(helper.name || helper)
		helpers[globalName] = {
			"identifier": t.identifier(globalName),
			...helper
		}
	})

	return {
		pre(file) {
			// handle all helpers required by the code being compiled
			file.set("helperGenerator", name => {
				const helper = helpers[getGlobalName(name)]
				if (helper) {
					// return identifier of the global helper function
					return helper.identifier
				}

				// support for this helper may need to be added
				throw new Error(`Unhandled Babel runtime helper '${name}', see ${__dirname}`)
			})
		},

		visitor: {
			CallExpression(path) {
				// check if this is a call to a helper that can be inlined
				const helper = helpers[path.node.callee.name]
				if (helper && helper.inline) {
					// replace the call to the helper function with inline code
					path.replaceWith(helper.inline(path.node))
				}
			}
		}
	}
}
