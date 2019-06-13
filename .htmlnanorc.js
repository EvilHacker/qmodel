module.exports = {
	removeComments: "all",
	collapseWhitespace: "all",
	collapseBooleanAttributes: true,
	removeEmptyAttributes: true,
	removeRedundantAttributes: true,
	deduplicateAttributeValues: true,
	mergeStyles: true,
	mergeScripts: true,
	minifyCss: {
		preset: [
			"default",
			{
				discardComments: {
					removeAll: true,
				},
			}
		]
	},
	minifyJs: {},
	minifyJson: {},
	minifySvg: {},
}