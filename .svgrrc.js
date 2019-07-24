module.exports = {
	expandProps: false,
	dimensions: false,
	prettier: process.env.NODE_ENV === "development",
	jsx: {
		babelConfig: {
			plugins: [
				[
					"transform-react-jsx",
					{
						pragma: "h"
					}
				],
			],
		},
	},
	template: ({ template }, opts, { componentName, jsx }) => template.ast`
		exports.__esModule = true
		const svg = ${jsx}
		exports.default = function ${componentName}() {
			return svg
		}`,
}
