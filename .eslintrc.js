module.exports = {
	"env": {
		"browser": true,
		"node": true,
		"es6": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:jsdoc/recommended",
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
		"indent": [ "error", "tab", {
			"SwitchCase": 1,
			"ignoredNodes": [ "TemplateLiteral" ]
		} ],
		"no-trailing-spaces": "warn",
		"camelcase": "warn",
		"curly": "warn",
		"semi": [ "warn", "never" ],
		"semi-spacing": "warn",
		"keyword-spacing": "warn",
		"dot-notation": "warn",
		"dot-location": [ "warn", "property" ],
		"no-unused-vars": "warn",
		"no-use-before-define": [ "error", {
			"variables": true,
			"functions": false,
			"classes": false
		} ],
		"consistent-return": "error",
		"prefer-const": "warn",
		"no-eval": "error",
		"no-implied-eval": "error",
		"no-extra-bind": "error",
		"no-console": "warn",

		// JSDoc
		"jsdoc/require-jsdoc": 0,
		"jsdoc/require-hyphen-before-param-description": 1,
		"jsdoc/match-description": 1,
	}
};