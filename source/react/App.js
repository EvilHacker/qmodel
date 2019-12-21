/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import { load, save } from '../util/LocalStorage'
import { QuantumOpTransition } from './QuantumOpTransition'
import { QuantumProgramView } from './QuantumProgramView'
import { Simulator, compiledOp } from '../quantum/Simulator'
import Github from './github.svg'
import styles from './App.css'

const maxQubits = 10

const defaultProgram =
`HHHH
1---,     1/2
 1--,     1/4
  1-,     1/8
   1,    1/16

++-0+,   +1/2
++-0+,   -1/2`

export class App extends PureComponent {
	constructor(props, context) {
		super(props, context)

		const numberOfQubits = Math.max(1, Math.min(maxQubits, load("numberOfQubits", 1)))
		const directionMode = load("directionMode", "compass")
		const transitionMode = load("transitionMode", "simple")
		const transitionSpeed = load("transitionSpeed", "fast")
		this.program = load("program", defaultProgram)

		this.state = {
			count: 0,
			numberOfQubits: numberOfQubits,
			directionMode: directionMode,
			transitionMode: transitionMode,
			nextTransitionMode: transitionMode,
			transitionSpeed: transitionSpeed,
			nextTransitionSpeed: transitionSpeed,
		}
		this.onReset()
	}

	onRun = (ops, onDone) => {
		if (!ops.length) {
			// no ops to run now, but continue after render and a short pause
			setTimeout(onDone, 250)
			return
		}

		const {state} = this

		// perform all the operations
		const {nextState} = state
		const previousState = state.transitionMode == "simple"
			? new Simulator(nextState)
			: null
		ops.forEach(op => nextState.do(op.op = compiledOp(op.op), op.rotation))

		this.setState({
			count: state.count + 1,
			previousState,
			nextState,
			ops,
			onDone,
			transitionMode: state.nextTransitionMode,
			transitionSpeed: state.nextTransitionSpeed,
			transitioning: true,
		})
	}

	onStop = () => {
		const {state} = this
		if (state.transitioning) {
			// stop at the end of the current operation
			this.setState({
				onDone: null,
			}, this.onDone)
		}
	}

	onReset = () => {
		// reset to the beginning of the program
		const {state} = this
		this.setState({
			count: state.count + 1,
			previousState : null,
			nextState: new Simulator(state.numberOfQubits),
			labels: [],
			nextLabels: [],
			loopStack: [],
			nextLoopStack: [],
			ops: null,
			onDone: null,
			showSettings: false,
			transitioning: false,
		})
	}

	onDone = () => {
		const {state} = this
		const {onDone} = state
		this.setState({
			previousState : null,
			labels: state.nextLabels,
			loopStack: state.nextLoopStack,
			ops: null,
			onDone: null,
			transitioning: false,
		}, onDone)
	}

	onSettings = () => {
		this.setState({
			showSettings: !this.state.showSettings
		})
	}

	onProgramChanged = program => {
		delete this.program
		save("program", program, 2000)
	}

	onLabelsChanged = labels => {
		// update state only if labels have changed
		const currentLabels = this.state.nextLabels
		for (let i = Math.max(labels.length, currentLabels.length) - 1; i >= 0; --i) {
			if (labels[i] != currentLabels[i]) {
				// update the labels after the current operation
				this.setState({
					nextLabels: labels
				})

				if (!this.state.transitioning) {
					// update the labels immediately
					this.setState({
						labels
					})
				}

				break
			}
		}
	}

	onLoopStackChanged = loopStack => {
		const loopStackCopy = loopStack.map(loop => ({...loop}))

		// update the loop stack after the current operation
		this.setState({
			nextLoopStack: loopStackCopy
		})

		if (!this.state.transitioning) {
			// update the loop stack immediately
			this.setState({
				loopStack: loopStackCopy
			})
		}
	}

	onNumberOfQubits = event => {
		const numberOfQubits = +event.target.value
		this.setState({
			count: this.state.count + this.state.nextState.expandState(numberOfQubits),
			numberOfQubits: numberOfQubits
		})
		save("numberOfQubits", numberOfQubits)
	}

	onDirectionMode = event => {
		const directionMode = event.target.value
		this.setState({
			directionMode: directionMode
		})
		save("directionMode", directionMode)
	}

	onTransitionMode = event => {
		const transitionMode = event.target.value
		this.setState({
			nextTransitionMode: transitionMode
		})
		save("transitionMode", transitionMode)
	}

	onTransitionSpeed = event => {
		const transitionSpeed = event.target.value
		this.setState({
			nextTransitionSpeed: transitionSpeed
		})
		save("transitionSpeed", transitionSpeed)
	}

	render() {
		const {state} = this
		let settings = undefined
		if (state.showSettings) {
			settings = <div className={styles.settings} onDoubleClick={this.onSettings}>
				<table>
					<tbody>
						<tr>
							<td>Qubits:</td>
							<td>
								<select
									value={state.numberOfQubits}
									onChange={this.onNumberOfQubits}
								>
									{Array(maxQubits).fill().map((_, i) =>
										<option key={++i} value={i}>{i}</option>)}
								</select>
							</td>
						</tr>
						<tr>
							<td>Directions:</td>
							<td>
								<select
									value={state.directionMode}
									onChange={this.onDirectionMode}
								>
									<option value="compass">Compass N/S/E/W</option>
									<option value="complex">Complex +1,-1,-𝑖,+𝑖</option>
								</select>
							</td>
						</tr>
						<tr>
							<td>Transition:</td>
							<td>
								<select
									value={state.nextTransitionSpeed}
									onChange={this.onTransitionSpeed}
								>
									<option value="fast">Fast</option>
									<option value="slow">Slow</option>
								</select>
								{" & "}
								<select
									value={state.nextTransitionMode}
									onChange={this.onTransitionMode}
								>
									<option value="simple">Simple</option>
									<option value="accurate">Accurate</option>
								</select>
							</td>
						</tr>
					</tbody>
				</table>
				<div /* call-out arrow */ onClick={this.onSettings} />
			</div>
		}

		return <div className={styles.app}>
			<h1>Quantum Model</h1>

			<div className={styles.quantumState}>
				<QuantumOpTransition
					count={state.count}
					previousState={state.previousState}
					nextState={state.nextState}
					ops={state.ops}
					labels={state.labels}
					loopStack={state.loopStack}
					directionMode={state.directionMode}
					transitionMode={state.transitionMode}
					fullRotationTime={state.transitionSpeed == "slow" ? 8000 : 2000}
					onDone={this.onDone}
				/>
			</div>

			<div className={styles.program}>
				<QuantumProgramView
					defaultValue={this.program}
					maxQubits={maxQubits}
					onRun={this.onRun}
					onStop={this.onStop}
					onReset={this.onReset}
					onSettings={this.onSettings}
					onProgramChanged={this.onProgramChanged}
					onLabelsChanged={this.onLabelsChanged}
					onLoopStackChanged={this.onLoopStackChanged}
				/>

				{settings}
			</div>

			<div className={styles.footer}>
				<div>
					Copyright © 2019 Mark Suska
				</div>
				<div>
					<a href="https://github.com/EvilHacker/qmodel"><Github/></a>
				</div>
			</div>
		</div>
	}
}
