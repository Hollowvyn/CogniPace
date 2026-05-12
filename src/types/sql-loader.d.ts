/**
 * Allows `import sql from "./foo.sql"` to type-check, given esbuild is
 * configured with `loader: { ".sql": "text" }`. The bundled value is
 * the file contents as a string.
 */
declare module "*.sql" {
  const content: string;
  export default content;
}
