#!/usr/bin/env node

/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Apply patches to node_modules.
 *
 * **rollup**
 * Don't overwrite an exiting output file if contents haven't changed.
 * This reduces unnecessary live reload and css injection when
 * serving the output with a watching web server.
 *
 * **babel**
 * Minimize compiled JSX; e.g:
 * normal:     `<br/>` -> `React.createElement("br", null)`
 * minimized:  `<br/>` -> `React.createElement("br")`
 * normal:     `<div>child</div>` -> `React.createElement("div", null, "child")`
 * minimized:  `<div>child</div>` -> `React.createElement("div", {}, "child")`
 *
 * **preact**
 * 1) Do not diff textarea children (for IE and Edge compatibility).
 * 2) Create an ES6 Module file from the supplied CommonJS file.
 * This results in the smallest final packaged code.
 * 3) Also, source mappings included with Preact are buggy so don't them.
 * Prefer to have accurate source mappings to built "dist" code
 * which is already decently formatted.
 */

const promisify = require('util').promisify
const fs = require('fs')
const fsp = {
	readFile: promisify(fs.readFile),
	writeFile: promisify(fs.writeFile),
}
const dedent = require('dedent-js')

// change current directory to the root of this project
process.chdir(`${__dirname}/..`)

const patchAll = async () => await Promise.all([
	patchRollup(),
	patchBabel(),
	patchPreact(),
])

patchAll()

const writeFileOnlyIfDifferent = async (file, data) =>
	fsp.readFile(file, 'utf-8')
		.catch(() => undefined)
		.then(contents => contents === data || fsp.writeFile(file, data))

async function patchRollup() {
	const patch = code => code.replace(
		/\bfunction writeFile\(dest, data\) {/, dedent`

		function writeFile(dest, data) /*PATCHED*/ {
			const promise = Promise.resolve();
			promise.then(() => {
				// attempt to read the contents of an exiting file first
				fs.readFile(dest, 'utf-8', (err, contents) => promise.then(
					// only overwrite if contents are different
					contents === data || overwriteFile(dest, data)));
			});
			return promise;
		}

		function overwriteFile(dest, data) {`
	)

	return Promise.all([
		"node_modules/rollup/dist/rollup.js",
		"node_modules/rollup/dist/rollup.es.js"
	].map(file => fsp.readFile(file, "utf-8")
		.then(code => {
			const patchedCode = patch(code)
			return patchedCode === code || fsp.writeFile(file, patchedCode)
		})
	))
}

async function patchBabel() {
	const patch = code => code.replace(
		/^(\s*)\bstate\.callee = pass\.get\("jsxIdentifier"\)\(\);(.*)$/m, dedent`
		$1state.callee = pass.get("jsxIdentifier")() /*PATCHED*/ ;$2
		$1if (_core.types.isNullLiteral(state.args[1])) {
		$1	if (state.args.length == 2) {
		$1		state.args.length = 1;
		$1	} else {
		$1		state.args[1] = _core.types.objectExpression([]);
		$1	}
		$1}`
	)

	const file = "node_modules/@babel/plugin-transform-react-jsx/lib/index.js"
	return fsp.readFile(file, "utf-8")
		.then(code => {
			const patchedCode = patch(code)
			return patchedCode === code || fsp.writeFile(file, patchedCode)
		})
}

async function patchPreact() {
	const patch = code => {
		// remove buggy source map url
		code = code.replace(/^\s*\/\/#\s*sourceMappingURL=.*/m, "")

		// remove iife wrapper
		code = code.trim()
		code = code.replace(/^\s*!?function\(\)\s*{/, "")
		code = code.replace(/\s*}\(\);?\s*$/, "")

		// remove indentation within the iife wrapper
		code = dedent(code)

		// replace CommonJS module exports with ES6 Module named exports
		code = code.replace(
			/^.*\bmodule.exports\s*=.*$/m,
			"export { Component, render, h, options };"
		)

		// do not diff textarea children (for IE and Edge compatibility)
		code = code.replace( // cspell: disable-next-line
			/^(\s*)\bif \(!hydrating && vchildren &&(.*)$/m, dedent`
			$1if (vnode.nodeName === 'textarea') {
			$1	// PATCHED: do not diff textarea children (for IE and Edge compatibility)
			$1} else if (!hydrating && vchildren &&$2` // cspell: disable-line
		)

		return code
	}

	const fileIn  = "node_modules/preact/dist/preact.js"
	const fileOut = "node_modules/preact/dist/preact.es.js"
	return fsp.readFile(fileIn, "utf-8")
		.then(code => writeFileOnlyIfDifferent(fileOut, patch(code)))
}
