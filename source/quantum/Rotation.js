/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

/**
 * Parse a rotation expression string and return a rotation number.
 */
export function parseRotation(string) {
	const replacements = {
		"½": " +(1/2)",
		"⅓": " +(1/3)",
		"⅔": " +(2/3)",
		"¼": " +(1/4)",
		"¾": " +(3/4)",
		"⅕": " +(1/5)",
		"⅖": " +(2/5)",
		"⅗": " +(3/5)",
		"⅘": " +(4/5)",
		"⅙": " +(1/6)",
		"⅚": " +(5/6)",
		"⅐": " +(1/7)",
		"⅛": " +(1/8)",
		"⅜": " +(3/8)",
		"⅝": " +(5/8)",
		"⅞": " +(7/8)",
		"⅑": " +(1/9)",
		"⅒": " +(1/10)",
		"⅟": " +1/ ",
		"⁄": " / ",
	}
	for (const [search, replacement] of Object.entries(replacements)) {
		string = string.split(search).join(replacement)
	}

	// TODO: make this safer; ideas:
	//  • https://jsbin.com/powuwajaxi/1/edit?js,console
	const rotation = Function(`
		"use strict";
		var global = {}, window = global, document, undefined, Function, setTimeout, clearTimeout, setInterval, clearInterval;
		return (${string});`
	) ()

	if (isNaN(rotation)) {
		throw "Number expected"
	}

	if (isNaN(rotation % 1)) {
		throw "Invalid number"
	}

	return rotation
}
