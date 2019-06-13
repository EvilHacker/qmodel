const crypto = require('crypto');

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
	} while ((n = Math.floor(n / digits.length)) >= digits.length);
	return h;
}

module.exports = {
	modules: true,
	plugins: {
		"autoprefixer": {
		},
		"postcss-modules": {
			generateScopedName: (name, filename) =>
				process.env.NODE_ENV === "development"
					? `${name}_${hash(filename)}`
					: hash(filename + name)
		}
	}
};
