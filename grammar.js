/**
 * @file A tree-sitter parser for the Lyra Programming Language
 * @author Avram Eisner <avrame@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const modules = require("./include/modules/");
const literals = require("./include/literals/");
const numbers = require("./include/literals/numbers");
const expressions = require("./include/expressions/");
const types = require("./include/types/");
const statements = require("./include/statements");
const functions = require("./include/expressions/functions");
const comments = require("./include/comments");
const destructuring = require("./include/destructuring/destructuring");
const patterns = require("./include/patterns");
const attributes = require("./include/attributes");
const { statementList } = require("./include/helpers");

module.exports = grammar({
  name: "lyra",

  supertypes: ($) => [$.expression, $.statement, $.pattern, $.type],

  extras: ($) => [/\s/, $.doc_comment, $.comment],

  externals: ($) => [
    $._BLOCK_COMMENT,
    $._string_start,
    $._string_content,
    $._interpolation_start,
    $._interpolation_end,
    $._string_end,
    $._raw_string_literal,
    // The statement terminator. Zero-width, emitted by the scanner for a line
    // break that ends a statement — see scan_newline in src/scanner.c for why
    // the parser, not a token table, decides where that is.
    $._newline,
  ],

  inline: ($) => [$._comma],

  conflicts: ($) => [
    // Juxtaposition application (`Some 42`) against the bare-name readings of the
    // same leading token: a PascalCase name is also a `_primary_expr` (a static
    // receiver, `Arena.new()`) and, in pattern position, a `data_pattern`. GLR
    // keeps them alive until the following token decides.
    [$.data_constructor_expr, $._primary_expr],
    // A constructor operand overlaps the atomic part of `expression`, so it
    // inherits the same number-literal-vs-pattern ambiguity `[$.expression,
    // $._signed_number_literal]` resolves below (`(Some 1, …)` — is the `1` an
    // operand or a pattern literal?).
    [$._constructor_value, $._signed_number_literal],
    // `(Some x, …)` — a juxtaposed constructor operand and a `data_pattern`'s
    // sub-pattern are the same tokens in the same place (lambda parameter list
    // vs anonymous tuple). GLR keeps both until the `=>` decides, exactly as it
    // already does for a bare parenthesized name.
    [$._constructor_value, $.pattern],
    // The nullary-operand form of the same race: `(Some None, …)`.
    [$._constructor_value, $.data_pattern],
    // Nested juxtaposition: in `Some None`, is `None` the finished operand or the
    // head of a further application? One operand, never curried, so it is the
    // finished operand — but the decision needs the next token, which is what
    // this keeps alive (`Some None - 1` reduces, then subtracts).
    [$._constructor_value, $.data_constructor_expr],
    // NOT redundant, despite tree-sitter reporting it so once
    // data_constructor_expr existed: removing it makes a data pattern in a
    // *parameter* position (`(Some(x): Maybe<i64>) -> i64`) resolve toward the
    // named-tuple *expression* reading and fail to parse. This is the region
    // grammar.js's own conflict notes call finely balanced — the "unnecessary
    // conflict" warning is unreliable here, so verify against the corpus rather
    // than the warning.
    [$._tuple_name, $._primary_expr, $.data_pattern],
    [$.named_struct_literal, $._tuple_name, $._primary_expr],
    // `if Name • {` — is `Name` the condition and `{` the block's brace, or is this a
    // struct literal? Only the brace's *contents* say, so GLR must keep both alive.
    // named_struct_literal is on prec.dynamic rather than prec.left precisely so this
    // stays a conflict instead of being resolved statically toward the struct, which
    // is what made `if Point { 1 } else { 0 }` a syntax error.
    [$.named_struct_literal, $._primary_expr],
    [$.named_struct_literal, $._constructor_value],
    [$.parameter_type, $.tuple_type_element],
    // A parenthesized name can begin a lambda parameter list (`(a, b) => …`) or
    // an anonymous tuple / parenthesized expression (`(a, b)`, `(a)`). A bare
    // identifier is both a `pattern` (the lambda param) and an `expression` (the
    // tuple element), so GLR must keep both parses alive until `=>` (or its
    // absence) decides — otherwise the parser statically commits to the lambda
    // reading and `(a, b)`/`(a)` fail. The `[expression, literal_pattern]` entry
    // below already covers a *literal*-leading tuple (`(20, 22)`); this covers a
    // name-leading one (a bare `identifier` reduces to `pattern` for the lambda
    // param, or to `_primary_expr` for the tuple element).
    [$.pattern, $._primary_expr],
    [$.pattern, $.for_loop, $.for_in_loop],
    [$._primary_expr, $.for_loop, $.for_in_loop],
    [$._primary_expr, $.data_pattern],
    // The literal analogue of the two entries above, and new on 08/06 with
    // literals becoming postfix heads (`"abc".len()`). `('a', 'b')` is a lambda
    // parameter list of `literal_pattern`s or an anonymous tuple of
    // `_primary_expr`s, decided by the `=>` that may or may not follow — the same
    // race a bare name has run since 07/16, reaching literals only now that they
    // reduce through `_primary_expr` instead of through the precedence-wrapped
    // `_literal`. That wrapper is what used to settle it statically.
    [$._primary_expr, $.literal_pattern],
    // The same race for a *number* literal, which reaches a pattern through
    // `_signed_number_literal` (it may carry a leading `-`) rather than through
    // `literal_pattern`. `(1, 2)` is a tuple of expressions or a parameter list of
    // patterns; the `[expression, _signed_number_literal]` entry below covered it
    // while numbers reached `expression` directly, and 08/06 moved them to
    // `_primary_expr` so `1.wrapping_add(2)` parses.
    [$._primary_expr, $._signed_number_literal],
    // And its negated form: in `(-1, 2)` the `-1` is a negation expression whose
    // operand is now a `_primary_expr`, or a pattern's `_negated_number_literal`.
    [$._primary_expr, $._negated_number_literal],
    // A postfix form (identifier, call, member access, …) can appear on
    // its own as an `expression` or as the left operand of a math /
    // comparison / compound-assignment operator. Tree-sitter needs the
    // one-symbol look-ahead to decide between the two.
    [$.expression, $._math_operand],
    // A bare number literal reaches `expression` directly (not via the
    // precedence-wrapped `_literal` — see note in literals/index.js). Routing
    // numbers around the wrapper is what fixes `0 - 200` parsing as `0` plus a
    // dangling `negation(-200)`: it lets the `expression/_math_operand`
    // conflict above resolve the literal-left case toward subtraction, exactly
    // as it already does for identifier/postfix operands. The direct route
    // also means a bare number could be a complete `expression` or a pattern
    // (e.g. inside `(`/match contexts), so that conflict must be declared too.
    //
    // It is declared against `_signed_number_literal` rather than against
    // `literal_pattern`, which is where it sat until 07/31/26: a pattern's
    // number now goes through that rule so it can carry a leading `-`
    // (patterns/index.js), which puts the ambiguity one level down. In `(1, 2)`
    // the `1` is still both a tuple-element expression and a pattern element,
    // and GLR still has to keep both alive until the context decides — only the
    // symbol the conflict is reported against changed. Declaring the old pair
    // as well now draws an "unnecessary conflicts" warning.
    [$.expression, $._signed_number_literal],
    // And the negated form: after `-`, the number is either this rule's operand
    // or a `negation`'s (`(-1, 2)` the tuple vs `(-1, 2)` the pattern). Mirrors
    // the `[expression, _math_operand]` entry above, which exists for exactly
    // this reason on the unsigned side.
    [$._math_operand, $._negated_number_literal],
    // An empty `[]` (and, in a `(`-led context, a non-empty `[…]`) is ambiguous
    // between an empty array *literal* (expression) and an empty array *pattern*
    // (a match arm / lambda param). GLR keeps both alive until the surrounding
    // context — an expression position vs a pattern position — decides.
    [$.array_literal, $.array_pattern],
    // A literal or postfix form can appear on its own as an `expression`
    // or as an operand of a boolean && / || operator. Mirrors the
    // expression/_math_operand conflict above.
    [$.expression, $._bool_operand],
    // A postfix form can be a _bool_operand (right side of &&/||) or a
    // _math_operand (left side of a binary math expression). Tree-sitter
    // needs a lookahead to decide between the two.
    [$._bool_operand, $._math_operand],
    // A literal or postfix form can appear on its own as an `expression`
    // or as an operand of a comparison (==, !=, <, >, <=, >=) operator.
    // Mirrors the expression/_math_operand and expression/_bool_operand
    // conflicts above.
    [$.expression, $._comparison_operand],
    // A comparison operand can also be a math operand or bool operand in
    // ambiguous positions (e.g. `&x == y` where `x` could be either).
    [$._comparison_operand, $._math_operand],
    // `{ a | …` — bitwise-or made `|` ambiguous with the struct-update separator
    // (`Point { base | x: 1 }`). After `{ identifier`, a following `|` either
    // separates the update base from its fields, or is the operator of a
    // bitwise-or expression that happens to be the block's first statement.
    // Only the *next* token tells them apart (`x: 1` vs a bare operand), so GLR
    // has to keep both alive. Resolving it by precedence instead would pick one
    // reading statically and break the other.
    [$.struct_update, $._primary_expr],
    // The same `|` race one rule over: inside an array comprehension, `|`
    // both separates the generators from the guards and closes the clause
    // (`[x*2 for x in xs | x > 0 |]`), so after a generator — or after a guard —
    // a following `|` is either that delimiter or a bitwise-or operator applied
    // to the preceding operand. Same resolution, same reason.
    [$.generator, $._primary_expr],
    [$.comprehension_guard, $._primary_expr],
    [$.comprehension_guard, $._postfix_expr],
    // A struct literal is a postfix head (`Node { n: 7 }.n`, postfix.js), which makes
    // it both a comprehension's *result* and a primary expression inside one:
    // `[ Node { n: x } for x in xs ]`. A genuine ambiguity between two complete
    // parses, and the one conflict that change needed — generation fails outright
    // without it, so it is not the "unnecessary conflict" kind this file warns about.
    [$._bool_operand, $._comparison_operand],
    // A bare identifier can be either a primary expression or the label
    // prefix of a labeled for/for-in loop expression.
    // for_loop/for_in_loop with and without a label over the same token sequence.
    [$.for_loop],
    [$.for_in_loop],
  ],

  reserved: {
    identifier: () => [
      "for",
      "if",
      "else",
      "match",
      "let",
      "var",
      "const",
      "readonly",
      "true",
      "false",
      "import",
      "module",
      "as",
      "pub",
      "async",
      "await",
      "Self",
      "stack",
      "shared",
      "weak",
      "with",
      "pure",
      "det",
      "noalloc",
      "gen",
      "rec",
      "yield",

      "fixed",
      "unsafe",
      "mut",
      "ref",
      "own",
      "void",
    ],
  },

  rules: {
    // Updated program rule
    program: ($) =>
      seq(
        optional($.module_declaration),
        repeat($.import_statement),
        optional(statementList($)),
      ),

    _comma: ($) => ",",

    ...literals,
    ...numbers,
    ...modules,
    ...expressions,
    ...types,
    ...statements,
    ...functions,
    ...comments,
    ...destructuring,
    ...patterns,
    ...attributes,
  },
});
