/**
 * @file `.lui` markup for `bindings.imgui.ui` — the files `lyra/tools/lui` generates into Lyra.
 * @license MIT
 *
 * Enough structure to highlight it, not to check it (lui does that): tags and attributes,
 * `<!-- -->` comments, entities, and three places another language goes — the Lyra in `{…}`
 * (balanced braces, Lyra strings skipped), a `<script>`'s body (Lyra) and a `<style>`'s
 * (CSS-like). A start tag is not matched to its end tag by name.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'lui',

  extras: $ => [/\s/],

  // `script` and `style` are keywords where a tag name may go, so their bodies can be raw.
  word: $ => $.tag_name,

  rules: {
    document: $ => repeat($._node),

    _node: $ => choice(
      $.element,
      $.script_element,
      $.style_element,
      $.comment,
      $.code,
      $.entity,
      $.text,
    ),

    element: $ => choice(
      seq($.start_tag, repeat($._node), $.end_tag),
      $.self_closing_tag,
    ),

    start_tag: $ => seq('<', $.tag_name, repeat($.attribute), '>'),
    end_tag: $ => seq('</', $.tag_name, '>'),
    self_closing_tag: $ => seq('<', $.tag_name, repeat($.attribute), '/>'),

    // A body read as it is, to its end tag: Lyra in a script, a sheet in a style.
    script_element: $ => seq(
      alias($._script_start, $.start_tag),
      optional($.raw_text),
      $.end_tag,
    ),
    _script_start: $ => seq('<', alias('script', $.tag_name), repeat($.attribute), '>'),

    style_element: $ => seq(
      alias($._style_start, $.start_tag),
      optional($.raw_text),
      $.end_tag,
    ),
    _style_start: $ => seq('<', alias('style', $.tag_name), repeat($.attribute), '>'),

    raw_text: _ => /([^<]|<[^\/])+/,

    tag_name: _ => /[A-Za-z_][A-Za-z0-9_-]*/,

    attribute: $ => choice(
      // A component's props: an object of `name: Type = default` entries.
      seq(alias('props', $.attribute_name), '=', $.props),
      seq(
        alias($.tag_name, $.attribute_name),
        optional(seq('=', choice($.quoted_attribute_value, $.code))),
      ),
    ),

    // `props={{ question: string, yes: e, no: e = Cancel, }}`: each prop's name, its type
    // (a Lyra type, `<…>`, `(…)` and `[…]` kept whole so `HashMap<k, v>` is one) and an
    // optional default (Lyra), a trailing comma allowed.
    props: $ => seq('{{', optional(seq($.prop, repeat(seq(',', $.prop)), optional(','))), '}}'),
    prop: $ => seq(
      field('name', alias($.tag_name, $.prop_name)),
      ':',
      field('type', $.prop_type),
      optional(seq('=', field('default', $.prop_default))),
    ),
    prop_type: $ => repeat1($._type_part),
    _type_part: $ => choice(
      /[^,=<>(){}\[\]\s-]+/,
      '->',
      seq('<', repeat(choice($._type_part, ',')), '>'),
      seq('(', repeat(choice($._type_part, ',')), ')'),
      seq('[', repeat(choice($._type_part, ',')), ']'),
    ),
    prop_default: $ => repeat1($._default_part),
    _default_part: $ => choice(
      /[^,{}()\[\]"\s]+/,
      $._lyra_string,
      seq('(', repeat(choice($._default_part, ',')), ')'),
      seq('[', repeat(choice($._default_part, ',')), ']'),
      seq('{', repeat(choice($._default_part, ',')), '}'),
    ),
    quoted_attribute_value: $ => seq('"', optional(alias(/[^"]+/, $.attribute_value)), '"'),

    // `{…}`: Lyra. Its content is one node for the injection; nested braces and strings
    // are only there to find the right `}`.
    code: $ => seq('{', optional($.code_content), '}'),
    code_content: $ => repeat1(choice(/[^{}"]+/, $._braces, $._lyra_string)),
    _braces: $ => seq('{', repeat(choice(/[^{}"]+/, $._braces, $._lyra_string)), '}'),
    _lyra_string: _ => /"([^"\\]|\\.)*"/,

    comment: _ => token(seq('<!--', /([^-]|-[^-]|--[^>])*/, '-->')),
    entity: _ => /&[A-Za-z0-9#]+;/,
    text: _ => /[^<>{}&\s]([^<>{}&]*[^<>{}&\s])?/,
  },
});
