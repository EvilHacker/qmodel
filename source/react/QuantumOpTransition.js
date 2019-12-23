/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Transition, easeSinusoidalInOut } from './Transition'
import { StateView } from './QuantumStateView'
import { Simulator, Operation, compiledOp } from '../quantum/Simulator'
import { tween } from '../quantum/state'

export class QuantumOpTransition extends PureComponent {
	static propTypes = {
		count: PropTypes.number,
		previousState: PropTypes.instanceOf(Simulator),
		nextState: PropTypes.instanceOf(Simulator).isRequired,
		ops: PropTypes.arrayOf(PropTypes.shape({
			op: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Operation)]),
			rotation: PropTypes.number,
		})),
		labels: PropTypes.arrayOf(PropTypes.string),
		loopStack: PropTypes.arrayOf(PropTypes.shape({
			loopLabel: PropTypes.string,
			count: PropTypes.number,
			times: PropTypes.number,
		})),
		directionMode: PropTypes.oneOf(["compass", "complex"]),
		transitionMode: PropTypes.oneOf(["simple", "accurate"]),
		fullRotationTime: PropTypes.number, // milliseconds to complete one full rotation
		onDone: PropTypes.func, // () => undefined
	}

	render() {
		const {props} = this
		const {
			count,
			previousState,
			nextState,
			directionMode,
			fullRotationTime,
			onDone
		} = props
		const ops = props.ops || []

		if (props.transitionMode == "accurate" && ops.length) {
			// gradually rotate from the previous state to the next state using the operation(s)
			const duration = 1000 + fullRotationTime *
				ops.reduce((rotation, op) => Math.max(rotation, Math.abs(op.rotation)), 0)
			return <Transition
				count={count}
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
						for (let i = ops.length - 1; i >= 0; --i) {
							const op = ops[i]
							state.do(op.op = compiledOp(op.op), (t - 1) * op.rotation)
						}
						if (ops.length == 1) {
							// show condition and gates of sole operation
							condition = ops[0].op.getCondition()
							gates = ops[0].op.getGates()
						}
					}
					return <StateView
						amplitudes={state.amplitudes}
						labels={props.labels}
						loopStack={props.loopStack}
						condition={condition}
						gates={gates}
						directionMode={directionMode}
					/>
				}}
			/>
		} else if (previousState) {
			// interpolate between the previous state and the next state
			const duration = 1000 + fullRotationTime *
				ops.reduce((rotation, op) => Math.max(rotation, Math.abs(op.rotation) % 1), 0)
			const getAmplitudes = tween(previousState.amplitudes, nextState.amplitudes)
			previousState.expandState(nextState.numberOfQubits)
			return <Transition
				count={count}
				duration={duration}
				onDone={onDone}
				ease={easeSinusoidalInOut}
				render={t => {
					let condition = undefined
					let gates = undefined
					if (t < 1 && ops.length == 1) {
						// still haven't reached the next state - show condition and gates of sole operation
						condition = ops[0].op.getCondition()
						gates = ops[0].op.getGates()
					}
					return <StateView
						amplitudes={getAmplitudes(t)}
						labels={props.labels}
						loopStack={props.loopStack}
						condition={condition}
						gates={gates}
						directionMode={directionMode}
					/>
				}}
			/>
		} else {
			// no operation to animate
			return <Transition
				count={count}
				duration={0}
				onDone={onDone}
				render={() => {
					return <StateView
						amplitudes={nextState.amplitudes}
						labels={props.labels}
						loopStack={props.loopStack}
						directionMode={directionMode}
					/>
				}}
			/>
		}
	}
}
