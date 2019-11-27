/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Transition, easeSinusoidalInOut } from './Transition'
import { StateView } from './QuantumStateView'
import { Simulator, Operation, noop } from '../quantum/Simulator'
import { tween } from '../quantum/State'

export class QuantumOpTransition extends PureComponent {
	static propTypes = {
		sim: PropTypes.instanceOf(Simulator).isRequired,
		op: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Operation)]),
		rotation: PropTypes.number,
		directionMode: PropTypes.oneOf(["compass", "complex"]),
		transitionMode: PropTypes.oneOf(["simple", "accurate"]),
		transitionSpeed: PropTypes.oneOf(["fast", "slow"]),
		onDone: PropTypes.func, // () => undefined
	}

	static defaultProps = {
		op: noop,
		rotation: 0,
	}

	render() {
		const {props} = this
		const {sim: nextState, directionMode, onDone} = props

		if (props.op == null || props.op == noop) {
			// no operation to animate
			return <Transition duration={0} onDone={onDone} render={() => {
				return <StateView
					amplitudes={nextState.amplitudes}
					directionMode={directionMode}
				/>
			}}/>
		}

		const op = nextState.compiledOp(props.op)
		const {rotation} = props
		const rotationTime = props.transitionSpeed == "slow" ? 8000 : 2000

		if (props.transitionMode == "simple") {
			// interpolate between the previous state and the next state
			const previousState = new Simulator(nextState)
			previousState.do(op, -rotation)
			const duration = 1000 + rotationTime * (Math.abs(rotation) % 1)
			const getAmplitudes = tween(previousState.amplitudes, nextState.amplitudes)
			return <Transition
				duration={duration}
				onDone={onDone}
				ease={easeSinusoidalInOut}
				render={t => {
					let condition = undefined
					let gates = undefined
					if (t < 1) {
						// still haven't reached the next state - show operation condition and gates
						condition = op.getCondition()
						gates = op.getGates()
					}
					return <StateView
						amplitudes={getAmplitudes(t)}
						condition={condition}
						gates={gates}
						directionMode={directionMode}
					/>
				}}
			/>
		} else {
			// gradually rotate from the previous state to the next state using the operation
			const duration = 1000 + rotationTime * Math.abs(rotation)
			return <Transition
				duration={duration}
				onDone={onDone}
				ease={easeSinusoidalInOut}
				render={t => {
					// assume we have reached the next state
					let state = nextState
					let condition = undefined
					let gates = undefined
					if (t < 1) {
						// still haven't reached the next state - rotate a bit more
						state = new Simulator(state)
						state.do(op, (t - 1) * rotation)
						condition = op.getCondition()
						gates = op.getGates()
					}
					return <StateView
						amplitudes={state.amplitudes}
						condition={condition}
						gates={gates}
						directionMode={directionMode}
					/>
				}}
			/>
		}
	}
}
