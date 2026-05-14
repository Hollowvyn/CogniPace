/**
 * Allows DB migration files to be imported as text. This declaration is
 * intentionally colocated with the DB platform adapter because the runtime
 * behavior depends on the bundler's `.sql -> text` loader.
 */
declare module "*.sql" {
  const content: string;
  export default content;
}
