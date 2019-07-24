/**
 * Copyright (c) Mark Suska.
 *
 * @license MIT
 *
 * Install only those polyfills needed to make this codebase work
 * with IE and other older browsers.
 */

import 'mdn-polyfills/Object.assign'
import 'mdn-polyfills/Object.entries'
import 'mdn-polyfills/Array.prototype.fill'
import 'mdn-polyfills/String.prototype.endsWith'
import 'mdn-polyfills/String.prototype.includes'
import 'mdn-polyfills/Number.isInteger'
import 'mdn-polyfills/Node.prototype.remove'
Math.log2 || (Math.log2 = x => Math.log(x) * Math.LOG2E)
Math.log10 || (Math.log10 = x => Math.log(x) * Math.LOG10E)
