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
 * * renaming some html attributes from camelCase to kebab-case
 * * handle a defaultValue prop (for textarea and select elements)
 * * checking of propTypes in a development build
 * * a PureComponent class
 *
 * To switch to react, remove these entries from package.json:
 * 	"alias": {
 * 		"react": "./source/react/preact-compat",
 * 		"react-dom": "./source/react/preact-compat"
 * 	}
 */

import {
	render,
	createRef,
	h as createElement,
	Component as PreactComponent,
	options
} from 'preact/dist/preact'

const CAMEL_PROPS = /^(?:accent|alignment|arabic|baseline|cap|clip|color|fill|flood|font|glyph|horiz|marker|overline|paint|stop|strikethrough|stroke|text|underline|unicode|units|v|vector|vert|word|writing|x)[A-Z]/

options.vnode = vnode => {
	if (!vnode.normalized) {
		vnode.normalized = true
		const props = vnode.attributes
		if (props && typeof vnode.nodeName === 'string') {
			// rename specific props from camelCase to kebab-case
			for (const prop in props) {
				if (CAMEL_PROPS.test(prop)) {
					const value = props[prop]
					delete props[prop]
					props[prop.replace(/([A-Z0-9])/, '-$1').toLowerCase()] = value
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
						// note: only object refs (not function refs) are used in this codebase
						ref.current = current
					}
				}
			}
		}
	}
}

let Component = PreactComponent
if (process.env.NODE_ENV === "development") {
	// in development mode, create a subclass that will check prop types
	const PropTypes = require('prop-types')
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

export {
	render,
	createRef,
	createElement,
	Component,
	PureComponent
}

export default {
	render,
	createRef,
	createElement,
	Component,
	PureComponent
}