/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { parseRotation } from '../quantum/Rotation'
import styles from './QuantumProgramView.css'
import Step from './arrow-right.svg'
import Reset from './stop.svg'
import Cog from './cog.svg'

const fontSize = 17
const lineHeight = 20
const characterWidth = 10
const padding = 4

export class QuantumProgramView extends PureComponent {
	static propTypes = {
		defaultValue: PropTypes.string,
		onOp: PropTypes.func,
		onReset: PropTypes.func,
		onSettings: PropTypes.func,
		onProgramChanged: PropTypes.func,
	}

	static defaultProps = {
		defaultValue: "",
		onOp: () => undefined,
		onReset: () => undefined,
		onProgramChanged: () => undefined,
	}

	state = {
		programLines: [],
		nextLineNumber: 0,
		menuLineNumber: null,
		errorLineNumber: null,
		errorMessage: null,
		gutterWidth: 0,
		textHeight: 0,
		verticalScroll: 0,
		stepping: false,
	}

	textArea = React.createRef()

	step(direction) {
		let nextLineNumber = this.state.nextLineNumber
		if (direction < 0) {
			nextLineNumber += direction
			if (nextLineNumber < 0) {
				// stepping backward at beginning of program - don't do anything
				return
			}
		}
		const lines = this.state.programLines
		if (nextLineNumber >= lines.length) {
			// stepping forward at end of program - don't do anything
			return
		}

		// get the line without comment and leading/trailing whitespace
		let line = lines[nextLineNumber]
			.split("//")[0]
			.split("#")[0]
			.trim()

		// perform the operation (iff not empty)
		if (line.length > 0) {
			line = line.split(",")
			let errorPrefix = ""
			try {
				const op = line[0]
				errorPrefix = "Rotation: "
				const rotation = parseRotation(line.slice(1).join() || "0.5")
				errorPrefix = "Operation: "
				this.props.onOp(op, direction * rotation)
			} catch (ex) {
				this.setState({
					errorLineNumber: nextLineNumber,
					errorMessage: errorPrefix + (ex.message || ex.toString()),
				})
				return
			}
		}

		if (direction > 0) {
			nextLineNumber += direction
		}
		this.setNextLineNumber(nextLineNumber)
	}

	setNextLineNumber(nextLineNumber) {
		const textArea = this.textArea.current

		// scroll pointer into view
		const pointerTop = nextLineNumber * lineHeight - this.state.verticalScroll + padding
		if (pointerTop < 0) {
			const scrollAmount = Math.min(textArea.scrollTop, -pointerTop)
			textArea.scrollTop -= scrollAmount
		} else if (pointerTop >= textArea.clientHeight - lineHeight) {
			const scrollAmount = Math.max(0, Math.min(
				textArea.scrollHeight - textArea.scrollTop - textArea.clientHeight,
				pointerTop - textArea.clientHeight + lineHeight))
			textArea.scrollTop += scrollAmount
		}

		this.setState({
			nextLineNumber: nextLineNumber,
			errorLineNumber: null,
			errorMessage: null,
			gutterHeight: textArea.clientHeight,
			gutterScroll: textArea.scrollTop,
			stepping: true
		})
	}

	showGutterMenu(lineNumber) {
		document.removeEventListener('click', this.hideGutterMenu)
		document.removeEventListener('contextmenu', this.hideGutterMenu)
		this.setState({
			menuLineNumber: lineNumber
		}, () => {
			if (lineNumber !== null) {
				document.addEventListener('click', this.hideGutterMenu)
				document.addEventListener('contextmenu', this.hideGutterMenu)
			}
		})
	}

	hideGutterMenu = this.showGutterMenu.bind(this, null)

	onStepForward = this.step.bind(this, 1)

	onStepBackward = this.step.bind(this, -1)

	onReset = () => {
		this.props.onReset()
		this.setNextLineNumber(0)
	}

	onSettings = () => {
		this.props.onSettings()
	}

	onUpdateProgramText = () => {
		const program = this.textArea.current.value
		const lines = program.split(/\r|\r\n|\n/)

		// remove any trailing blank lines
		while (lines.length > 0 && lines[lines.length - 1].trim() == "") {
			lines.pop()
		}

		this.setState({
			programLines: lines,
			nextLineNumber: Math.min(this.state.nextLineNumber, lines.length),
			errorLineNumber: null,
			errorMessage: null,
			gutterWidth: Math.max(Math.ceil(Math.log10(lines.length + 1)) * characterWidth, 20) + 2 * padding,
			stepping: false
		})

		this.props.onProgramChanged(program)
	}

	onUpdateScrollPosition = () => {
		const textArea = this.textArea.current
		this.setState({
			textHeight: textArea.clientHeight,
			verticalScroll: textArea.scrollTop,
			stepping: false
		})
	}

	onGutterClick = event => {
		event.preventDefault()
		const lineNumber = Number(event.target.innerText) - 1
		this.showGutterMenu(this.state.menuLineNumber == lineNumber
			? null
			: lineNumber)
	}

	onSetNextStatement = event => {
		event.preventDefault()
		this.hideGutterMenu()
		this.setNextLineNumber(this.state.menuLineNumber)
	}

	onDismissError = () => {
		this.setState({
			errorLineNumber: null,
			errorMessage: null,
		})
	}

	componentDidMount() {
		this.onUpdateProgramText()
		this.onUpdateScrollPosition()
	}

	render() {
		const fontSizePx = `${fontSize}px`
		const lineHeightPx = `${lineHeight}px`
		const gutterWidthPx = `${this.state.gutterWidth}px`
		const textHeightPx = `${this.state.textHeight}px`
		const {programLines, nextLineNumber, errorLineNumber, menuLineNumber, verticalScroll, stepping} = this.state

		// next operation pointer
		const gutterContent = [
			<div
				key="p"
				className={styles.pointer}
				style={{
					top: nextLineNumber * lineHeight - verticalScroll + padding,
					transition: stepping && "0.2s"
				}}
			>
				➤
			</div>
		]

		// line numbers
		for (let i = 0; i <= programLines.length; ++i) {
			gutterContent.push(
				<div
					key={i}
					className={i === menuLineNumber
						? `${styles.lineNumber} ${styles.selected}`
						: styles.lineNumber}
					style={{
						top: i * lineHeight - verticalScroll + padding,
						height: lineHeight
					}}
					onClick={this.onGutterClick}
					onContextMenu={this.onGutterClick}
				>
					{i + 1}
				</div>
			)
		}

		// error message (if any)
		let error = undefined
		if (errorLineNumber !== null) {
			error = <>
				<div
					className={styles.errorHighlight}
					style={{
						top: errorLineNumber * lineHeight - verticalScroll + padding - 1,
						left: gutterWidthPx,
						height: lineHeight + 2,
					}}
				/>
				<div
					className={styles.errorMessage}
					style={{
						top: (errorLineNumber + 1) * lineHeight - verticalScroll + padding,
						left: gutterWidthPx
					}}
					onClick={this.onDismissError}
					onContextMenu={this.onDismissError}
				>
					{this.state.errorMessage}
				</div>
			</>
		}

		// pop-up menu (if shown)
		let gutterMenu = undefined
		if (menuLineNumber !== null) {
			gutterMenu = <div
				className={styles.popup}
				style={{
					top: menuLineNumber * lineHeight - verticalScroll + padding,
					left: gutterWidthPx
				}}
			>
				<button
					onClick={this.onSetNextStatement}
					onContextMenu={this.onSetNextStatement}
				>
					➤ Set Next Operation
				</button>
			</div>
		}

		return <table className={styles.program}>
			<tbody>
				<tr>
					<td>
						<button className={styles.button} onClick={this.onStepForward}>
							<div style={{transform: "rotate(90deg)"}}><Step/></div>
						</button>
						<button className={styles.button} onClick={this.onStepBackward}>
							<div style={{transform: "rotate(-90deg)"}}><Step/></div>
						</button>
						<button className={styles.button} onClick={this.onReset}>
							<Reset/>
						</button>
					</td>
					{this.props.onSettings &&
						<td align="right">
							<button className={styles.button} onClick={this.onSettings}>
								<div style={{transform: "rotate(18deg)"}}><Cog/></div>
							</button>
						</td>
					}
				</tr>

				<tr>
					<td colSpan="2" className={styles.editor}>
						<textarea
							ref={this.textArea}
							rows="16" cols="24"
							wrap="off"
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							spellCheck="false"
							defaultValue={this.props.defaultValue}
							style={{
								lineHeight: lineHeightPx,
								fontSize: fontSizePx,
								padding: padding,
								paddingLeft: this.state.gutterWidth + characterWidth,
							}}
							onChange={this.onUpdateProgramText}
							onScroll={this.onUpdateScrollPosition}
							onMouseMove={this.onUpdateScrollPosition}
							// handle cursor/modifier keys (if supported by the browser)
							onKeyDown={errorLineNumber !== null ? this.onDismissError : undefined}
						/>

						<div
							className={styles.textOverlay}
							style={{
								height: textHeightPx,
							}}
						>
							<div
								className={styles.gutter}
								style={{
									width: gutterWidthPx,
									height: textHeightPx,
									lineHeight: lineHeightPx,
									fontSize: fontSizePx,
								}}
							>
								{gutterContent}
							</div>

							{error}
						</div>

						{gutterMenu}
					</td>
				</tr>
			</tbody>
		</table>
	}
}
