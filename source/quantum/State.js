/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

/**
 * Normalize a quantum state of complex amplitudes so that
 * the sum of squares is 1.
 *
 * @param {number[]} amplitudes - an array of alternating real and imaginary amplitudes
 */
export function normalized(amplitudes) {
	const sumOfSquares = amplitudes.reduce((accumulated, value) => accumulated + value*value, 0)
	if (sumOfSquares != 1) {
		amplitudes = amplitudes.map(value => value / sumOfSquares)
	}
	return amplitudes
}

export function easeQuadraticInOut(t) {
	return t <= 0.5
		? 2 * t * t
		: 2 * t * (2 - t) - 1
}

export function easeSinusoidalInOut(t) {
	return 0.5 * (1 - Math.cos(Math.PI * t))
}

/**
 * Return a function that interpolates between two quantum states.
 *
 * @param {number[]} amplitudes1 - an array of alternating real and imaginary amplitudes
 * @param {number[]} amplitudes2 - an array of alternating real and imaginary amplitudes
 * @param {function} ease - easing function
 */
export function tween(amplitudes1, amplitudes2, ease = easeSinusoidalInOut) {
	return t => {
		if (t <= 0) {
			return amplitudes1
		} else if (t >= 1) {
			return amplitudes2
		}

		t = ease(t)

		const length = amplitudes2.length
		const amplitudes = []
		amplitudes.length = length
		for (var i = 0; i < length; i += 2) {
			const a1 = amplitudes1[i]
			const b1 = amplitudes1[i+1]
			const a2 = amplitudes2[i]
			const b2 = amplitudes2[i+1]

			let angle1 = Math.atan2(b1, a1)
			let angle2 = Math.atan2(b2, a2)
			if (angle2 - angle1 > Math.PI) {
				angle1 += 2 * Math.PI
			} else if (angle1 - angle2 > Math.PI) {
				angle2 += 2 * Math.PI
			}

			const radiusSquared1 = a1*a1 + b1*b1
			const radiusSquared2 = a2*a2 + b2*b2
			if (radiusSquared1 < 1e-6) {
				// radius is too small - assume no change in angle
				angle1 = angle2
			} else if (radiusSquared2 < 1e-6) {
				// radius is too small - assume no change in angle
				angle2 = angle1
			}

			const tweenAngle = (1 - t) * angle1 + t * angle2
			const tweenRadius = Math.sqrt((1 - t) * radiusSquared1 + t * radiusSquared2)

			amplitudes[i]   = tweenRadius * Math.cos(tweenAngle)
			amplitudes[i+1] = tweenRadius * Math.sin(tweenAngle)
		}
		return amplitudes
	}
}
