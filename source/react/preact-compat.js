/**
 * Compatibility of qmodel with both react and preact libraries is desirable.
 *
 * These are the minimal changes I have discovered to make this project work with
 * preact given the react features used.
 *
 * For 100% compatibility with react, see:
 * * https://github.com/developit/preact-compat, or
 * * the upcoming V10 release of https://github.com/preactjs/preact/releases
 *
 * Changes include:
 * * renaming some SVG attributes from camelCase to kebab-case
 * * handle a defaultValue prop (for textarea and select elements)
 * * checking of propTypes in a development build
 * * a PureComponent class
 * * support for Fragments
 *
 * To switch to react, change this line in .rollup.config.js:
 * `const react = "preact" // select "preact" or "react"`
 *
 * SVG prop references:
 * * https://www.w3.org/TR/SVG2/attindex.html
 * * https://www.w3.org/TR/SVG11/attindex.html
 * * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
 * * https://github.com/Thomazella/react-known-props/tree/master/src/generated
 *
 * A thorough list of SVG kebab-case props can be obtained by the shell command:
 * `./scripts/listSvgKebabProps.sh`
 */

import {
	render,
	h as createElement,
	Component as PreactComponent,
	options
} from 'preact'

// DEVELOPMENT_ONLY_START
import 'preact-devtools' // support for React DevTools (https://fb.me/react-devtools/) in browser
import PropTypes from 'prop-types'
// DEVELOPMENT_ONLY_END

options.vnode = vnode => {
	if (!vnode.normalized) {
		vnode.normalized = true
		const props = vnode.attributes
		if (props && typeof vnode.nodeName == 'string') {
			// rename specific props from camelCase to kebab-case
			for (const prop in props) {
				if (/^(?:fill|stroke|text)[A-Z]/.test(prop)) {
					const value = props[prop]
					delete props[prop]
					props[prop.replace(/([A-Z])/, '-$1').toLowerCase()] = value
				} else if (process.env.NODE_ENV === "development") {
					// in development mode, do a more thorough check
					const allSvgCamelProps = /^(?:accent|alignment|arabic|aria|baseline|cap|clip|color|dominant|enable|fill|flood|font|glyph|horiz|image|letter|lighting|marker|nav|overline|paint|pointer|rendering|shape|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]|^panose1/
					if (allSvgCamelProps.test(prop)) {
						throw new Error(`Prop '${prop}' likely needs to be renamed to '${
							prop.replace(/([A-Z0-9])/, '-$1').toLowerCase()}'`)
					}
				}
			}

			// copy onChange to onInput
			if (props.onChange && !props.onInput) {
				props.onInput = props.onChange
			}

			// apply default value when a DOM element is created
			if (props.defaultValue) {
				const { defaultValue, ref } = props
				delete props.defaultValue
				props.ref = current => {
					// apply the default value only once
					if (current && !current.defaultValueApplied) {
						current.defaultValueApplied = true
						current.value = defaultValue
					}

					// set any previous ref
					if (ref !== undefined) {
						if (process.env.NODE_ENV === "development" && typeof ref == 'function') {
							// browser plugins may rely on function refs in development mode
							ref(current)
						} else {
							// only object refs (not function refs) are used in this codebase
							ref.current = current
						}
					}
				}
			}
		}
	}
}

function createRef() {
	return {}
}

let Component = PreactComponent
if (process.env.NODE_ENV === "development") {
	// in development mode, create a subclass that will check prop types
	Component = class Component extends PreactComponent {
		constructor(props, context) {
			super(props, context)
			this.checkPropTypes(props)
		}

		componentWillReceiveProps(nextProps, /*nextContext*/) {
			this.checkPropTypes(nextProps)
		}

		checkPropTypes(props) {
			PropTypes.checkPropTypes(
				this.constructor.propTypes, props, 'prop', this.constructor.name)
		}
	}
}

function shallowDiffers(a, b) {
	for (const i in a) {
		if (!(i in b)) {
			return true
		}
	}
	for (const i in b) {
		if (a[i] !== b[i]) {
			return true
		}
	}
	return false
}

class PureComponent extends Component {
	shouldComponentUpdate(props, state) {
		return shallowDiffers(this.props, props) || shallowDiffers(this.state, state)
	}
}

const Fragment = "x-fragment"

export {
	render,
	createRef,
	createElement,
	Component,
	PureComponent,
	Fragment,
}

export default {
	render,
	createRef,
	createElement,
	Component,
	PureComponent,
	Fragment,
}