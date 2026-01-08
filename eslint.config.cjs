// ESLint v9+ usa Flat Config por defecto.
// Este config es intencionalmente "suave" para no introducir ruido en un codebase existente.
// Si en el futuro querés reglas más estrictas, podemos endurecerlo gradualmente.

const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')

module.exports = [
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'logs/**', 'exports/**'],
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			// Evitar falsos positivos típicos en TS/Node sin type-checking
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'no-console': 'off',

			// Mantener el lint pragmático en este proyecto
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-var-requires': 'off',
		},
	},
]

