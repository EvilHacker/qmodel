/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

export function findFirstIndex(array, predicate) {
	return findFirstIndexFrom(array, 0, predicate)
}

export function findFirstIndexFrom(array, fromIndex, predicate) {
	for (let i = fromIndex; i < array.length; ++i) {
		if (predicate(array[i])) {
			return i
		}
	}
	return -1
}

export function findLastIndex(array, predicate) {
	return findLastIndexFrom(array, array.length - 1, predicate)
}

export function findLastIndexFrom(array, fromIndex, predicate) {
	for (let i = fromIndex; i >= 0; --i) {
		if (predicate(array[i])) {
			return i
		}
	}
	return -1
}

export function findIndexFrom(array, fromIndex, direction, predicate) {
	return (direction > 0 ? findFirstIndexFrom : findLastIndexFrom)(array, fromIndex, predicate)
}
