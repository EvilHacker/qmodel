/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

// this import must come first before remainder of code runs
import { installPolyfills } from './polyfills/installPolyfills'

// rest of imports
import React from 'react'
import { render } from 'react-dom'
import { App } from './react/App'
import './favicon.ico'

// install polyfills (if needed) then start the app
installPolyfills(() => {
	// render the application
	const body = document.body
	const app = body.children[0]
	render(<App/>, app)

	if (process.env.NODE_ENV !== "development") {
		// remove any injected scripts or advertisements after the app
		while (body.lastChild !== app) {
			body.removeChild(body.lastChild)
		}
	}
})