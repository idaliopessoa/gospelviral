import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.scannerwork/**',
      'reference/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['packages/shared/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'packages/shared must not import React.' },
            { name: 'react-dom', message: 'packages/shared must not import react-dom.' },
          ],
          patterns: [
            { group: ['@anthropic-ai/*'], message: 'Anthropic SDK only allowed in apps/server/src/runtime.' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['apps/server/src/runtime/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@anthropic-ai/*'], message: 'Anthropic SDK only allowed in apps/server/src/runtime.' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
