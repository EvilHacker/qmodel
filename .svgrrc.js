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
		const svg = ${jsx}
		module.exports = function ${componentName}() {
			return svg
		}`,
}
