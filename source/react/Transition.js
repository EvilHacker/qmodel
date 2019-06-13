/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import { Component } from 'react'
import PropTypes from 'prop-types'

export class Transition extends Component {
	static propTypes = {
		duration: PropTypes.number.isRequired, // in milliseconds
		render: PropTypes.func.isRequired,
		onDone: PropTypes.func,
	}

	state = {
		startTime: +new Date,
		tween: 0,
	}

	shouldComponentUpdate(nextProps, /*nextState*/) {
		if (this.props.render !== nextProps.render) {
			let tween = 0
			let callback = undefined
			if (nextProps.duration <= 0) {
				// transition is done
				tween = 1
				callback = this.props.onDone
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
		return this.props.render(this.state.tween)
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
