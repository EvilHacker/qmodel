module.exports = {
	"env": {
		"browser": true,
		"node": true,
		"es6": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:react/recommended",
	],
	"parser": "babel-eslint",
	"parserOptions": {
		"ecmaVersion": 2019,
		"ecmaFeatures": {
			"jsx": true
		},
		"sourceType": "module"
	},
	"plugins": [
		"react",
		"jsdoc"
	],
	"settings": {
		"react": {
			"version": "detect"
		},
	},
	"rules": {
		// Javascript
		"linebreak-style": [ "error", "unix" ],
		"indent": [ "error", "tab", { "SwitchCase": 1 } ],
		"no-trailing-spaces": "warn",
		"camelcase": "warn",
		"curly": "warn",
		"semi": [ "warn", "never" ],
		"semi-spacing": "warn",
		"keyword-spacing": "warn",
		"dot-notation": "warn",
		"dot-location": [ "warn", "property" ],
		"no-unused-vars": "warn",
		"no-use-before-define": [ "error", { "variables": true, "functions": false, "classes": false } ],
		"consistent-return": "error",
		"prefer-const": "warn",
		"no-eval": "error",
		"no-implied-eval": "error",
		"no-extra-bind": "error",
		"no-console": "warn",

		// JSDoc
		"jsdoc/check-alignment": 1,
		"jsdoc/check-examples": 1,
		"jsdoc/check-indentation": 1,
		"jsdoc/check-param-names": 1,
		"jsdoc/check-syntax": 1,
		"jsdoc/check-tag-names": 1,
		"jsdoc/check-types": 1,
		"jsdoc/implements-on-classes": 1,
		"jsdoc/match-description": 1,
		"jsdoc/newline-after-description": 1,
		"jsdoc/no-undefined-types": 1,
		"jsdoc/require-hyphen-before-param-description": 1,
		"jsdoc/require-param": 1,
		"jsdoc/require-param-description": 1,
		"jsdoc/require-param-name": 1,
		"jsdoc/require-param-type": 1,
		"jsdoc/require-returns": 1,
		"jsdoc/require-returns-check": 1,
		"jsdoc/require-returns-type": 1,
		"jsdoc/valid-types": 1,
	}
};