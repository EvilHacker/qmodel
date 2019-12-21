/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import { Component } from 'react'
import PropTypes from 'prop-types'

export function easeSinusoidalInOut(t) {
	return 0.5 * (1 - Math.cos(Math.PI * t))
}

export function easeQuadraticInOut(t) {
	return t <= 0.5
		? 2 * t * t
		: 2 * t * (2 - t) - 1
}

export class Transition extends Component {
	static propTypes = {
		count: PropTypes.number,
		duration: PropTypes.number.isRequired, // in milliseconds
		render: PropTypes.func.isRequired, // (t: number) => React.ReactElement
		ease: PropTypes.func, // (t: number) => number
		onDone: PropTypes.func, // () => undefined
	}

	static defaultProps = {
		ease: t => t, // linear by default
	}

	state = {
		startTime: +new Date,
		tween: 0,
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (nextProps.count == null || this.props.count != nextProps.count) {
			// note: mutate nextState to be compatible with preact
			nextState.startTime = +new Date
			if (nextProps.duration <= 0) {
				// transition is done
				nextState.tween = 1
				this.setState({}, nextProps.onDone)
			} else {
				nextState.tween = 0
			}
		}
		return true
	}

	componentDidMount() {
		window.cancelAnimationFrame(this.animationFrameId)
		if (this.state.tween < 1) {
			this.animationFrameId = requestAnimationFrame(() => {
				this.animationFrameId = undefined
				const {props} = this
				let tween = (+new Date - this.state.startTime) / props.duration
				let callback = undefined
				if (tween >= 1) {
					// transition is done
					tween = 1
					callback = props.onDone
				}
				this.setState({
					tween: tween
				}, callback)
			})
		}
	}

	componentDidUpdate = this.componentDidMount

	render() {
		const {props} = this
		return props.render(props.ease(this.state.tween))
	}
}
