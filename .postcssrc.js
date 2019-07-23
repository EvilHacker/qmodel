const path = require('path');
const crypto = require('crypto');

const relativeToHere = filename => path.relative(".", filename);

function hash(data) {
	const digits = "abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789";
	let n = crypto.createHash("md5")
		.update(data)
		.digest()
		.readUIntLE(0, 5);
	let h = digits[n % (digits.length - 11)];
	n = Math.floor(n / (digits.length - 11));
	do {
		h += digits[n % digits.length];
		n = Math.floor(n / digits.length);
	} while (n >= digits.length);
	return h;
}

module.exports = {
	modules: true,
	plugins: {
		"autoprefixer": {
		},
		"postcss-modules": {
			generateScopedName: process.env.NODE_ENV === "development"
				? (name, filename) => `${name}_${hash(relativeToHere(filename))}`
				: (name, filename) => hash(relativeToHere(filename) + name)
		}
	}
};
