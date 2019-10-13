/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Inline imported svg files. i.e.:
 * `<Svg/>` -> `<svg>...</svg>`
 *
 * For example, the following code...
 * @example
 * import Cat from 'cat.svg'
 * import Dog from 'dog.svg'
 * const pets = <div>
 * 	pet 1: <Cat/>
 * 	pet 2: <Dog/>
 * 	pet 3: <Cat/>
 * <div/>
 *
 * @description
 * After initial packaging and this transformation it will become...
 * @example
 * const Cat = () => <svg props>cat...</svg>
 * const Dog = () => <svg props>dog...</svg>
 * const _Cat = Cat()
 * const _Dog = Dog()
 * const pets = <div>
 * 	pet 1: {_Cat}
 * 	pet 2: {_Dog}
 * 	pet 3: {_Cat}
 * <div/>
 *
 * @description
 * After other code optimizations it should become...
 * @example
 * const _Cat = <svg props>cat...</svg>
 * const pets = <div>
 * 	pet 1: {_Cat}
 * 	pet 2: <svg props>dog...</svg>
 * 	pet 3: {_Cat}
 * <div/>
 *
 * @description
 * This plugin assumes that .svg files are handled by SVGR which
 * produces a React function component (a function that returns JSX)
 * as the default export of the module.
 *
 * This SVG function component is known to be pure (with no side effect)
 * and will produce an equivalent result when given the same props (arguments).
 *
 * Currently, only empty – ones with no children and no attributes –
 * SVG elements are handled.
 * TODO: Handle SVG elements with one or more immutable properties.
 *
 * Best to use only for production builds.
 */

module.exports = ({types: t}) => ({
	name: 'inline-svgr',

	visitor: {
		JSXElement(path) {
			const {node} = path

			// check for an empty element (no children and no attributes)
			if (node.children.length || node.openingElement.attributes.length) {
				// not empty
				return
			}

			// check for an uppercase tag
			const tagName = node.openingElement.name.name
			if (tagName[0].toUpperCase() !== tagName[0]) {
				// skip lowercase tag
				return
			}

			// check for a binding to an .svg file import
			const binding = path.scope.getBinding(tagName)
			if (!binding
				|| !binding.path
				|| !t.isImportDeclaration(binding.path.parent)
				|| !binding.path.parent.specifiers
				|| binding.path.parent.specifiers.length < 1
				|| !t.isImportDefaultSpecifier(binding.path.parent.specifiers[0])
				|| binding.path.parent.specifiers[0] !== binding.path.node
				|| !binding.path.parent.source.value.toLowerCase().endsWith(".svg")
			) {
				// not the default import from an .svg file
				return
			}

			// check if we have not yet extracted this svg import
			let svgId = binding.svgId
			if (!svgId) {
				// call the function and assign the result to a new variable
				svgId = binding.svgId = path.scope.generateUidIdentifier(tagName)
				binding.path.parentPath.insertAfter(t.variableDeclaration(
					"const",
					[
						t.variableDeclarator(
							svgId,
							t.callExpression(binding.path.node.local, []))
					])
				)
			}

			// replace this JSX element with the variable
			path.replaceWith(svgId)
		},
	}
})
