const { commaSep1 } = require("./helpers");

module.exports = {
  attribute_list: ($) => repeat1($.attribute),

  attribute: ($) =>
    seq(
      "@",
      field("name", $.identifier),
      optional(seq("(", field("args", $.attribute_args), ")")),
    ),

  // A string joins the number and type-name arguments so `@link("m")` can name a library.
  // It is the first attribute argument that is *data* rather than a name or a size, and it
  // stays a plain `string_literal` — an attribute argument is read by the collector, not
  // evaluated, so interpolation in one would be a value nothing could produce.
  //
  // An `identifier` is the fourth, and it is the one argument that names something in
  // *Lyra's* own namespace rather than a foreign one: `@must_release(unload_sound)` refers
  // to a function the collector resolves, where `@link("SDL3")` and `@symbol("SDL_Free")`
  // are text handed to the linker verbatim. Spelling a Lyra name as a string would say it
  // does not resolve, which is the opposite of what that attribute means. It costs no
  // conflict: `identifier` is lowercase/underscore-leading and `user_defined_type_name`
  // capital-leading, so the two are lexically disjoint and no state has to choose.
  //
  // A **named** argument (`pkg: "sdl3"`) is the fifth shape, and has its own field so a
  // reader of positional `value`s never mistakes one for another: `@link("SDL3", pkg:
  // "sdl3")` names the library *and* the pkg-config package that says where it lives.
  // `identifier ":"` is the whole difference from a positional identifier, and one token
  // of lookahead decides it.
  attribute_args: ($) =>
    commaSep1(
      choice(
        field("value", $._attribute_value),
        field("named", $.attribute_named_arg),
      ),
    ),

  attribute_named_arg: ($) =>
    seq(field("name", $.identifier), ":", field("value", $._attribute_value)),

  _attribute_value: ($) =>
    choice($._number_literal, $.user_defined_type_name, $.string_literal, $.identifier),
};
