const { commaSep1 } = require("../helpers");

module.exports = {
  // Module declaration (must be first non-comment item in file)
  module_declaration: ($) => seq("module", field("path", $.module_path)),

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

  // Can import types (PascalCase) or values/functions (camelCase/snake_case)
  importable_name: ($) => choice($.identifier, $.user_defined_type_name),

  // Visibility modifier for exports
  visibility: ($) => "pub",
};
