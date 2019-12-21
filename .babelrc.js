const isDev = process.env.NODE_ENV === "development"
const isProd = !isDev

module.exports = {
	presets: [
		[
			"@babel/preset-env",
			{
				loose: isProd,
			}
		],
		[
			"@babel/preset-react",
			{
				// the following import is automatically injected into all scripts using React:
				// 	import {createElement as React$createElement, Fragment as React$Fragment} from 'react'
				pragma: "React$createElement",
				pragmaFrag: "React$Fragment",
			}
		],
	],
	plugins: [
		// Javascript language features
		"macros", // compile-time AST manipulation
		"@babel/proposal-class-properties", // static class variables

		// extra optimizations only for a production build
		...isProd ? [
			// inline some Babel runtime helper functions
			[
				`${__dirname}/modules/babel-plugin-transform-inline-helpers`,
				{
					useRollupHelpers: true,
					useObjectAssign: isProd,
					expectedHelpers: isProd ? [
						// these are the only helpers expected in a production build
						"assertThisInitialized", // inlined noop
						"defineProperty", // inlined
						"extends", // replaced with Object.assign
						"inheritsLoose",
					] : undefined
				}
			],

			// remove runtime prop type checks
			[
				"transform-react-remove-prop-types",
				{
					mode: "remove",
					removeImport: true,
				}
			],

			// optimization - inline imported svg files
			`${__dirname}/modules/babel-plugin-transform-inline-svgr`,

			// optimization
			"minify-dead-code-elimination",
		] : [],
	],
	generatorOpts: {
		jsescOption: { // cspell: disable-line
			minimal: true,
		}
	},
}