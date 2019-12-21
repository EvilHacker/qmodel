/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

const delayedSaves = {}

/**
 * Load a serialized JSON value from browser local storage.
 *
 * @param {string} key - the name of the local storage item
 * @param {*} defaultValue - value to return if key not found or other error
 * @returns {*} a JSON value
 */
export function load(key, defaultValue = undefined) {
	const value = window.localStorage.getItem(key)
	if (value !== null) {
		try {
			return JSON.parse(value)
		} catch (ex) {
			// fallthrough...
		}
	}
	return defaultValue
}

/**
 * Serialize and save a JSON value to browser local storage.
 *
 * Optionally, specify a delay to perform the actual store.
 * If the same key is stored more than once within the delay period,
 * only the last value will be actually stored.
 *
 * @param {string} key - the name of the local storage item
 * @param {*} value - the JSON value to store (or a function that returns the value)
 * @param {number} [delay] - milliseconds of delay before actually storing
 * @returns {undefined} void
 */
export function save(key, value, delay = 0) {
	clearTimeout(delayedSaves[key])
	delayedSaves[key] = setTimeout(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(
				typeof value == "function"
					? value()
					: value
			))
		} finally {
			delete delayedSaves[key]
		}
	}, delay)
}
