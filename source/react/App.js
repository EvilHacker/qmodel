/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import { load, save } from '../util/LocalStorage'
import { QuantumOpTransition } from './QuantumOpTransition'
import { QuantumProgramView } from './QuantumProgramView'
import { Simulator } from '../quantum/Simulator'
import Github from './github.svg'
import styles from './App.css'

const maxQubits = 10

const defaultProgram =
`HHHH,     1/2
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
			rotation: 0,
			showSettings: false,
			numberOfQubits: numberOfQubits,
			directionMode: directionMode,
			transitionMode: transitionMode,
			nextTransitionMode: transitionMode,
			transitionSpeed: transitionSpeed,
			nextTransitionSpeed: transitionSpeed,
		}

		this.sim = new Simulator(numberOfQubits)
	}

	onOp = (op, rotation) => {
		op = this.sim.compiledOp(op)
		if (op.minLength > maxQubits) {
			throw `${op.minLength} qubits is more than max of ${maxQubits}`
		}

		this.sim.do(op, rotation)

		const {state} = this
		this.setState({
			count: state.count + 1,
			op: op,
			rotation: rotation,
			transitionMode: state.nextTransitionMode,
			transitionSpeed: state.nextTransitionSpeed,
		})
	}

	onReset = () => {
		const {state} = this
		this.sim = new Simulator(state.numberOfQubits)
		this.setState({
			count: state.count + 1,
			op: null,
			rotation: 0,
			showSettings: false
		})
	}

	onDone = () => {
		this.setState({
			op: null,
			rotation: 0
		})
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

	onNumberOfQubits = event => {
		const numberOfQubits = Number(event.target.value)
		if (numberOfQubits > this.sim.numberOfQubits) {
			this.sim = new Simulator(this.sim)
			this.sim.expandState(numberOfQubits)
		}
		this.setState({
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
									value={state.nextTransitionMode}
									onChange={this.onTransitionMode}
								>
									<option value="simple">Simple</option>
									<option value="accurate">Accurate</option>
								</select>
								{" "}
								<select
									value={state.nextTransitionSpeed}
									onChange={this.onTransitionSpeed}
								>
									<option value="fast">Fast</option>
									<option value="slow">Slow</option>
								</select>
							</td>
						</tr>
					</tbody>
				</table>
				<div /* call-out arrow */ />
			</div>
		}

		return <div className={styles.app}>
			<h1>Quantum Model</h1>

			<div className={styles.quantumState}>
				<QuantumOpTransition
					sim={this.sim}
					op={state.op}
					rotation={state.rotation}
					directionMode={state.directionMode}
					transitionMode={state.transitionMode}
					transitionSpeed={state.transitionSpeed}
					onDone={this.onDone}
				/>
			</div>

			<div className={styles.program}>
				<QuantumProgramView
					defaultValue={this.program}
					onOp={this.onOp}
					onReset={this.onReset}
					onSettings={this.onSettings}
					onProgramChanged={this.onProgramChanged}
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
