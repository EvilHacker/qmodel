module.exports = {
	expandProps: false,
	dimensions: false,
	prettier: false,
	svgo: false,
	jsx: {
		babelConfig: {
			plugins: [
				[
					"@babel/transform-react-jsx",
					{
						pragma: "h"
					}
				],
			],
		},
	},
	template: ({ template }, opts, { componentName, jsx }) => template.ast`
		import {createElement as h} from 'react'
		const jsx = ${jsx}
		export default function ${componentName}() {
			return jsx
		}
	`,
}
