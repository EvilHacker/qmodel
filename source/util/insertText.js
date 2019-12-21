/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 */

function execCommand(command, argument) {
	try {
		return document.execCommand(command, false, argument)
	} catch (e) {
		// ignore exception
		return false
	}
}

export function insertText(textArea, text, select /* = false */) {
	textArea.focus()

	const {selectionStart, selectionEnd} = textArea

	if (execCommand("insertText", text)) {
		// handled by most modern web browsers
	} else {
		execCommand("ms-beginUndoUnit")

		let node = textArea.firstChild
		if (node) {
			// special case for IE 10, 11
			let startNode, startOffset, endNode, endOffset
			let offset = 0
			while (node) {
				if (offset <= selectionStart) {
					startNode = node
					startOffset = offset
				}
				const nodeLength = node.nodeValue.length
				if (selectionEnd <= offset + nodeLength) {
					endNode = node
					endOffset = offset
					break
				}
				node = node.nextSibling
				offset += nodeLength
			}

			const range = document.createRange()
			range.setStart(startNode, selectionStart - startOffset)
			range.setEnd(endNode, selectionEnd - endOffset)
			range.deleteContents()
			range.insertNode(document.createTextNode(text))
		} else {
			// last resort - works but clears undo stack
			const allText = textArea.value
			textArea.value = allText.slice(0, selectionStart) + text + allText.slice(selectionEnd)
		}

		execCommand("ms-endUndoUnit")
	}

	// update selection
	if (select) {
		textArea.setSelectionRange(selectionStart, selectionStart + text.length)
	} else {
		textArea.setSelectionRange(selectionStart + text.length, selectionStart + text.length)
	}

	// signal input event
	const event = document.createEvent("UIEvent")
	event.initEvent("input", true, false)
	textArea.dispatchEvent(event)
}
