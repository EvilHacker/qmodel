/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import c from './codeSnippet.macro'

/**
 * Evaluate a Javascript expression.
 * Accept unicode fraction symbols (http://unicodefractions.com).
 *
 * @param {string} string - a Javascript expression
 * @returns {any} evaluated result of the expression
 * @throws an exception from compilation or evaluation
 *
 * TODO: make arbitrary code evaluation safer; ideas:
 * * https://jsbin.com/powuwajaxi/1/edit?js,console
 */
function evalSafe(string) {
	return Function(c`
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
}

/**
 * Parse an expression string and that is expected to result in a real number.
 * Accept unicode fraction symbols (http://unicodefractions.com).
 *
 * @param {string} string - a numeric expression
 * @returns {number} a number
 * @throws exception or error description string
 */
export function parseReal(string) {
	const number = evalSafe(string)

	if (isNaN(number % 1)) {
		throw "Number expected"
	}

	return number
}

/**
 * Parse an expression string and that is expected to result in an integer.
 *
 * @param {string} string - an integer expression
 * @returns {number} an integer
 * @throws exception or error description string
 */
export function parseInteger(string) {
	const number = evalSafe(string)

	if (number % 1 != 0) {
		throw "Integer expected"
	}

	return number
}

/**
 * Parse a label applied to zero or more bit(s).
 * Append a subscript "#n" to each bit if there is more than one bit.
 *
 * @param {string} label - the base label for the bit(s)
 * @param {string} bits - indication of which bit(s) to label
 * @returns {string[]} a sparse array of labels (with subscript) for each bit
 * @throws error description string
 */
export function parseLabelledBits(label, bits) {
	const labels = []

	let bit = 0
	let firstBit
	let subscript = 0
	for (let i = bits.length - 1; i >= 0; --i) {
		const char = bits[i]
		if (char == "*") {
			// remember the index of the first bit
			if (!subscript) {
				firstBit = bit
			}

			// add a label with subscript
			labels[bit++] = `${label}#${subscript++}`
		} else if (char.charCodeAt(0) <= 32) {
			// skip over whitespace
		} else if ("-|│┼".includes(char)) {
			// skip over this bit
			++bit
		} else {
			throw `Invalid character '${char}' in label bit selector`
		}
	}

	// remove subscript from a sole bit
	if (subscript == 1) {
		labels[firstBit] = label
	}

	return labels
}
