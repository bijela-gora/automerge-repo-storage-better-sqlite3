// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	eslintPluginUnicorn.configs['flat/all'],
	prettierConfig,
	{
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.eslint.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		rules: {
			'@typescript-eslint/no-inferrable-types': 'off', // I don't like this
			'@typescript-eslint/require-await': 'off', // async makes a function not to throw, but to reject
			'@typescript-eslint/array-type': ['error', { default: 'array-simple', readonly: 'array-simple' }], // this looks reasonable for me
		},
	},
)
