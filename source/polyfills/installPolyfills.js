/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Iff IE or an other older browser is detected, load external script that will
 * install only those polyfills needed to make this codebase work.
 */

let elementToWaitFor = window
if (!Object.entries) {
	// older browser detected - load polyfills for compatibility
	elementToWaitFor = document.createElement("script")
	elementToWaitFor.src = "polyfills.js"
	document.querySelector("head").appendChild(elementToWaitFor)
}

export function installPolyfills(callback) {
	return elementToWaitFor.onload = callback
}
