// Bun augments `import.meta` with `dir` (script directory). The Next.js
// tsconfig has no bun types, so declare the one field the scripts use.
interface ImportMeta {
  readonly dir: string;
}
