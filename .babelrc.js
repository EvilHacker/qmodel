module.exports = {
	presets: [
		"@babel/preset-env",
		"@babel/preset-react",
	],
	plugins: [
		"@babel/plugin-proposal-class-properties",
		[
			"transform-react-jsx",
			{
				pragma: "h"
			}
		]
	],
	env: {
		production: {
			plugins: [
				[
					"transform-react-remove-prop-types",
					{
						mode: "remove",
						removeImport: true,
					}
				]
			]
		}
	}
}