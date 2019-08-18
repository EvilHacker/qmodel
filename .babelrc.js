module.exports = {
	presets: [
		"@babel/preset-env",
		"@babel/preset-react",
	],
	plugins: [
		// Javascript language features
		"macros", // compile-time AST manipulation
		"@babel/proposal-class-properties", // static class variables

		// optimization/minification for both dev and prod so that behaviour is identical
		`${__dirname}/modules/babel-plugin-transform-import-to-require`,
		"@babel/transform-react-constant-elements",
		[
			"transform-react-jsx",
			{
				// create JSX elements with global function h() (set in index.js)
				pragma: "h"
			}
		],
		[
			"@babel/transform-template-literals",
			{
				// `a${b}c` -> "a" + b + "c"
				loose: true,
			},
			"loose"
		],
		"minify-type-constructors",
	],
	env: {
		production: {
			plugins: [
				// inline or call "loose" Babel runtime helper functions
				`${__dirname}/modules/babel-plugin-transform-helpers`,

				// remove unnecessary runtime overhead that should only be present in a development build
				[
					"transform-es2015-modules-commonjs",
					{
						loose: true,
						strict: false,
					}
				],
				[
					"@babel/transform-classes",
					{
						loose: true,
					}
				],
				[
					"transform-react-remove-prop-types",
					{
						mode: "remove",
						removeImport: true,
					}
				],
				"babel-plugin-minify-dead-code-elimination",
			]
		}
	}
}