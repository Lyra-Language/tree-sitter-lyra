module.exports = {
  // A **transparent** alias: `type Op = ((i64, i64)) -> i64`. The name stands for
  // the type and is interchangeable with it — no conversion at the boundary, no
  // distinct identity.
  //
  // That is the whole difference from `newtype` (constrained_type.js), which is
  // *nominal*: `newtype Volume = u8` is a new type you opt into at a conversion
  // site, which is what lets it carry `where` constraints and its own arithmetic
  // policy. An alias carries nothing; it is a shorter way to write a type you can
  // already write. The two are not redundant — one adds meaning at a boundary, the
  // other removes repetition — which is why both exist rather than one taking a
  // "transparent" flag.
  //
  // The motivating case is a function type. `(g: ((i64, i64)) -> i64, p: (i64,
  // i64)) -> i64` is where Lyra reads worst, and the double parens (a single tuple
  // parameter, since single parens would be a two-argument function) cannot be
  // spelled away. Naming it is the fix every language reaches for, and Lyra had no
  // way to: `newtype` makes the value un-callable without unwrapping, which is
  // correct for a nominal type and useless here.
  type_alias: ($) =>
    seq(
      optional(field("visibility", $.visibility)),
      "type",
      field("name", alias($.user_defined_type_name, $.type_alias_name)),
      "=",
      field("type", $.type),
    ),
};
