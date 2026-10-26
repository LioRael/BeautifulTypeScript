import tseslint from 'typescript-eslint';

// Supply the consuming project's root; this module can stay under configs/.
export function typedConfig(root) {
  return tseslint.config({
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: root } },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-misused-promises': 'error',
    },
  });
}
