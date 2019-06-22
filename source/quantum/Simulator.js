/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

/**
 * Convert the integer n to a hexadecimal string.
 * Do the conversion only for a "development" build for easier debugging.
 */
function h(n) {
	if (process.env.NODE_ENV === "development") {
		return `0x${n.toString(16).toUpperCase()}`
	}
	return n
}

/**
 * Normalize the supplied op (operation string) by:
 *  - removing comments, whitespace, and ignored qubits;
 *  - accept lower-case characters;
 *  - accept alternative characters: "│|_⨁⊕+";
 *  - replace with these characters: '-', 0', '1', 'H', 'N', 'X', 'Y'.
 *
 * Return the normalized operation string.
 * Throw an exception if the operation string is invalid.
 */
export function normalizeOp(op) {
	if (op instanceof Operation) {
		return op
	}

	var normOp = ""
	var i = 0

	// trim leading '|', '-', '_', and whitespace
	while (i < op.length && (op.charCodeAt(i) <= 32 || "│|-_".includes(op[i]))) {
		++i
	}

	// normalize remaining characters and check for errors
	while (i < op.length) {
		if (op.charCodeAt(i) <= 32) {
			// skip whitespace
			++i
			continue
		}

		switch (op[i]) {
			case '│':
			case '|':
			case '-':
			case '_':
				normOp += '-'
				break
			case '0':
				normOp += '0'
				break
			case '1':
				normOp += '1'
				break
			case 'H':
			case 'h':
				normOp += 'H'
				break
			case '⨁':
			case '⊕':
			case '+':
			case 'N':
			case 'n':
				normOp += 'N'
				break
			case 'X':
			case 'x':
				normOp += 'X'
				break
			case 'Y':
			case 'y':
				normOp += 'Y'
				break
			case '#':
				// # comment
				return normOp
			case '/':
				if (op[i + 1] == '/') {
					// // comment
					return normOp
				}
				// fallthrough...
			default:
				throw `Invalid character '${op[i]}'`
		}

		++i
	}

	return normOp
}

/**
 * A compiled Quantum Operation.
 *
 * Compilation is performed lazily.
 */
export class Operation {
	/**
	 * Construct a new operation given either:
	 *  - an operation string, or
	 *  - an exiting Operation to copy.
	 */
	constructor(op) {
		if (op instanceof Operation) {
			// copy other Operation
			this.op = op.op
			this.length = op.length
			this.minLength = op.minLength
			this.transform = op.transform
			this.condition = op.condition
			this.gates = op.gates
		} else if (op === null) {
			// No-Op
			this.op = op
			this.minLength = this.length = 0
			this.transform = () => undefined
			this.condition = {
				mask: 0,
				value: 0,
			}
			this.gates = []
		} else {
			// create a new operation that is yet to be compiled
			this.op = normalizeOp(op)
			this.minLength = this.length = this.op.length
			while (this.minLength > 0 && "01".includes(this.get(this.minLength - 1))) {
				--this.minLength
			}
			this.gates = []
		}
	}

	/**
	 * Return the operation character at a given index.
	 *
	 * Index 0 is the least significant qubit, which corresponds to the
	 * rightmost (last) character in the operation string.
	 *
	 * Return '-', meaning don't care about this qubit, for any index
	 * greater than the length of the operation.
	 */
	get(index) {
		if (index >= this.length) {
			return '-'
		}

		return this.op[this.length - 1 - index]
	}

	/**
	 * Return all conditions ('0', or '1') in the operation.
	 * The conditions are expressed as an integer mask and value where:
	 *  - each bit of the mask is set to 1 if there is either a '0', or '1' in the op;
	 *  - each bit of the value is set to 1 only if there is a '1' in the op.

	 * Return the mask and value as a structure:
	 * {
	 * 	mask: conditionMask
	 * 	value: conditionValue,
	 * }
	 */
	getCondition() {
		this.compiled()
		return this.condition
	}

	/**
	 * Return an array of operation characters.
	 * This array excludes conditions and ignored qubits.
	 */
	getGates() {
		this.compiled()
		return this.gates
	}

	/**
	 * Return the compiled function that will transform a quantum state by this operation.
	 * The returned function takes two arguments:
	 *  - the quantum state - an array of alternating real and imaginary amplitude values,
	 *  - the rotation - in units of whole rotations (not radians)
	 */
	compiled() {
		if (this.transform) {
			// return memoized compiled result
			return this.transform
		}

		var code = ""
		var needTrig1 = false
		var needTrig2 = false
		var needTrig3 = false
		var tempsNeeded = 2
		var conditionMask = 0
		var conditionValue = 0

		// loop over each bit of the operation (lsb to msb)
		for (var i = 0; i < this.length; ) {
			var transform = undefined
			var gate = this.get(i)
			switch (gate) {
				case '-':
					gate = undefined
					transform = ""
					break
				case '0':
					gate = undefined
					conditionMask |= 1 << i
					break
				case '1':
					gate = undefined
					conditionMask |= conditionValue |= 1 << i
					break
				case 'H':
					needTrig2 = needTrig3 = true
					tempsNeeded = Math.max(6, tempsNeeded)
					transform = `
						a = amplitudes[i];
						b = amplitudes[i | 1];
						c = amplitudes[i | ${h(2 << i)}];
						d = amplitudes[i | ${h(2 << i | 1)}];
						e = a * cosHalf + (d + b) * sinHalfOverSqrt2;
						f = b * cosHalf - (a + c) * sinHalfOverSqrt2;
						amplitudes[i]                    = e * cosHalf - f * sinHalf;
						amplitudes[i | 1]                = f * cosHalf + e * sinHalf;
						e = c * cosHalf + (b - d) * sinHalfOverSqrt2;
						f = d * cosHalf + (c - a) * sinHalfOverSqrt2;
						amplitudes[i | ${h(2 << i)}]     = e * cosHalf - f * sinHalf;
						amplitudes[i | ${h(2 << i | 1)}] = f * cosHalf + e * sinHalf;`
					break
				case 'N':
					needTrig2 = true
					tempsNeeded = Math.max(6, tempsNeeded)
					transform = `
						a = amplitudes[i];
						b = amplitudes[i | 1];
						c = amplitudes[i | ${h(2 << i)}];
						d = amplitudes[i | ${h(2 << i | 1)}];
						e = a * cosHalf + d * sinHalf;
						f = b * cosHalf - c * sinHalf;
						amplitudes[i]                    = e * cosHalf - f * sinHalf;
						amplitudes[i | 1]                = f * cosHalf + e * sinHalf;
						e = c * cosHalf + b * sinHalf;
						f = d * cosHalf - a * sinHalf;
						amplitudes[i | ${h(2 << i)}]     = e * cosHalf - f * sinHalf;
						amplitudes[i | ${h(2 << i | 1)}] = f * cosHalf + e * sinHalf;`
					break
				case 'X':
					needTrig1 = true
					tempsNeeded = Math.max(4, tempsNeeded)
					transform = `
						a = amplitudes[i];
						b = amplitudes[i | 1];
						c = amplitudes[i | ${h(2 << i)}];
						d = amplitudes[i | ${h(2 << i | 1)}];
						amplitudes[i]                    = a * cos + d * sin;
						amplitudes[i | 1]                = b * cos - c * sin;
						amplitudes[i | ${h(2 << i)}]     = c * cos + b * sin;
						amplitudes[i | ${h(2 << i | 1)}] = d * cos - a * sin;`
					break
				case 'Y':
					needTrig1 = true
					tempsNeeded = Math.max(4, tempsNeeded)
					transform = `
						a = amplitudes[i];
						b = amplitudes[i | 1];
						c = amplitudes[i | ${h(2 << i)}];
						d = amplitudes[i | ${h(2 << i | 1)}];
						amplitudes[i]                    = a * cos - c * sin;
						amplitudes[i | 1]                = b * cos - d * sin;
						amplitudes[i | ${h(2 << i)}]     = c * cos + a * sin;
						amplitudes[i | ${h(2 << i | 1)}] = d * cos + b * sin;`
					break
			}

			if (i < this.minLength) {
				this.gates.push(gate)
			}

			if (transform === undefined) {
				++i
				continue
			}

			// left-extend the number of bits to count as much as possible
			var bitLength = 1
			while (i + bitLength < this.length && this.get(i + bitLength) == '-') {
				++bitLength
				this.gates.push(undefined)
			}

			code =
				this.codeForLoop(i, bitLength, code) +
				this.codeForNestedLoops(
					((1 << (i + bitLength)) - 1) & ~((1 << i) | conditionMask),
					transform)

			i += bitLength
		}

		if (!code) {
			// phase rotation only
			needTrig1 = true
			code = this.codeForNestedLoops(
				((1 << this.length) - 1) & ~conditionMask, `
				a = amplitudes[i];
				b = amplitudes[i | 1];
				amplitudes[i]     = a * cos - b * sin;
				amplitudes[i | 1] = b * cos + a * sin;`)
		}

		// add top-level loop, where i is the index into the amplitudes array
		code = `
			var n = amplitudes.length;
			for (var i = ${h(conditionValue << 1)}; i < n; i += ${h(2 << this.length)}) {
				${code}
			}`

		// add computation of constant trig values
		if (needTrig3) {
			// sin(πr) / √2
			code = `
				var sinHalfOverSqrt2 = sinHalf * Math.SQRT1_2;
				${code}`
		}
		if (needTrig2) {
			// sin(πr)
			// cos(πr)
			code = `
				var sinHalf = Math.sin(halfAngle);
				var cosHalf = Math.cos(halfAngle);
				${code}`
		}
		if (needTrig1) {
			// sin(2πr)
			// cos(2πr)
			code = `
				var sin = Math.sin(2 * halfAngle);
				var cos = Math.cos(2 * halfAngle);
				${code}`
		}

		// finally, define remaining variables used
		code = `
			${"var a, b, c, d, e, f".substring(0, tempsNeeded * 3 + 2)};
			var halfAngle = Math.PI * rotation;
			${code}`

		if (process.env.NODE_ENV === "development") {
			// pretty-print the generated code for easier debugging
			code = require('js-beautify') (code, {
				indent_level: 1,         // eslint-disable-line camelcase
				indent_with_tabs: true,  // eslint-disable-line camelcase
				preserve_newlines: false // eslint-disable-line camelcase
			})
		}

		// save the computed operation condition
		this.condition = {
			mask: conditionMask,
			value: conditionValue,
		}

		// return a compiled transformation function
		return this.transform = Function("amplitudes", "rotation", code)
	}

	/**
	 * Return Javascript code that wraps a loop around a supplied body of code.
	 *
	 * The loop expects a variable "i" defined in an outer scope whose value will
	 * be the starting index of the loop.
	 * The loop will evaluate the body of the code 2^bitLength times with a range of bits
	 * within i set to all possible values.
	 *
	 * @param {int} startIndex - starting bit index of the loop counter
	 * @param {int} bitLength - number of bits of the loop counter
	 * @param {string} body - Javascript code to repeat in the loop
	 */
	codeForLoop(startIndex, bitLength, body) {
		if (bitLength < 1 || !body) {
			// no loop needed
			return body
		}

		// merge a decrement of i at end of loop body with increment/decrement done here
		var decrementAtEndOfBody = 0
		if (body.endsWith(";//-")) {
			// get the decrement and remove the last statement from the loop body
			decrementAtEndOfBody = parseInt(
				body.substring(body.lastIndexOf(" ") + 1, body.length - 4))
			body = body.substring(0, body.lastIndexOf("\n"))
		}

		const startBit = 2 << startIndex
		const endBit = 2 << (startIndex + bitLength)

		// optional optimization - check for small loop to unroll
		if (bitLength == 1 && body.length < 999) {
			// unroll small loop
			return `
				${body}
				i += ${h(startBit - decrementAtEndOfBody)};
				${body}
				i -= ${h(startBit + decrementAtEndOfBody)};//-`
		}

		return `
			do {
				${body}
				i += ${h(startBit - decrementAtEndOfBody)};
			} while (i & ${h((endBit - 1) ^ (startBit - 1))});
			i -= ${h(endBit)};//-`
	}

	/**
	 * Return Javascript code that wraps nested loops around a supplied body of code.
	 *
	 * The loop expects a variable "i" defined in an outer scope whose value will
	 * be the starting index of the loop.
	 * The counterBitMask specifies the subset of bits within i to iterate over.
	 * The loop will evaluate the body of the code with i set to all bit values.
	 *
	 * @param {int} counterBitMask - bits of the loop counter to iterate over
	 * @param {string} body - Javascript code to repeat in the loop
	 */
	codeForNestedLoops(counterBitMask, body) {
		// find all contiguous runs of counter bits
		var i = 0
		var runLength = 0
		while (counterBitMask) {
			if (counterBitMask & 1) {
				// continue current run
				++runLength
			} else {
				// end of a run
				body = this.codeForLoop(i - runLength, runLength, body)
				runLength = 0
			}
			++i
			counterBitMask >>= 1
		}

		return this.codeForLoop(i - runLength, runLength, body)
	}
}

// flyweight No-Op
export const noop = new Operation(null)

/**
 * Simulates the state of a quantum processor.
 * Keeps the complex amplitudes for all qubits states.
 * The state can be modified by an operation.
 */
export class Simulator {
	/**
	 * Construct a new simulator with either:
	 *  - an initial number of qubits, or
	 *  - a copy of another Simulator.
	 *
	 * @param {int|Simulator} [argument] - number of qubits, or another Simulator
	 */
	constructor(argument = 0) {
		if (argument instanceof Simulator) {
			this.numberOfQubits = argument.numberOfQubits
			this.amplitudes = argument.amplitudes.slice()
		} else {
			this.reset()
			this.expandState(argument)
		}
	}

	/**
	 * Zero all qubits.
	 */
	reset() {
		this.numberOfQubits = 0
		this.amplitudes = [1, 0]
	}

	/**
	 * Perform an operation modifying the quantum state.
	 *
	 * @param {string|Operation} op - the operation to perform
	 * @param {number} rotation - whole rotations (not radians)
	 */
	do(op, rotation = 1/2) {
		op = this.compiledOp(op)

		// check for full rotation(s) (i.e., integer rotation)
		if (Number.isInteger(rotation)) {
			// full rotation(s) get us back to where we started - don't do anything
			return op
		}

		const transform = op.compiled()

		// check for a condition that can never be met
		if (op.condition.value >= (1 << this.numberOfQubits)) {
			// operation conditional upon nonexistent qubit being 1 - don't do anything
			return op
		}

		// expand the state iff more qubits are needed
		this.expandState(op.minLength)

		// perform the operation
		transform(this.amplitudes, rotation)

		return op
	}

	/**
	 * Return a compiled Operation.
	 *
	 * @param {string|Operation} op
	 */
	compiledOp(op) {
		if (op instanceof Operation) {
			return op
		} else if (op === null) {
			return noop
		}
		return new Operation(op)
	}

	/**
	 * Increase the quantum state to the specified number of qubits.
	 * Any new qubits are assumed to be in the 0 state.
	 * Don't do anything if the current state already has enough qubits.
	 */
	expandState(numberOfQubits) {
		if (numberOfQubits > this.numberOfQubits) {
			const oldLength = this.amplitudes.length
			this.amplitudes.length = 2 << numberOfQubits
			this.amplitudes.fill(0, oldLength)
			this.numberOfQubits = numberOfQubits
		}
	}
}
