const isDev = process.env.NODE_ENV === "development"
const isProd = !isDev
const minify = isProd && process.env.PRETTY !== "true"

module.exports = {
	removeComments: minify && "all",
	collapseWhitespace: minify && "all",
	collapseBooleanAttributes: true,
	removeEmptyAttributes: true,
	removeRedundantAttributes: true,
	deduplicateAttributeValues: true,
	mergeStyles: true,
	mergeScripts: true,
	minifyCss: minify && {
		preset: [
			"default",
			{
				discardComments: {
					removeAll: true,
				},
			}
		]
	},
	minifyJs: false,
	minifyJson: false,
	minifySvg: false,
}