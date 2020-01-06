/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import dedent from 'dedent.macro'
import { load, save } from '../util/LocalStorage'
import { QuantumOpTransition } from './QuantumOpTransition'
import { QuantumProgramView } from './QuantumProgramView'
import { Simulator, compiledOp } from '../quantum/Simulator'
import Github from './github.svg'
import styles from './App.css'

const maxQubits = 10

const defaultProgram = dedent`
	---* : 🍕 pepperoni  # 1 ⟹ topping included
	--*- : 🥓 ham        # 1 ⟹ topping included
	-*-- : 🍄 mushrooms  # 1 ⟹ topping included
	*--- : 🍍 pineapples # 1 ⟹ topping included

	HHHH # start with an equal probability of every possible pizza

	loop 6 times: Grover Iteration
		---* ---- : ¬Laura # 0 ⟹ Laura's preference satisfied
		--*- ---- : ¬Jason # 0 ⟹ Jason's preference satisfied
		-*-- ---- : ¬Chris # 0 ⟹ Chris' preference satisfied
		*--- ---- : Sam    # 1 ⟹ Sam's preference satisfied

		---+ --00 # Laura - fail if no pepperoni and no ham
		--+- -00- # Jason - fail if no ham and no mushrooms
		-+-- --11 # Chris - fail if pepperoni and ham
		+--- 1010 # Sam 1 - pass if Hawaiian
		+--- 010- # Sam 2 - pass if not Hawaiian but has veggies

		1000 ---- # rotate disks with all preferences satisfied

		+--- 010- # Sam 2 - undo
		+--- 1010 # Sam 1 - undo
		-+-- --11 # Chris - undo
		--+- -00- # Jason - undo
		---+ --00 # Laura - undo

		# amplify the minority of disks pointing in opposite direction
		---- HHHH
		---- 0000
		---- HHHH
	repeat: Grover Iteration

`

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
		if (this.state.transitioning) {
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

		const aboutCorner = <div>
			<div
				className={styles.corner}
				onClick={() => this.setState({showAbout: true})}
			>
				<div>QModel</div>
			</div>

			<div
				className={styles.about}
				style={{
					visibility: state.showAbout ? "visible" : "hidden",
					opacity: state.showAbout ? 1 : 0,
				}}
				onClick={() => this.setState({showAbout: false})}
			>
				<div>
					<header>QModel</header>
					<p>Version {process.env.VERSION}</p>
					<footer>
						<div>
							Copyright © 2019 Mark Suska
						</div>
						<div>
							<a href="https://github.com/EvilHacker/qmodel"><Github/></a>
						</div>
					</footer>
				</div>
			</div>
		</div>

		let settings = undefined
		if (state.showSettings) {
			settings = <div className={styles.settings} onDblClick={this.onSettings}>
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
				<div /* call-out arrow outline */ />
				<div /* call-out arrow fill */ />
			</div>
		}

		return <table className={styles.app}>
			<tbody>
				<tr>
					<td>
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

						{aboutCorner}
					</td>
				</tr>
				<tr>
					<td className={styles.program}>
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
					</td>
				</tr>
			</tbody>
		</table>
	}
}
