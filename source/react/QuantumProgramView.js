/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent, createRef } from 'react'
import PropTypes from 'prop-types'
import { Operation } from '../quantum/Simulator'
import { parseReal, parseInteger, parseLabelledBits } from '../quantum/parse'
import { findIndexFrom, findLastIndex } from '../util/findIndex'
import { insertText } from '../util/insertText'
import styles from './QuantumProgramView.css'
import Step from './arrow-right.svg'
import Run from './arrow-right-2.svg'
import Stop from './stop.svg'
import Reset from './reset.svg'
import Cog from './cog.svg'

const fontSize = 17
const lineHeight = 20
const characterWidth = 10
const nullFunction = () => undefined

export class QuantumProgramView extends PureComponent {
	static propTypes = {
		defaultValue: PropTypes.string,
		maxQubits: PropTypes.number,
		onRun: PropTypes.func, // (op[]) => undefined
		onStop: PropTypes.func, // () => undefined
		onReset: PropTypes.func, // () => undefined
		onSettings: PropTypes.func, // () => undefined
		onProgramChanged: PropTypes.func, // (program: string) => undefined
		onLabelsChanged: PropTypes.func, // (labels: string[]) => undefined
		onLoopStackChanged: PropTypes.func, // (loopStack: {}[]) => undefined
	}

	static defaultProps = {
		maxQubits: 16,
		onRun: nullFunction,
		onStop: nullFunction,
		onReset: nullFunction,
		onProgramChanged: nullFunction,
		onLabelsChanged: nullFunction,
		onLoopStackChanged: nullFunction,
	}

	state = {
		programLines: [],
		qubitsUsed: 0,
		pointer: 0, // zero based
		menuLineNumber: null, // zero based
		errorLineNumber: null, // zero based
		errorMessage: null,
		gutterWidth: 0, // in pixels
		textWidth: 0, // in pixels
		verticalScroll: 0, // in pixels
		stepping: false,
	}

	loopStack = []
	textArea = createRef()

	runTo = (direction, targetPointer, singleStep /* = false */) => {
		const {programLines, pointer} = this.state
		const pointerToLineOffset = (direction - 1) / 2
		let lineIndex = pointer + pointerToLineOffset
		let endLineIndex = targetPointer + pointerToLineOffset

		const loopName = line => line.loopLabel
			? `loop ${JSON.stringify(line.loopLabel)}`
			: "loop"

		let errorLineNumber = null
		let errorMessage = null

		const error = message => {
			errorLineNumber = lineIndex -= direction
			errorMessage = message
		}

		const loopNotStartedError = line => error(`${loopName(line)} was not started previously`)

		const findOtherEndOfLoop = loopLine => {
			const {type, loopLabel} = loopLine
			const findDirection = type == "loop" ? 1 : -1

			// find the other end of the loop taking into account nested loops with same label
			let nesting = 0
			const i = findIndexFrom(
				programLines,
				lineIndex - direction + findDirection,
				findDirection,
				otherLine => {
					if (otherLine.loopLabel == loopLabel) {
						if (otherLine.type == type) {
							++nesting
						} else {
							return --nesting < 0
						}
					}
					return false
				}
			)

			if (i < 0) {
				error(`${findDirection > 0 ? "end" : "start"} of ${loopName(loopLine)} not found`)
			}

			return i
		}

		const maxOps = 50
		const opsToRun = []
		const {loopStack} = this
		let loopStackChanged = false

		// collect ops until we hit
		//  • the target
		//  • a loop/repeat,
		//  • a breakpoint,
		//  • an error, or
		//  • the beginning/end of the program
		while (lineIndex >= 0 && lineIndex < programLines.length - 1) {
			const line = programLines[lineIndex]
			lineIndex += direction
			const {type} = line
			if (type == "op") {
				opsToRun.push({
					op: line.op,
					rotation: direction * (line.rotation ? line.rotation : 1/2),
				})
				if (singleStep || opsToRun.length >= maxOps) {
					break
				}
			} else if (type == "loop") {
				// forward or backward ?
				if (direction > 0) {
					if (line.times < 1) {
						// find the end of the loop (repeat)
						const i = findOtherEndOfLoop(line)
						if (i >= 0) {
							// loop 0 times
							lineIndex = i + 1
						}
					} else {
						// start the loop
						loopStack.push({
							loopLabel: line.loopLabel,
							times: Math.floor(line.times),
							count: 1,
						})
						loopStackChanged = true
					}
				} else {
					// do previous loop iteration or keep going backward
					const loopStackIndex = findLastIndex(loopStack,
						loop => loop.loopLabel == line.loopLabel)
					if (loopStackIndex < 0) {
						if (line.times < 1) {
							// loop 0 times
						} else {
							// error - loop was not started
							loopNotStartedError(line)
						}
					} else {
						const loop = loopStack[loopStackIndex]
						if (loop.count > 1) {
							// find the end of the loop (repeat)
							const i = findOtherEndOfLoop(line)
							if (i >= 0) {
								// go to end of previous iteration of loop
								lineIndex = i - 1
								--loop.count
								loopStack.length = loopStackIndex + 1
								loopStackChanged = true
							}
						} else {
							// go before the start of the loop
							loopStack.length = loopStackIndex
							loopStackChanged = true
						}
					}
				}
				break
			} else if (type == "repeat") {
				// forward or backward ?
				if (direction > 0) {
					// repeat or end the loop
					const loopStackIndex = findLastIndex(loopStack,
						loop => loop.loopLabel == line.loopLabel)
					if (loopStackIndex < 0) {
						// error - loop was not started
						loopNotStartedError(line)
					} else {
						const loop = loopStack[loopStackIndex]
						if (loop.count < loop.times) {
							// find the start of the loop
							const i = findOtherEndOfLoop(line)
							if (i >= 0) {
								// continue with next iteration of loop
								lineIndex = i + 1
								++loop.count
								loopStack.length = loopStackIndex + 1
								loopStackChanged = true
							}
						} else {
							// end the loop
							loopStack.length = loopStackIndex
							loopStackChanged = true
						}
					}
				} else {
					// find the start of the loop
					const i = findOtherEndOfLoop(line)
					if (i >= 0) {
						const times = Math.floor(programLines[i].times)
						if (times > 0) {
							// start at the end of the last iteration of the loop
							loopStack.push({
								loopLabel: line.loopLabel,
								times: times,
								count: times,
							})
							loopStackChanged = true
						} else {
							// loop 0 times
							lineIndex = i - 1
						}
					}
				}
				break
			} else if (type == "pause") {
				// pause after here
				break
			} else if (type == "stop") {
				// stop after here
				endLineIndex = lineIndex
				break
			} else if (type == "error") {
				// stop here and show error
				error(line.error)
				break
			}

			// check if target reached
			if (lineIndex == endLineIndex) {
				break
			}

			// check for a breakpoint between this line and the next
			if (programLines[lineIndex - pointerToLineOffset].breakpoint) {
				break
			}
		}

		this.setState({
			errorLineNumber,
			errorMessage
		})

		// skip over no-ops and qubit labels but stop at breakpoint
		while (lineIndex != endLineIndex) {
			// check for a breakpoint between this line and the next
			const breakpoint = programLines[lineIndex - pointerToLineOffset].breakpoint
			if (breakpoint) {
				if (breakpoint == "stop") {
					endLineIndex = lineIndex
				}
				break
			}

			// check for an instruction or beginning/end of program
			const line = programLines[lineIndex]
			if (!line || !line.isNoop) {
				break
			}

			lineIndex += direction
		}

		this.setPointer(lineIndex - pointerToLineOffset)

		// check if have NOT hit an error, NOR are single-stepping, NOR reached the target
		let callback
		if (!errorMessage && !singleStep && lineIndex != endLineIndex) {
			// callback to continue running later
			callback = () => this.runTo(direction, targetPointer)
		}

		this.props.onRun(opsToRun, callback)

		if (loopStackChanged) {
			this.props.onLoopStackChanged(loopStack)
		}
	}

	scrollLineIntoView(lineNumber) {
		const textArea = this.textArea.current
		const pointerTop = lineNumber * lineHeight - this.state.verticalScroll
		if (pointerTop < lineHeight) {
			const scrollAmount = Math.min(textArea.scrollTop, lineHeight - pointerTop)
			textArea.scrollTop -= scrollAmount
		} else if (pointerTop >= textArea.clientHeight - lineHeight) {
			const scrollAmount = Math.max(0, Math.min(
				textArea.scrollHeight - textArea.scrollTop - textArea.clientHeight,
				pointerTop - textArea.clientHeight + lineHeight))
			textArea.scrollTop += scrollAmount
		}

		this.setState({
			gutterHeight: textArea.clientHeight,
			gutterScroll: textArea.scrollTop,
		})
	}

	setPointer(pointer) {
		this.setState({
			pointer: pointer,
			stepping: true
		}, this.onUpdateLabels)

		// scroll line into view
		this.scrollLineIntoView(pointer)
	}

	dismissError = () => {
		this.setState({
			errorLineNumber: null,
			errorMessage: null,
		})
	}

	showGutterMenu(lineNumber) {
		document.removeEventListener('click', this.hideGutterMenu)
		document.removeEventListener('contextmenu', this.hideGutterMenu)
		this.setState({
			menuLineNumber: lineNumber
		}, () => {
			if (lineNumber != null) {
				document.addEventListener('click', this.hideGutterMenu)
				document.addEventListener('contextmenu', this.hideGutterMenu)
			}
		})
	}

	hideGutterMenu = this.showGutterMenu.bind(this, null)

	onStepForward = () => {
		this.hideGutterMenu()
		this.runTo(1, this.state.programLines.length - 1, true)
	}

	onStepBackward = () => {
		this.hideGutterMenu()
		this.runTo(-1, 0, true)
	}

	onRunForward = () => {
		this.hideGutterMenu()
		this.runTo(1, this.state.programLines.length - 1)
	}

	onRunBackward = () => {
		this.hideGutterMenu()
		this.runTo(-1, 0)
	}

	onStop = () => {
		this.props.onStop()
		this.setState({
			menuLineNumber: null,
			errorLineNumber: null,
			errorMessage: null,
			stepping: false,
		})
	}

	onReset = () => {
		this.props.onReset()
		this.props.onLoopStackChanged(this.loopStack = [])

		// skip over no-ops and qubit labels at the beginning of the program
		const {programLines} = this.state
		let pointer = 0
		while (pointer < programLines.length && programLines[pointer].isNoop) {
			++pointer
		}
		this.setPointer(pointer)

		this.setState({
			menuLineNumber: null,
			errorLineNumber: null,
			errorMessage: null,
			stepping: false,
		})
	}

	onUpdateProgramText = () => {
		const {maxQubits} = this.props
		const program = this.textArea.current.value
		const rawLines = program.split(/\r|\r\n|\n/)
		const oldLines = this.state.programLines
		const newLines = []
		let oldI = 0
		let newI = 0
		let endI = rawLines.length + 1
		let changeI = endI + 1
		let direction = 1
		let {pointer} = this.state
		let qubitsUsed = 0

		while (newI != endI) {
			const rawLine = rawLines[newI]
			const oldLine = oldLines[oldI] || {}
			let newLine = {...oldLine}
			newLines[newI] = newLine

			if (rawLine == newLine.line) {
				// this line has not been changed
				newI += direction
				oldI += direction
				continue
			}

			if (direction > 0) {
				// first change encountered - start matching lines from the end
				direction = -1
				changeI = newI
				endI = newI - 1
				oldI = oldLines.length - 1
				newI = rawLines.length
				continue
			} else if (oldI > changeI) {
				changeI = oldI
			}

			// parse line with matches:
			//  * loop $1 times: $5
			//  * $2(repeat|pause|stop): $5
			//  * $3, $4: $5
			const matches = rawLine.match(/^\s*(?:loop\b\s*([^#:]*?)\s*(?:\btime[s]?\b)?|(repeat|pause|stop)\b|([^#:,]*?)\s*(?:,\s*([^#:]*?))?)\s*(?::\s*([^#]*?))?\s*?(?:#|\/\/|$)/)
			try {
				const label = matches[5]
				if (matches[3] != null) {
					// <op>, <rotation> OR <bits>: <label>
					const bits = matches[3]
					const rotation = matches[4]
					if (label != null) {
						if (rotation != null) {
							throw "Unexpected rotation (after ',') AND label (after ':')"
						}
						const labels = parseLabelledBits(label, bits)
						if (labels.length > maxQubits) {
							labels.length = maxQubits
						}
						newLine = {
							type: "label",
							qubitLabels: labels,
							isNoop: true
						}
					} else if (bits || rotation != null) {
						const op = new Operation(bits)
						if (op.minLength > maxQubits) {
							throw `Operation requires ${op.minLength} qubits which is more than the max of ${maxQubits}`
						}
						qubitsUsed = Math.max(qubitsUsed, op.length)
						newLine = {
							type: "op",
							op,
							rotation: rotation ? parseReal(rotation) : null
						}
					} else {
						newLine = {
							isNoop: true
						}
					}
				} else if (matches[1] != null) {
					// loop <n> times: <label>
					newLine = {
						type: "loop",
						times: parseInteger(matches[1]),
						loopLabel: label || ""
					}
				} else if (matches[2] == "repeat") {
					// repeat: <label>
					newLine = {
						type: "repeat",
						loopLabel: label || ""
					}
				} else {
					// pause OR stop
					if (label) {
						throw `Label unexpected after '${matches[2]}'`
					}
					newLine = {
						type: matches[2]
					}
				}
			} catch (ex) {
				newLine = {
					type: "error",
					error: ex.message || ex.toString()
				}
			}

			// keep existing breakpoints
			if (direction > 0 || oldI >= changeI) {
				newLine.breakpoint = oldLine.breakpoint
			}

			newLine.line = rawLine
			newLines[newI] = newLine
			newI += direction
			oldI += direction
		}

		// reposition pointer if it was after all changes to the program
		if (pointer > changeI) {
			pointer += rawLines.length + 1 - oldLines.length
		}

		newLines.length = rawLines.length + 1

		this.setState({
			programLines: newLines,
			qubitsUsed,
			pointer: Math.min(pointer, newLines.length),
			errorLineNumber: null,
			errorMessage: null,
			gutterWidth: Math.max(Math.ceil(Math.log10(newLines.length + 1)) * characterWidth, 20) + 26,
			stepping: false
		}, this.onUpdateLabels)

		this.props.onProgramChanged(program)
	}

	onUpdateLabels = () => {
		// stack of qubit labels
		let labels = []
		const labelStack = []

		// loop over all lines up to the current pointer
		const {programLines, pointer} = this.state
		for (let i = 0; i < pointer; ++i) {
			const line = programLines[i]

			// check for qubit labels or the start/end of a loop
			const {qubitLabels} = line
			if (qubitLabels) {
				// accumulate the qubit labels
				qubitLabels.forEach((label, i) => labels[i] = label)
			} else {
				const {loopLabel} = line
				if (loopLabel) {
					if (programLines[i].type == "loop") {
						// start of loop - push qubit labels
						labelStack.push({
							loopLabel,
							labels
						})
					} else { // "repeat"
						// end of loop - pop qubit labels
						for (let i = labelStack.length - 1; i >= 0; --i) {
							if (labelStack[i].loopLabel == loopLabel) {
								labels = labelStack[i].labels
								labelStack.length = i
								break
							}
						}
					}
				}
			}
		}

		this.props.onLabelsChanged(labels)
	}

	onUpdateScrollPosition = () => {
		const textArea = this.textArea.current
		this.setState({
			textWidth: textArea.clientWidth,
			verticalScroll: textArea.scrollTop,
			stepping: false
		})
	}

	onKeyDown = event => {
		if (this.state.errorLineNumber != null) {
			this.dismissError()
		}

		const expandAndTransformSelection = (transform, insertionIfEmpty) => {
			event.preventDefault()
			event.stopPropagation()
			const {target} = event
			let {selectionStart, selectionEnd} = target

			if (insertionIfEmpty && selectionStart == selectionEnd) {
				// nothing selected
				insertText(target, insertionIfEmpty)
			} else {
				const {value} = target

				// expand the selection to include full line(s)
				if (selectionStart == selectionEnd) {
					++selectionEnd
				}
				selectionStart = value.lastIndexOf('\n', selectionStart - 1) + 1
				selectionEnd = value.indexOf('\n', selectionEnd - 1)
				selectionEnd = selectionEnd < 0
					? value.length
					: selectionEnd + 1
				target.setSelectionRange(selectionStart, selectionEnd)

				// get the selection
				const selection = value.slice(selectionStart, selectionEnd)

				// transform and trim end of lines
				const transformed = transform(selection).replace(/[ \t]+($)/gm, "$1")

				// update selection if it has changed
				if (selection != transformed) {
					insertText(target, transformed, true)
				}
			}
		}

		// handle specific key presses
		const key = event.keyCode || event.which
		if (key == 9 && !event.metaKey && !event.ctrlKey && !event.altKey) {
			// ⇥ or ⇤
			if (event.shiftKey) {
				// ⇤ - dedent
				expandAndTransformSelection(
					selection => selection.replace(/^(?:\t| {1,4})/gm, ""))
			} else {
				// ⇥ - indent (or just insert tab if no selection)
				expandAndTransformSelection(
					selection => selection.replace(/^/gm, "\t"),
					'\t')
			}
		} else if (key == 191 && (!!event.metaKey != !!event.ctrlKey) && !event.altKey && !event.shiftKey) {
			// ⌘/ or ⌃/ - comment/uncomment
			expandAndTransformSelection(
				selection => /^([ \t]*)(?!\s|#|\/\/|$)/m.test(selection)
					? selection.replace(/^([ \t]*[^ \t\r\n][^\r\n]*$)/gm, "# $1")
					: selection.replace(/^(\s*)(?:#|\/\/) ?([^\r\n]*$)/gm, "$1$2"))
		}
	}

	onGutterClick = event => {
		event.preventDefault()
		event.stopPropagation()
		const lineNumber = +event.target.parentNode.dataset.line
		if (!event.target.nextSibling) {
			// clicked on error indicator - show/hide error message
			if (lineNumber == this.state.errorLineNumber) {
				this.dismissError()
			} else {
				this.setState({
					errorLineNumber: lineNumber,
					errorMessage: this.state.programLines[lineNumber].error,
				})
			}
		} else if (event.target.previousSibling) {
			// clicked on breakpoint indicator - cycle undefined/pause/stop states
			const programLines = this.state.programLines.slice()
			programLines[lineNumber].breakpoint = {
				undefined: "stop",
				"stop": "pause",
				// "pause": undefined,
			}[programLines[lineNumber].breakpoint]
			this.setState({
				programLines,
			})
		} else {
			// clicked on line number - show/hide contextual menu
			this.showGutterMenu(this.state.menuLineNumber == lineNumber
				? null
				: lineNumber)
		}
	}

	onRunTo = (event, direction) => {
		event.preventDefault()
		event.stopPropagation()
		this.runTo(direction, this.state.menuLineNumber)
		this.hideGutterMenu()
	}

	onRunToForward = event => this.onRunTo(event, 1)

	onRunToBackward = event => this.onRunTo(event, -1)

	onSetPointer = event => {
		event.preventDefault()
		event.stopPropagation()
		this.setPointer(this.state.menuLineNumber)
		this.hideGutterMenu()
		this.dismissError()
	}

	componentDidMount() {
		this.onUpdateScrollPosition()
		this.onUpdateProgramText()
		this.onReset()
	}

	render() {
		const {props, state} = this
		const {
			programLines,
			pointer,
			errorLineNumber,
			menuLineNumber,
			gutterWidth,
			textWidth,
		} = state
		const fontSizePx = `${fontSize}px`
		const lineHeightPx = `${lineHeight}px`
		const lineHeightDoublePx = `${lineHeight * 2}px`
		const gutterWidthPx = `${gutterWidth}px`

		// circuit diagram, and gutter (line numbers and error/breakpoint indicators)
		let circuit = []
		const gutter = []
		let qubitsUsed = 1
		for (let i = 0; i < programLines.length; ++i) {
			const line = programLines[i]
			const {op} = line
			if (op && op.length > qubitsUsed) {
				qubitsUsed = op.length
			}
			circuit.push(<CircuitRow
				key={i}
				op={op && op.op}
				rotation={line.rotation}
			/>)
			gutter.push(
				<div
					key={i}
					data-line={i}
					className={styles.gutterRow}
					style={{
						top: (i - 0.5) * lineHeight,
						height: lineHeightDoublePx,
					}}
				>
					<div
						className={i == menuLineNumber
							? `${styles.lineNumber} ${styles.selected}`
							: styles.lineNumber}
						style={{
							height: lineHeightPx,
							lineHeight: lineHeightDoublePx,
						}}
						onClick={this.onGutterClick}
						onContextMenu={this.onGutterClick}
					>
						{i + 1}
					</div>
					<div
						className={
							{
								pause: `${styles.breakpointIndicator} ${styles.pause}`,
								stop:  `${styles.breakpointIndicator} ${styles.stop}`,
							}[line.breakpoint] || styles.breakpointIndicator
						}
						onClick={this.onGutterClick}
						onContextMenu={this.onGutterClick}
					/>
					{line.error && <div
						className={styles.errorIndicator}
						onClick={this.onGutterClick}
						onContextMenu={this.onGutterClick}
					/>}
				</div>
			)
		}

		// circuit diagram and qubit labels
		const circuitLabels = []
		for (let i = qubitsUsed - 1; i >= 0; --i) {
			circuitLabels.push(<div id={i}>q<sub>{i}</sub></div>)
		}
		circuit = <div
			className={styles.circuit}
			style={{
				right: gutterWidth,
			}}
		>
			{circuit}
		</div>

		// pointer
		const pointerArrow = <div
			className={styles.pointer}
			style={{
				top: pointer * lineHeight - 1,
				transition: state.stepping && "0.2s"
			}}
		>
			<div/>
			<div
				style={{
					width: gutterWidth,
					height: lineHeight * 0.5 + 1,
					marginTop: lineHeight * -0.25,
				}}
			/>
		</div>

		// error message (if any)
		let error
		if (errorLineNumber !== null) {
			error = <div>
				<div
					className={styles.errorHighlight}
					style={{
						top: errorLineNumber * lineHeight,
						left: gutterWidthPx,
						width: textWidth,
						height: lineHeight,
					}}
				/>
				<div
					className={styles.errorMessage}
					style={{
						top: (errorLineNumber + 1) * lineHeight,
						left: gutterWidth + 4,
						width: textWidth - 20
					}}
					onClick={this.dismissError}
					onContextMenu={this.dismissError}
				>
					{state.errorMessage}
				</div>
			</div>
		}

		// pop-up menu (if shown)
		let gutterMenu
		if (menuLineNumber !== null) {
			const again = menuLineNumber == pointer && " (again)"
			gutterMenu = <div
				className={styles.popup}
				style={{
					top: lineHeight *
						Math.max(0, Math.min(menuLineNumber - 0.8, programLines.length - 5.4)),
					left: gutterWidthPx
				}}
			>
				<button
					disabled={menuLineNumber <= 0}
					onClick={this.onRunToForward}
					onContextMenu={this.onRunToForward}
				>
					⬇︎ Run to here – Forward{again}
				</button>
				<button
					disabled={menuLineNumber >= programLines.length - 1}
					onClick={this.onRunToBackward}
					onContextMenu={this.onRunToBackward}
				>
					⬆︎ Run to here – Backward{again}
				</button>
				<button
					disabled={menuLineNumber == pointer}
					onClick={this.onSetPointer}
					onContextMenu={this.onSetPointer}
				>
					➤ Move Pointer Here
				</button>
			</div>
		}

		return <table className={styles.program}>
			<tbody>
				<tr>
					<td className={styles.circuitLabels}>
						{circuitLabels}
					</td>
					<td/>
					<td className={styles.buttonBar}>
						<div>
							<button onClick={this.onStepForward}>
								<div style={{transform: "rotate(90deg)"}}><Step/></div>
							</button>
							<button onClick={this.onStepBackward}>
								<div style={{transform: "rotate(-90deg)"}}><Step/></div>
							</button>
							<button onClick={this.onRunForward}>
								<div style={{transform: "rotate(90deg)"}}><Run/></div>
							</button>
							<button onClick={this.onRunBackward}>
								<div style={{transform: "rotate(-90deg)"}}><Run/></div>
							</button>
							<button onClick={this.onStop}>
								<Stop/>
							</button>
							<button onClick={this.onReset}>
								<Reset/>
							</button>
						</div>
						<div>
							{props.onSettings && <button onClick={props.onSettings}>
								<div style={{transform: "rotate(18deg)"}}><Cog/></div>
							</button>}
						</div>
					</td>
				</tr>

				<tr>
					<td>
						<div className={styles.verticalFill}/>
						<div
							className={styles.circuitBackground}
							style={{
								width: 20 * qubitsUsed,
							}}
						/>
					</td>
					<td
						className={styles.gutter}
						style={{
							width: gutterWidthPx,
							lineHeight: lineHeightPx,
							fontSize: fontSizePx,
						}}
					>
						<div className={styles.verticalFill}/>
						<div className={styles.overlay}>
							<div
								style={{
									top: -state.verticalScroll,
									width: gutterWidthPx,
								}}
							>
								{circuit}
								{gutter}
								{pointerArrow}
								{error}
								{gutterMenu}
							</div>
						</div>
					</td>
					<td>
						<div className={styles.editor}>
							<textarea
								ref={this.textArea}
								wrap="off"
								autoComplete="off"
								autoCorrect="off"
								autoCapitalize="off"
								spellCheck="false"
								defaultValue={props.defaultValue}
								style={{
									lineHeight: lineHeightPx,
									fontSize: fontSizePx,
								}}
								onChange={this.onUpdateProgramText}
								onScroll={this.onUpdateScrollPosition}
								onMouseMove={this.onUpdateScrollPosition}
								onKeyDown={this.onKeyDown}
							/>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	}
}

const gateImages = {
	"-": <svg className={styles.gate}/>,
	0: <svg className={styles.gate} viewBox="0 0 20 20" stroke="#000">
		<circle cx={10} cy={10} r={5} fill="#fff"/>
	</svg>,
	1: <svg className={styles.gate} viewBox="0 0 20 20" stroke="#000">
		<circle cx={10} cy={10} r={5} fill="#000"/>
	</svg>,
	H: <svg className={styles.gate} viewBox="0 0 20 20">
		<path d="M2,2h16v16h-16z" fill="#fff" stroke="#000"/>
		<path d="M6.5,10h7M7,4v12M13,4v12" stroke="#000" strokeWidth={1.5}/>
	</svg>,
	N: <svg className={styles.gate} viewBox="0 0 20 20" stroke="#000">
		<circle cx={10} cy={10} r={8} fill="#fff"/>
		<path d="M10,2v16M2,10h16"/>
	</svg>,
	X: <svg className={styles.gate} viewBox="0 0 20 20">
		<path d="M2,2h16v16h-16z" fill="#fff" stroke="#000"/>
		<text x={8} y={16} fontSize="14px">X</text>
		<text x={14} y={11} fontSize="9px">2</text>
	</svg>,
	Y: <svg className={styles.gate} viewBox="0 0 20 20">
		<path d="M2,2h16v16h-16z" fill="#fff" stroke="#000"/>
		<text x={8} y={16} fontSize="14px">Y</text>
		<text x={14} y={11} fontSize="9px">2</text>
	</svg>,
}

const rotationArcLeft = <svg className={styles.rotationArc} viewBox="0 0 60 20">
	<path d="M8,0v6m-3-3h6m4,-3v6q16,-11 32,0" fill="none" stroke="#000"/>
</svg>

const rotationArcRight = <svg className={styles.rotationArc} viewBox="0 0 60 20">
	<path d="M15,6q16,-11 32,0v-6m4,3h6" fill="none" stroke="#000"/>
</svg>

class CircuitRow extends PureComponent {
	static propTypes = {
		op: PropTypes.string,
		rotation: PropTypes.number,
	}

	render() {
		const fraction = rotation => {
			if (rotation == null) {
				return <div className={styles.rotation}/>
			}
			const arc = rotation < 0 ? rotationArcRight : rotationArcLeft
			const abs = Math.abs(rotation)
			const i = abs < 1 ? "" : (abs < 10 ? Math.floor(abs) : "N")
			const f = abs % 1
			const gcd = (a, b) => b >= 0.5**10 ? gcd(b, a % b) : a
			const n = gcd(f, 1)
			const numerator = Math.round(f / n)
			const denominator = Math.round(1 / n)
			if (numerator && Math.abs(f - (numerator / denominator)) < 1e-6) {
				if (numerator) {
					return <div className={styles.rotation}>
						{i}<sup>{numerator}</sup><span>/</span><sub>{denominator}</sub>
						{arc}
					</div>
				} else {
					return <div className={styles.rotation}>
						{i}
						{arc}
					</div>
				}
			} else {
				return <div className={styles.rotation}>
					<sub>{i}{`${Math.round(f * 1000) / 1000}`.slice(1)}</sub>
					{arc}
				</div>
			}
		}

		const {op, rotation} = this.props
		const gates = []
		let hasCondition = false
		let lastGate = 0
		if (op != null) {
			// gates from left to right
			for (let i = 0; i < op.length; ++i) {
				const c = op[i]
				gates.push(gateImages[c])
				if (c != '-') {
					lastGate = i
					if ("01".includes(c)) {
						hasCondition = true
					}
				}
			}

			// rotation fraction and direction arc & arrow
			gates.push(fraction(
				op === "" && rotation == null
					? 1/2
					: rotation
			))
		}

		return <div>
			{hasCondition && <div
				className={styles.circuitLine}
				style={{
					width: 20 * lastGate,
					marginRight: 20 * (op.length - lastGate - 1),
				}}
			/>}
			{gates}
		</div>
	}
}
