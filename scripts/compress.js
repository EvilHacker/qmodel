#!/usr/bin/env node

/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Given an input file as the sole command-line argument,
 * compress and output both .gz and .br files to the same directory.
 */

/* eslint-disable no-console */

const promisify = require('util').promisify
const fs = require('fs')
const fsp = {
	readFile: promisify(fs.readFile),
	writeFile: promisify(fs.writeFile),
}
const zopfli = require('@gfx/zopfli')
const brotli = require('brotli')

if (process.argv.length != 3) {
	throw new Error("Filename expected as sole argument")
}

const filename = process.argv[2]

const zopfliOptions = {
	numiterations: 99 // cspell:disable-line
}

const compress = async filename => {
	const filenameGz = filename + ".gz"
	const filenameBr = filename + ".br"
	let size
	let sizeGz
	let sizeBr

	await fsp.readFile(filename)
		.then(input => {
			size = input.length
			console.log(`╰┬─ ${filename.padEnd(40)}${size.toString().padStart(9)} B`)

			return Promise.all([
				(async () => zopfli.gzipAsync(input, zopfliOptions)
					.then(outputGz => {
						sizeGz = outputGz.length
						fsp.writeFile(filenameGz, outputGz)
					})
				)(),
				(async () => {
					const outputBr = brotli.compress(input)
					sizeBr = outputBr.length
					return fsp.writeFile(filenameBr, outputBr)
				})(),
			])
		})

	const sGz = sizeGz.toString().padStart(9)
	const pGz = (100 * sizeGz / size).toFixed(2).padStart(4)
	console.log(` ├  ${filenameGz.padEnd(40)}${sGz} B (${pGz}%) with zopfli`)

	const sBr = sizeBr.toString().padStart(9)
	const pBr = (100 * sizeBr / size).toFixed(2).padStart(4)
	console.log(` ├  ${filenameBr.padEnd(40)}${sBr} B (${pBr}%) with brotli`)
}

compress(filename)
