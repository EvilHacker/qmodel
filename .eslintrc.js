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
		"react"
	],
	"settings": {
		"react": {
			"version": "detect"
		},
	},
	"rules": {
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
	}
};