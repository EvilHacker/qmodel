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
		duration: PropTypes.number.isRequired, // in milliseconds
		render: PropTypes.func.isRequired, // (t: number) => React.ReactElement
		ease: PropTypes.func, // (t: number) => number
		onDone: PropTypes.func, // () => undefined
	}

	static defaultProps = {
		ease: t => t,
	}

	state = {
		startTime: +new Date,
		tween: 0,
	}

	shouldComponentUpdate(nextProps, /*nextState*/) {
		if (this.props !== nextProps) {
			let tween = 0
			let callback = undefined
			if (nextProps.duration <= 0) {
				// transition is done
				tween = 1
				callback = nextProps.onDone
			}
			this.setState({
				startTime: +new Date,
				tween: tween,
			}, callback)
		}
		return true
	}

	componentDidMount() {
		this.nextFrame()
	}

	componentDidUpdate = this.componentDidMount

	render() {
		return this.props.render(this.props.ease(this.state.tween))
	}

	nextFrame() {
		if (this.state.tween < 1) {
			requestAnimationFrame(() => {
				let tween = (+new Date - this.state.startTime) / this.props.duration
				let callback = undefined
				if (tween >= 1) {
					// transition is done
					tween = 1
					callback = this.props.onDone
				}
				this.setState({
					tween: tween
				}, callback)
			})
		}
	}
}
