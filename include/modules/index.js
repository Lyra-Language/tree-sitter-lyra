const { commaSep1 } = require("../helpers");

module.exports = {
  // Module declaration (must be first non-comment item in file).
  //
  // **Attributes lead it**, as they lead a `struct` and an `extern`, so `@link("SDL3")`
  // above the `module` line says the module links that library. A binding module links
  // one library and declares a dozen externs against it, so the fact belongs to the
  // module; per-`extern` `@link` stays legal and is what a lone extern in a
  // module-less program uses.
  module_declaration: ($) =>
    seq(
      optional(field("attributes", $.attribute_list)),
      "module",
      field("path", $.module_path),
    ),

  // Full module path like: myapp.utils.helpers
  module_path: ($) =>
    seq(
      alias($.identifier, $.module_name),
      repeat(seq(".", alias($.identifier, $.module_name))),
    ),

  // Import statement with optional selective imports or alias
  import_statement: ($) =>
    seq(
      "import",
      field("path", $.module_path),
      optional(
        choice(
          field("alias", $.import_alias),
          field("members", $.import_members),
        ),
      ),
    ),

  // Alias: import std.io as io
  import_alias: ($) => seq("as", field("name", $.identifier)),

  // Selective imports: import std.collections.{ Map, Set, HashMap }
  import_members: ($) => seq(".{", commaSep1($.import_member), "}"),

  // Each member can optionally be aliased: { HashMap as HM, Set }
  import_member: ($) =>
    seq(
      field("name", $.importable_name),
      optional(
        seq("as", field("alias", alias($.importable_name, $.alias_name))),
      ),
    ),

  // Types (PascalCase), values and functions (snake_case), and **constants**
  // (SCREAMING_CASE).
  //
  // The constant arm is not optional decoration: `const_identifier` is
  // `/[A-Z][A-Z0-9_]*/` and `user_defined_type_name` is `/[A-Z][a-zA-Z0-9]*/`, so without
  // it `INIT_VIDEO` lexed as the type name `INIT` followed by a stray `_VIDEO` — a syntax
  // error pointing at the underscore, for a name the module genuinely exports. A
  // `pub const` was therefore exportable and unimportable, which is a surface that looks
  // like it works. Found writing `bindings/sdl3`.
  //
  // The two patterns overlap on an all-caps name with no underscore (`MAX` matches both),
  // which is a *lexical* tie the scanner settles by token precedence, not something a
  // conflict entry could reach — the same situation `literals/struct.js` records for a
  // struct literal's type name.
  importable_name: ($) =>
    choice($.identifier, $.user_defined_type_name, $.const_identifier),

  // Visibility modifier for exports
  visibility: ($) => "pub",
};
