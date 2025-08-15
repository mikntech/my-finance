module.exports = {
	root: true,
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			parser: '@typescript-eslint/parser',
			plugins: ['@typescript-eslint'],
			extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
			env: { es2021: true, browser: true, node: true },
		},
	],
};
