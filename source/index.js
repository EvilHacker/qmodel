/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import styles from './index.css'
import React, { PureComponent } from 'react'
import { render } from 'react-dom'
import { load, save } from './LocalStorage'
import { QuantumOpTransition } from './react/QuantumOpTransition'
import { QuantumProgramView } from './react/QuantumProgramView'
import { Simulator } from './quantum/Simulator'
import Github from './github.svg'

const defaultProgram =
`HHHH,     1/2
1---,     1/2
 1--,     1/4
  1-,     1/8
   1,    1/16

${"++-0+,   +1/2\n".repeat(4)}`

class App extends PureComponent {
	constructor(props, context) {
		super(props, context)

		const numberOfQubits = Math.max(1, Math.min(8, load("numberOfQubits", 1)))
		const directionMode = load("directionMode", "compass")
		const transitionMode = load("transitionMode", "simple")
		this.program = load("program", defaultProgram)

		this.state = {
			count: 0,
			rotation: 0,
			showSettings: false,
			numberOfQubits: numberOfQubits,
			directionMode: directionMode,
			transitionMode: transitionMode,
			nextTransitionMode: transitionMode,
		}

		this.sim = new Simulator(numberOfQubits)
	}

	onOp = (op, rotation) => {
		op = this.sim.compiledOp(op)
		if (op.minLength > 10) {
			throw `${op.minLength} qubits is more than max of 10`
		}
		this.sim.do(op, rotation)
		this.setState({
			count: this.state.count + 1,
			op: op,
			rotation: rotation,
			transitionMode: this.state.nextTransitionMode
		})
	}

	onReset = () => {
		this.sim = new Simulator(this.state.numberOfQubits)
		this.setState({
			count: this.state.count + 1,
			op: undefined,
			rotation: 0,
			showSettings: false
		})
	}

	onDone = () => {
		this.setState({
			op: undefined,
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
		save("program", program, 5000)
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

	render() {
		let settings = undefined
		if (this.state.showSettings) {
			settings = <div className={styles.settings} onDoubleClick={this.onSettings}>
				<table>
					<tbody>
						<tr>
							<td>Qubits:</td>
							<td>
								<select
									value={this.state.numberOfQubits}
									onChange={this.onNumberOfQubits}
								>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4</option>
									<option value="5">5</option>
									<option value="6">6</option>
									<option value="7">7</option>
									<option value="8">8</option>
								</select>
							</td>
						</tr>
						<tr>
							<td>Directions:</td>
							<td>
								<select
									value={this.state.directionMode}
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
									value={this.state.nextTransitionMode}
									onChange={this.onTransitionMode}
								>
									<option value="simple">Simple</option>
									<option value="accurate">Accurate</option>
								</select>
							</td>
						</tr>
					</tbody>
				</table>
				<div/>
			</div>
		}

		return <div className={styles.app}>
			<h1>Quantum Model</h1>

			<div className={styles.quantumState}>
				<QuantumOpTransition
					sim={this.sim}
					op={this.state.op}
					rotation={this.state.rotation}
					directionMode={this.state.directionMode}
					transitionMode={this.state.transitionMode}
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

const body = document.body
const app = body.children[0]
render(<App/>, app)

if (process.env.NODE_ENV !== "development") {
	// remove any injected scripts or advertisements after the app
	body.onload = () => {
		while (body.lastChild !== app) {
			body.removeChild(body.lastChild)
		}
	}
}
