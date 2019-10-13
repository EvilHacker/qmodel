/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import path from 'path'
import { promisify } from 'util'
import fs from 'fs'
const fsp = {
	readFile: promisify(fs.readFile),
}
import { createFilter } from "rollup-pluginutils" // cspell:disable-line
import posthtml from 'posthtml'

export default function htmlEntryPlugin(options = {}) {
	const isDev = process.env.NODE_ENV === "development"
	const isProd = !isDev

	const filter = createFilter(options.include || /[.]html$/, options.exclude)

	// get options with defaults
	const pluginOptions = {
		minimize: isProd,         // using htmlnano, with options from .htmlnanorc.js
		injectExtractedCss: true, // false|true|"filename.css"
		inlineScripts: isProd,    // false: <script src="x.js"></script> true: <script>...</script>
		inlineStyles: isProd,     // false: <link rel="stylesheet" href="x.css"></link> true: <style>...</style>
		commentOutTags: isProd,
		...options
	}

	// if minimization is enabled, load htmlnano
	let htmlnano
	let htmlnanoOptions
	if (pluginOptions.minimize) {
		htmlnano = require('htmlnano')
		htmlnanoOptions = require('cosmiconfig')('htmlnano').searchSync().config
	}

	// all html entry files
	const htmlEntries = {}

	return {
		name: 'html-entry',

		resolveId(id, importer) {
			// check if this is an .html entry point (with no importer)
			if (!importer && filter(id)) {
				const newId = path.resolve(id)
				htmlEntries[newId] = {
					id: newId,
					loaded: false
				}
				return newId
			}
			return null
		},

		async load(id) {
			const entry = htmlEntries[id]
			if (!entry) {
				return null
			}

			if (entry.loaded) {
				// TODO: Caching? Should the previous load result be returned?
				return entry.code
			}

			// collect all stylesheet links and concatenate all code from script elements
			const stylesheetLinks = []
			let code = ""
			const processedHtml = await posthtml()
				.use(tree => {
					tree.match([
						{ tag: "link", attrs: { rel: "stylesheet", href: /^[^:]+$/ } },
						{ tag: "script" },
					], node => {
						// return node
						if (node.tag == "link") {
							// collect the stylesheet link
							stylesheetLinks.push(node.attrs.href)

							if (!pluginOptions.inlineStyles) {
								// not inlining stylesheets - leave the link there
								return node
							}

							// remove the stylesheet link
							if (pluginOptions.commentOutTags) {
								// replace the link with a comment
								return `<!-- <link rel="stylesheet" href=${JSON.stringify(node.attrs.href)}></link> -->`
							} else {
								// eliminate the node
								return undefined
							}
						}

						const {src, type} = node.attrs || {}
						const {content} = node
						if ((!src || !src.includes(":"))
							&& (!type || type.toLowerCase() == "application/javascript")
							&& (!content || content.length <= 1))
						{
							// accumulate all script code
							if (src) {
								code = `${code}import ${JSON.stringify(`./${src}`)};\n`
							}
							if (content) {
								code = `${code}${content[0]};\n`
							}

							// remove the script
							if (pluginOptions.commentOutTags) {
								// replace the script with a comment
								return `<!-- <script${src ? ` src=${JSON.stringify(src)}` : ""}>${content ? "..." : ""}</script> -->`
							} else {
								// eliminate the node
								return undefined
							}
						}

						return node
					})
					return tree
				})
				.process(await fsp.readFile(id))

			entry.loaded = true
			entry.processedHtml = processedHtml
			entry.stylesheetLinks = stylesheetLinks
			entry.code = code

			return code
		},

		async generateBundle(options, bundle) {
			const chunkNames = Object.keys(bundle)
			for (let i = 0; i < chunkNames.length; ++i) {
				const chunkName = chunkNames[i]
				const chunk = bundle[chunkName] || {}
				const entry = htmlEntries[chunk.facadeModuleId]
				if (!entry) {
					// not an html entry
					continue
				}

				// remove this chunk cuz it will be replaced
				delete bundle[chunkName]

				// get the html head and body elements
				const {head, body} = findHtmlHeadAndBody(entry)

				// handle the js source as inline or external
				if (pluginOptions.inlineScripts) {
					// escape possible </script> within the code (TODO: and update source maps)
					let code = chunk.code.trimEnd().replace(/<\/script\b/g, "%lt;/script")

					// get js code with optional source map (url or inline)
					if (options.sourcemap && chunk.map) {
						let url
						if (options.sourcemap === "inline") {
							// inline the source map within the js source
							url = chunk.map.toUrl()
						} else {
							url = chunk.name + ".map"

							// output a separate .map file
							bundle[url] = {
								isAsset: true,
								name: chunk.name,
								fileName: url,
								source: chunk.map.toString(),
							}
						}
						code = `\n${code}//# sourceMappingURL=${url}\n`
					}

					// add a single inline script tag at the end of the html body
					if (code) {
						addHtmlNode(body, {
							tag: "script",
							attrs: {},
							content: [ code ]
						})
					}
				} else {
					// add a single external script tag at the end of the html body
					addHtmlNode(body, {
						tag: "script",
						attrs: {
							src: chunk.name + ".js"
						},
						content: []
					})

					// output a separate .js file
					bundle[chunk.name + ".js"] = chunk
					chunk.fileName = chunk.name + ".js"
				}

				// collect styles to inject
				let style = ""
				let stylesheetLink = undefined

				// add all externally referenced stylesheets
				for (let i = 0; i < entry.stylesheetLinks.length; ++i) {
					const link = entry.stylesheetLinks[i]
					if (pluginOptions.inlineStyles) {
						// inline the stylesheet
						style += await fsp.readFile(link)
					} else {
						const chunkName = "stylesheet:" + link
						if (!bundle[chunkName]) {
							// output the stylesheet file
							// eslint-disable-next-line require-atomic-updates
							bundle[chunkName] = {
								isAsset: true,
								name: chunkName,
								fileName: link,
								source: await fsp.readFile(link),
							}
						}
					}
				}

				// check if there is extracted css to inject
				if (pluginOptions.injectExtractedCss) {
					const link = typeof pluginOptions.injectExtractedCss === "string"
						? pluginOptions.injectExtractedCss
						: chunk.name + ".css"
					const css = bundle[link]
					if (css && css.isAsset && css.source) {
						if (pluginOptions.inlineStyles) {
							// inline the extracted css
							style += css.source

							// don't output the extracted css file
							delete bundle[link]
						} else {
							// add a link to the extracted css file
							stylesheetLink = link
						}
					}
				}

				if (style) {
					addHtmlNode(head, {
						tag: "style",
						attrs: {},
						content: [ style ]
					})
				}

				if (stylesheetLink) {
					addHtmlNode(head, {
						tag: "link",
						attrs: {
							rel: "stylesheet",
							href: stylesheetLink
						},
						content: []
					})
				}

				if (pluginOptions.minimize) {
					entry.processedHtml = await htmlnano.process(
						entry.processedHtml.html,
						htmlnanoOptions)
				}

				// output the .html file
				// eslint-disable-next-line require-atomic-updates
				bundle[chunk.name + ".html"] = {
					isAsset: true,
					isEntry: true,
					name: chunk.name,
					fileName: chunk.name + ".html",
					source: entry.processedHtml.html,
				}
			}
		}
	}
}

function findHtmlHeadAndBody(htmlEntry) {
	const headAndBody = {}

	htmlEntry.processedHtml.tree.match(
		[ { tag: "head" }, { tag: "body" } ],
		node => headAndBody[node.tag] = node
	)

	if (!headAndBody.head || !headAndBody.body) {
		throw new Error(`${htmlEntry.id}: head and body elements not found`)
	}

	return headAndBody
}

/**
 * Add a node as the last child of a parent node.
 * Attempt to maintain consistent indentation.
 *
 * @param {object} parentNode - the parent html tree node
 * @param {object} node - the child html tree node to be added
 */
function addHtmlNode(parentNode, node) {
	const content = parentNode.content
	if (!content) {
		parentNode.content = [ node ]
		return
	}

	let whitespace= ""
	for (let i = 0; i < content.length; ++i) {
		if (typeof content[i] !== "string") {
			break
		}
		whitespace += content[i]
	}

	const whitespaceBefore = (whitespace.match(/\n[ \t]*/) || [""])[0]

	whitespace = ""
	for (let i = content.length - 1; i >= 0; --i) {
		if (typeof content[i] !== "string") {
			break
		}
		whitespace = content[i] + whitespace
		content.pop()
	}

	const whitespaceAfter = (whitespace.match(/\n[ \t]*$/) || [""])[0]

	content.push(whitespace.slice(0, -whitespaceAfter.length) + whitespaceBefore)
	content.push(node)
	content.push(whitespaceAfter)
}