/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import c from './codeSnippet.macro'

/**
 * Parse a rotation expression string and return a rotation number.
 * Accept unicode fraction symbols (http://unicodefractions.com).
 *
 * @param {string} string - a numeric expression
 * @returns {number} a number
 * @throws exception or error description string
 *
 * TODO: make arbitrary code evaluation safer; ideas:
 * * https://jsbin.com/powuwajaxi/1/edit?js,console
 */
export function parseRotation(string) {
	const rotation = Function(c`
		"use strict";
		var global = {}, window = {}, document, Function, setTimeout, clearTimeout, setInterval, clearInterval;
		return (${
			// replace unicode vulgar fractions with equivalents
			string.replace(/[¼-¾⁄⅐-⅟]/g, match => {
				if (match == "⅟") {
					return " +1/"
				}
				if (match == "⁄") {
					return "/"
				}
				return ` +(${{
					"½": "1/2",
					"⅓": "1/3",
					"⅔": "2/3",
					"¼": "1/4",
					"¾": "3/4",
					"⅕": "1/5",
					"⅖": "2/5",
					"⅗": "3/5",
					"⅘": "4/5",
					"⅙": "1/6",
					"⅚": "5/6",
					"⅐": "1/7",
					"⅛": "1/8",
					"⅜": "3/8",
					"⅝": "5/8",
					"⅞": "7/8",
					"⅑": "1/9",
					"⅒": "1/10",
				}[match]})`
			})
		});`
	) ()

	if (isNaN(rotation)) {
		throw "Number expected"
	}

	if (isNaN(rotation % 1)) {
		throw "Invalid number"
	}

	return rotation
}
