/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Intern large string literals, numeric literals, and property references.
 *
 * TODO: Complete *propertyInitializers* option implementation.
 * * calculate expected code size change
 * * transpile computed properties
 */

module.exports = ({types: t}, options = {}) => {
	// get options with default values
	const {
		minLength,
		minOccurrences,
		propertyInitializers,
		propertyAccessors,
		filter,
		variableBaseName,
		variableNameLength,
	} = {
		minLength: 2,
		minOccurrences: 2,
		propertyInitializers: false,
		propertyAccessors: true,
		filter: ({bytesNow, bytesIfInterned}) => bytesNow > bytesIfInterned,
		variableBaseName: "literal",
		variableNameLength: 2, // assumed after mangling
		...options
	}
	const excluded = new Set(options.exclude)

	let literals

	return {
		name: 'intern',

		pre() {
			literals = new Map()
		},

		visitor: {
			Literal(path) {
				const {node} = path

				if (node.interned) {
					// skip literal that has already been interned
					return
				}

				if (!propertyInitializers && path.parent.key === node) {
					// ignore object literal property key
					return
				}

				if (node.type == "NumericLiteral") {
					// continue
				} else if (node.type == "StringLiteral") {
					// check the parent node type
					if (!(path.parent.type in {
						AssignmentExpression: true,
						BinaryExpression: true,
						CallExpression: true,
						LogicalExpression: true,
						UnaryExpression: true,
						VariableDeclarator: true,
						ObjectProperty: true,
						JSXAttribute: true,
					})) {
						// ignore literal within an unknown parent type
						return
					}
				} else {
					// ignore unknown literal type
					return
				}

				// keep track of all literals and their references
				let literal = literals.get(node.value)
				if (!literal) {
					literals.set(node.value, literal = {
						node: { ...node, interned: true },
						refs: [],
						propertyCount: 0
					})
				}
				literal.refs.push(path)
			},

			...propertyAccessors ? {
				MemberExpression(path) {
					if (path.node.computed) {
						// property referenced indirectly
						return
					}

					const string = path.node.property.name
					if (string == null) {
						// property not referenced by an identifier
						return
					}

					// keep track of all accessed properties and their references
					let literal = literals.get(string)
					if (!literal) {
						literals.set(string, literal = {
							node: { ...t.stringLiteral(string), interned: true },
							refs: [],
							propertyCount: 0
						})
					}
					literal.refs.push(path.get("property"))
					++literal.propertyCount
				}
			} : {},

			Program: {
				exit(path) {
					// check for an iife wrapper
					let insertionPath = path.get("body")
					if (insertionPath.length == 1
						&& insertionPath[0].isExpressionStatement()
						&& insertionPath[0].get("expression").isCallExpression()
						&& insertionPath[0].get("expression.callee").isFunctionExpression()
						&& insertionPath[0].get("expression.callee.body").isBlockStatement()
					) {
						// insert constants within the iife wrapper
						insertionPath = insertionPath[0].get("expression.callee.body.body.0")
					} else {
						// insert constants at the global scope
						insertionPath = insertionPath[0]
					}

					for (var [value, literal] of literals.entries()) {
						// check the number of references to the literal
						const occurrences = literal.refs.length
						if (occurrences < minOccurrences) {
							// not enough references to the literal
							continue
						}

						// check if this literal has been explicitly excluded from interning
						if (excluded.has(value)) {
							continue
						}

						// check the raw literal length
						const raw = literal.node.extra && ("raw" in literal.node.extra)
							? literal.node.extra.raw
							: JSON.stringify(value)
						const length = raw.length
						if (length < minLength) {
							// raw literal length (in characters) is too short
							continue
						}

						// check if literal should be interned or not
						if (!filter({
							value: value,
							raw: raw,
							occurrences: occurrences,
							propertyOccurrences: literal.propertyCount,
							bytesNow: occurrences * length
								- literal.propertyCount * 2, // without quotes
							bytesIfInterned: length + variableNameLength + 2 // v=...,
								+ occurrences * variableNameLength
								+ literal.propertyCount * 2 // for []
						})) {
							continue
						}

						// define a constant for the literal
						const constant = insertionPath.scope.generateUidIdentifier(variableBaseName)
						insertionPath.insertBefore(t.variableDeclaration(
							"var", // "const" does not work with IE
							[
								t.variableDeclarator(constant, literal.node)
							])
						)

						// replace all references to the literal with references to the constant
						literal.refs.forEach(ref => {
							if (ref.parent.type === "MemberExpression") {
								ref.parent.computed = true
								ref.replaceWith(constant)
							} else if (ref.parent.type === "ObjectProperty" && ref.key === "key") {
								ref.parent.computed = true // TODO: transpile this
								ref.replaceWith(constant)
							} else if (ref.parent.type === "JSXAttribute") {
								ref.replaceWith(t.jsxExpressionContainer(constant))
							} else {
								ref.replaceWith(constant)
							}
						})
					}
				}
			},
		}
	}
}
