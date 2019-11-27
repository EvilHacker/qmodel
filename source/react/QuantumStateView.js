/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

import React, { PureComponent, createRef } from 'react'
import PropTypes from 'prop-types'
import styles from './QuantumStateView.css'

const minSpacing = 9
const maxSpacing = 50
const desiredWidth = 1337 + 178
const height = 514
const axleY = 218

export class StateView extends PureComponent {
	static propTypes = {
		amplitudes: PropTypes.arrayOf(PropTypes.number).isRequired,
		condition: PropTypes.shape({
			mask: PropTypes.number,
			value: PropTypes.number,
		}),
		gates: PropTypes.arrayOf(PropTypes.string),
		directionMode: PropTypes.oneOf(["compass", "complex"]),
	}

	state = {
		rotationDegrees: -90 // north pointing up
	}

	quantumState = createRef()

	componentDidUpdate(prevProps) {
		// check if the quantum state has decreased in size
		if (prevProps.amplitudes.length > this.props.amplitudes.length) {
			const element = this.quantumState.current
			if (element) {
				// horizontally scroll the disks into view
				element.scrollLeft = element.children[0].scrollWidth - element.clientWidth
			}
		}
	}

	render() {
		const {props} = this
		const numberOfdisks = props.amplitudes.length >> 1
		const n = Math.round(Math.log2(numberOfdisks))
		const spacing = Math.max(minSpacing,
			Math.min(maxSpacing, (desiredWidth - 178) / (numberOfdisks + 1)))
		const width = (numberOfdisks + 1) * spacing + 178
		const textTop = height - 52 - 14 * n

		return <div ref={this.quantumState} className={styles.quantumState}>
			<svg className={styles.disks} width={width} height={height}>
				<SvgDefs
					spacing={spacing}
					textTop={textTop}
					directionMode={props.directionMode}
				/>
				{this.disks(spacing)}
			</svg>

			<input
				type="range"
				min={-24} max={8} defaultValue={-8}
				className={styles.direction}
				style={{
					left: width - 241,
					top: axleY - 5,
					width: 270
				}}
				onChange={event => {
					this.setState({
						rotationDegrees: 11.25 * event.target.value // -270 to +90
					})
				}}
			/>

			<div
				style={{
					left: 8 + 0.5 * spacing,
					top: textTop
				}}
			>
				{this.qubitLabels(n)}
			</div>

			<div
				width={width}
				style={{
					left: 54 + 0.5 * spacing,
					top: textTop
				}}
			>
				{this.bitPatterns(n, spacing)}
			</div>

			<svg
				width={numberOfdisks * spacing}
				height={height - textTop + 5}
				className={styles.arcs}
				style={{
					left: 54 + spacing,
					top: textTop - 6
				}}
				fill="none"
			>
				{this.arcs(spacing, textTop)}
			</svg>
		</div>
	}

	disks(spacing) {
		const amplitudes = this.props.amplitudes
		const rotationDegrees = this.state.rotationDegrees
		const cos = (spacing + 10) / 110
		const sin = Math.sin(Math.acos(cos))
		const circleScaleX = 0.9 * cos
		const circleSkewY = -42 * sin
		const axleSkewX = -25 * cos

		// add all disks
		const result = []
		for (var i = 0; i < amplitudes.length; i += 2) {
			result.push(
				<DiskView
					key={i}
					i={i >> 1}
					a={amplitudes[i]}
					b={amplitudes[i + 1]}
					spacing={spacing}
					rotationDegrees={rotationDegrees}
					circleScaleX={circleScaleX}
					circleSkewY={circleSkewY}
					axleSkewX={axleSkewX}
				/>
			)
		}

		// add compass at end
		const compassX = (amplitudes.length / 2 + 1) * spacing + 74
		result.push(
			<g key="d">
				<line
					x1={compassX - 20} y1={axleY} x2={compassX} y2={axleY}
					stroke="#888"
					strokeWidth={6}
					strokeLinecap="round"
				/>
				<use
					xlinkHref={`#${styles.compass}`}
					transform={`translate(${compassX} ${axleY})skewY(${circleSkewY})scale(${2 * circleScaleX} 2)rotate(${rotationDegrees})`}
				/>
			</g>
		)

		return result
	}

	qubitLabels(n) {
		const {props} = this
		const {mask, value} = props.condition || {
			mask: 0
		}
		const gates = props.gates || []
		const bits = []
		for (var b = 0; b < n; ++b) {
			bits.push(
				<div key={b} className={styles.qubitLabel}>
					q<sub>{b}</sub>{
						((mask >> b) & 1)
							? `=${(value >> b) & 1}`
							: (gates[b] && `←${gates[b] == 'N' ? '⨁': gates[b]}`)
					}
				</div>
			)
		}
		return bits
	}

	bitPatterns(n, spacing) {
		const {mask, value} = this.props.condition || {
			mask: -1,
			value: -1,
		}
		const result = []
		for (var i = (1 << n) - 1; i >= 0; --i) {
			result.push(
				<BitVectorView
					key={i}
					i={i}
					n={n}
					mask={mask}
					value={value}
					spacing={spacing}
				/>
			)
		}
		return result
	}

	arcs(spacing) {
		const {props} = this
		const {gates} = props
		if (!gates) {
			return undefined
		}
		const {mask, value} = props.condition || {
			mask: 0,
			value: 0,
		}

		const result = []
		const n = props.amplitudes.length / 2
		for (var b = 0; b < gates.length; ++b) {
			const gate = gates[b]
			if (gate) {
				const gateMask = 1 << b
				const lowerBitsMask = gateMask - 1
				const lowerConditionMask = value & lowerBitsMask
				const y0 = b * 14 + 7
				const y1 = b * 13
				for (var i = n - gateMask - 1; i >= lowerConditionMask; --i) {
					if (((i & mask) == value) && ((i & gateMask) == 0)) {
						const x0 = spacing * i + 1
						const x1 = spacing * (i + gateMask) - 1
						const path = `M${x0},${y0}C${x0},${y1} ${x1},${y1} ${x1},${y0}`
						let stroke = "#840"
						let strokeWidth = 1
						if ((i & lowerBitsMask) == lowerConditionMask) {
							stroke = "#a00"
							strokeWidth = 2
						}
						result.push(<g key={`${b}.${i}`}>
							<path
								d={path}
								stroke="#fff"
								strokeOpacity={0.3}
								strokeWidth={2.5}
							/>
							<path
								d={path}
								stroke={stroke}
								strokeWidth={strokeWidth}
								strokeLinecap="round"
							/>
						</g>)
					}
				}
			}
		}

		return result
	}
}

class SvgDefs extends PureComponent {
	static propTypes = {
		spacing: PropTypes.number.isRequired,
		textTop: PropTypes.number.isRequired,
		directionMode: PropTypes.oneOf(["compass", "complex"]),
	}

	render() {
		const {props} = this
		const directions = props.directionMode == "complex"
			? [ "+1", "-1", "-𝑖", "+𝑖" ]
			: [ "N", "S", "E", "W" ]

		return <defs>
			<g id={styles.disk}>
				<path
					// 3 minor spokes
					d="M0,0L-99,-5-99,5zM-5,99 5,99-5,-99 5,-99z"
					fill="#333"
				/>
				<circle
					r={100}
					stroke="#000"
					strokeWidth={6}
					fill="#abd"
					fillOpacity={0.7}
				/>
				<path
					// main directional wedge
					d="M0,0L99,-21 99,21z"
					fill="#f44"
				/>
				<path
					// main directional spoke
					d="M0,0L99,-5 99,5z"
					fill="#c00"
				/>
				<path
					// arc of the main directional wedge
					d="M97.81,20.79A100,100 0 0,0 97.81,-20.79"
					stroke="#c00"
					strokeWidth={6.2}
				/>
			</g>

			<g id={styles.axle}>
				<line
					// axle in-between two disks
					x1={2} x2={props.spacing - 2}
					stroke="#444"
					strokeOpacity={0.3}
					strokeWidth={4}
					strokeLinecap="round"
				/>
			</g>

			<g id={styles.verticalGuide}>
				<line
					// faint dotted vertical line from disk to binary bit pattern
					y1={4} y2={props.textTop - axleY}
					stroke="#444"
					strokeOpacity={0.3}
					strokeLinecap="round"
					strokeDasharray="4,8"
				/>
			</g>

			<g id={styles.compass} textAnchor="middle" fill="#211">
				<g stroke="#622" fill="none" /* group constant elements */ >
					<circle r={58} />
					<circle r={65} strokeWidth={2} />
					<path
						d="M40.3,40.3L47,47M-40.3,40.3L-47,47M40.3,-40.3L47,-47M-40.3,-40.3L-47,-47"
						strokeWidth={2}
						strokeLinecap="round"
					/>
					<path
						d="M0,0L7,7L0,83L-7,7L-83,0L-7,-7L0,-83L7,-7z"
						fill="#dc8"
						stroke="#762"
					/>
					<path
						d="M0,0L7,-7L83,0L7,7z"
						fill="#d44"
						stroke="#900"
					/>
					<circle r={3} fill="#533" />
				</g>
				<text
					fill="#d44"
					transform="translate(82)rotate(90)"
				>
					{directions[0]}
				</text>
				<text
					transform="translate(-82)rotate(-90)"
				>
					{directions[1]}
				</text>
				<text
					transform="translate(0,82)rotate(180)"
				>
					{directions[2]}
				</text>
				<text
					transform="translate(0,-82)"
				>
					{directions[3]}
				</text>
			</g>
		</defs>
	}
}

class DiskView extends PureComponent {
	static propTypes = {
		i: PropTypes.number.isRequired,
		a: PropTypes.number.isRequired,
		b: PropTypes.number.isRequired,
		spacing: PropTypes.number.isRequired,
		rotationDegrees: PropTypes.number.isRequired,
		circleScaleX: PropTypes.number.isRequired,
		circleSkewY: PropTypes.number.isRequired,
		axleSkewX: PropTypes.number.isRequired,
	}

	render() {
		const {props} = this
		const {a, b} = props
		const radius = 2 * Math.sqrt(a*a + b*b)
		const x = (props.i + 1) * props.spacing + 54
		return <g>
			{radius > 0.005 && <use
				xlinkHref={`#${styles.disk}`}
				transform={`translate(${x} ${axleY}) skewY(${props.circleSkewY}) scale(${radius * props.circleScaleX} ${radius}) rotate(${-180 / Math.PI * Math.atan2(b, a) + props.rotationDegrees})`}
			/>}
			<use
				xlinkHref={`#${styles.axle}`}
				transform={`translate(${x} ${axleY}) skewX(${props.axleSkewX})`}
			/>
			<use
				xlinkHref={`#${styles.verticalGuide}`}
				transform={`translate(${x} ${axleY})`}
			/>
		</g>
	}
}

class BitVectorView extends PureComponent {
	static propTypes = {
		i: PropTypes.number.isRequired,
		n: PropTypes.number.isRequired,
		mask: PropTypes.number.isRequired,
		value: PropTypes.number.isRequired,
		spacing: PropTypes.number.isRequired,
	}

	render() {
		const {i, n, mask, value, spacing} = this.props

		let matchMask = 0
		let className = styles.binary
		if ((i & mask) == value) {
			matchMask = mask
			className = `${className} ${styles.select}`
		}

		const bits = []
		for (var b = 0; b < n; ++b) {
			const bit = (i >> b) & 1
			bits.push(
				<div
					key={b}
					className={((matchMask >> b) & 1)
						? styles.match
						: (bit ? styles.one : styles.zero)
					}
				>
					{bit}
				</div>
			)
		}

		const width = Math.max(minSpacing, spacing - 4)
		const margin = (spacing - width) >> 1
		const fontSize = Math.max(14, 20 - n)
		return (
			<div
				style={{
					left: i * spacing,
					width: width,
					marginLeft: margin,
					marginRight: margin,
				}}
				className={className}
			>
				{bits}
				{n > 1 && <div
					className={styles.decimal}
					style={{
						height: Math.ceil(0.301 * n) * fontSize * 0.6,
						fontSize: fontSize
					}}
				>
					{(spacing >= 13 || ((i & 1) == 0)) && i}
				</div>}
			</div>
		)
	}
}
