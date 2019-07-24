/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

let elementToWaitFor = window
if (!Object.entries) {
	// older browser detected - load polyfills for compatibility
	elementToWaitFor = document.createElement("script")
	elementToWaitFor.src = "polyfills.js"
	document.getElementsByTagName("head")[0].appendChild(elementToWaitFor)
}

elementToWaitFor.onload = () => {
	const React = require('react')

	// create JSX elements with global function h()
	window.h = React.createElement

	// render the application
	const body = document.body
	const app = body.children[0]
	const App = require('./react/App').App
	require('react-dom').render(<App/>, app)

	if (process.env.NODE_ENV !== "development") {
		// remove any injected scripts or advertisements after the app
		while (body.lastChild !== app) {
			body.removeChild(body.lastChild)
		}
	}
}
