import path from 'path'
import chalk from 'chalk'

// Rollup plugins
import { eslint } from "rollup-plugin-eslint"
import stylelint from './modules/rollup-plugin-stylelint/index'
import replace from 'rollup-plugin-re'
import babel from 'rollup-plugin-babel'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import alias from 'rollup-plugin-alias'
import html from './modules/rollup-plugin-html-entry/index'
import postcss from 'rollup-plugin-postcss'
import asset from 'rollup-plugin-smart-asset'
import svgr from '@svgr/rollup'
import serve from 'rollup-plugin-live-server'

// build options derived from environment variables:
//  * NODE_ENV - production|development
//  * SERVER_PORT - undefined or http server port number (default 1234)
//  * REACT - preact|react
//  * PRETTY - false|true - set to true to inspect production code
const isDev = process.env.NODE_ENV === "development"
const isProd = !isDev
const outputDir = isDev ? "build-dev" : "build-prod"
const serverPort = process.env.SERVER_PORT
const react = process.env.REACT || "preact"
const pretty = process.env.PRETTY === "true"

const outputOptions = {
	dir: outputDir,
	format: "iife",
	indent: false,
	compact: isProd,
	strict: isDev,
	freeze: isDev,
	sourcemap: isDev,
	sourcemapExcludeSources: true,
}

const closureCompiler = isProd && require('@ampproject/rollup-plugin-closure-compiler')({
	charset: "utf8"
})

const babelMinify = (options = {}) => require('rollup-plugin-babel-minify')({
	comments: false,
	sourceMap: false,
	builtIns: true,
	mangle: {
		topLevel: true
	},
	plugins: [
		`${__dirname}/modules/babel-plugin-minify-intern`,
	],
	...options
})

const trim = (options = {}) => require('./modules/rollup-plugin-trim/index')(options)

// plugins for all inputs (with string placeholders)
const plugins = [
	eslint({
		exclude: /[.](html|css|svg)$/, // ignore generated code
		formatter: eslintFormatter
	}),
	replace({
		patterns: [
			{
				// inline the value of existing environment variables at compile time
				test: /\bprocess\.env\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
				replace: (_, variableName) => variableName in process.env
					? JSON.stringify(process.env[variableName])
					: `process.env.${variableName}`,
			},
			{
				// if there is any import from 'react' then also
				// 	import {createElement as React$createElement, Fragment as React$Fragment} from 'react'
				test: /^(\s*)(import\b.*\bfrom\s*['"]react['"])/m,
				replace: "$1import {createElement as React\$createElement, Fragment as React\$Fragment} from 'react'; $2",
			},
			...isProd ? [{
				// remove code that should only exist in a development build
				test: /\bDEVELOPMENT_ONLY_START\b.*?\bDEVELOPMENT_ONLY_END\b/sg,
				replace: "",
			}] : []
		]
	}),
	"placeholderForHtml",
	babel({
		// helpers handled by modules/babel-plugin-transform-inline-helpers
		externalHelpers: isProd,
	}),
	nodeResolve(),
	commonjs({
		namedExports: {
			'react': [ 'Component', 'PureComponent', 'Fragment', 'createElement', 'createRef' ],
			'react-dom': [ 'render' ],
		}
	}),
	...isProd ? [
		// optimization and minimization
		closureCompiler,
		closureCompiler,
		"placeholderForBabelMinify",
		"placeholderForTrim",
		require('./modules/rollup-plugin-unescape/index')(),
	] : [],
	...pretty ? [
		require('./modules/rollup-plugin-js-beautify/index')({
			indent_with_tabs: true, // eslint-disable-line camelcase
		}),
	] : [],
	asset({
		url: "copy",
		extensions: [ ".ico", ".png", ".gif", ".jpg" ],
	}),
	...serverPort ? [
		"placeholderForWebServer",
	] : [],
]

// additional plugins for html inputs
const htmlPlugins = [
	stylelint({
		formatter: stylelintFormatter
	}),
	postcss({
		config: false,
		extract: true,
		plugins: [
			require('autoprefixer')(),
			require('postcss-colormin').default(), // for IE compatibility
		],
		modules: {
			generateScopedName: isDev
				? (name, filename) => `${name}_${cssModulesUniqueId(name, filename)}`
				: (name, filename) => cssModulesUniqueId(name, filename)
		},
	}),
	html({
		minimize: isProd,         // using htmlnano, with options from .htmlnanorc.js
		injectExtractedCss: true, // inject single CSS Module "extract"ed by postcss plugin above
		inlineScripts: isProd,    // false: <script src="x.js"></script> true: <script>...</script>
		inlineStyles: isProd,     // false: <link rel="stylesheet" href="x.css"></link> true: <style>...</style>
		commentOutTags: isDev,
	}),
	svgr(),
	... react === "preact" ? [
		alias({
			entries: [
				{ find: "preact",          replacement: `${__dirname}/node_modules/preact/dist/preact.es` },
				{ find: "preact-devtools", replacement: `${__dirname}/node_modules/preact/devtools` },
				{ find: "react",           replacement: `${__dirname}/source/react/preact-compat` },
				{ find: "react-dom",       replacement: `${__dirname}/source/react/preact-compat` },
			]
		})
	] : [],
]

export default [
	{
		input: "source/index.html",
		output: outputOptions,
		plugins: plugins.flatMap(plugin => {
			// fill-in placeholders
			if (plugin === "placeholderForHtml") {
				return htmlPlugins
			} else if (plugin === "placeholderForBabelMinify") {
				return [
					babelMinify({
						builtIns: true
					})
				]
			} else if (plugin === "placeholderForTrim") {
				return [
					trim({
						trimIife: true // remove iife wrapper
					})
				]
			} else if (plugin === "placeholderForWebServer") {
				return [
					// web server with live reload and css injection
					serve({
						port: serverPort,
						root: outputDir,
						ignore: [ file => !file.match(/[.](?:html|js|css)$|^[^.]+$/) ]
					})
				]
			} else if (typeof plugin === "string") {
				// ignore any other placeholders
				return []
			} else {
				// pass the plugin through unchanged
				return [plugin]
			}
		}),
	},
	{
		input: "source/polyfills/polyfills.js",
		output: outputOptions,
		plugins: plugins.flatMap(plugin => {
			// fill-in placeholders
			if (plugin === "placeholderForBabelMinify") {
				return [
					babelMinify({
						builtIns: false // disable minification that breaks assignment to built-ins
					})
				]
			} else if (plugin === "placeholderForTrim") {
				return [
					trim({
						trimIife: false // don't remove iife wrapper
					})
				]
			} else if (typeof plugin === "string") {
				// ignore any other placeholders
				return []
			} else {
				// pass the plugin through unchanged
				return [plugin]
			}
		}),
	},
]

const colon = chalk`{grey :}`

const severity = severity => ({
	1: chalk`{yellow ⚠️  }`,
	2: chalk`{red 🛑  }`,
	warning: chalk`{yellow ⚠️  }`,
	error: chalk`{red 🛑  }`,
}[severity] || chalk`{red.bold ${severity}}${colon} `)

function eslintFormatter(results) {
	const c = colon
	let output = ""
	results.forEach(r => {
		const f = path.relative(__dirname, r.filePath)
		r.messages.forEach(m => {
			const url = m.ruleId
				? chalk`${c} {blue http://eslint.org/docs/rules/{bold ${m.ruleId}}}`
				: ""
			output += `${f}${c}${m.line}${c}${m.column}${c} ${severity(m.severity)}${m.message}${url}\n`
		})
	})
	return output.trim()
}

function stylelintFormatter(results) {
	const c = colon
	let output = ""
	results.forEach(r => {
		const f = path.relative(__dirname, r.source)
		r.warnings.forEach(m => {
			const message = m.text.endsWith(` (${m.rule})`)
				? m.text.slice(0, -m.rule.length - 3)
				: m.text
			const url = m.rule
				? chalk`${c} {blue https://stylelint.io/user-guide/rules/{bold ${m.rule}}}`
				: ""
			output += `${f}${c}${m.line}${c}${m.column}${c} ${severity(m.severity)}${message}${url}\n`
		})
	})
	return output.trim()
}

const cssModulesIds = {}
const cssModulesIdDigits = // cspell: disable-next-line
	"etinoarslcduhpfbg-m01v2x4yk3_5jw8MN7LS9CH6DEOTIAFPWzqUQVKGYRXJBZ".split("")
const cssModulesIdFirstDigits = cssModulesIdDigits.filter(c => c.match(/[a-z_A-Z]/))
const cssModulesUniquePrefix = "" // "_"

/**
 * Choose minimal unique CSS class names and IDs for CSS Modules.
 *
 * It is assumed that there are no hard-coded names created outside of CSS Modules
 * that may collide. If this is not the case, then a unique prefix can be set.
 */
const cssModulesUniqueId = (name, filename) => {
	const key = `${filename}:${name}`
	let id = cssModulesIds[key]
	if (!id) {
		let n = Object.keys(cssModulesIds).length
		id = cssModulesIdFirstDigits[n % cssModulesIdFirstDigits.length]
		n = Math.floor(n / cssModulesIdFirstDigits.length)
		while (n > 0) {
			id += cssModulesIdDigits[n % cssModulesIdDigits.length]
			n = Math.floor(n / cssModulesIdDigits.length)
		}

		cssModulesIds[key] = cssModulesUniquePrefix + id
	}
	return id
}
