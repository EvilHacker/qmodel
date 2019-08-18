/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * This runtime is suitable for production builds only.
 * The helpers have been simplified and are as "loose" as possible.
 * All diagnostic runtime error checks and throws of exceptions have been removed.
 * It is assumed that the application has already been debugged with a
 * development build that contains a complete and "strict" runtime with diagnostics.
 *
 * Expect any unreference global runtime helper functions to be optimized-out.
 *
 * Selected Babel runtime helper functions adapted from
 * * node_modules/@babel/runtime/helpers/
 */

/* eslint-disable no-unused-vars */

var babelHelpers$inheritsLoose = function(subClass, superClass) {
	subClass.prototype = Object.create(superClass.prototype)
	subClass.prototype.constructor = subClass
	subClass.__proto__ = superClass
}
