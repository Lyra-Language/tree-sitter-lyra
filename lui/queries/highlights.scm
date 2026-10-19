; `.lui` markup (lyra/tools/lui). A sibling of lyra-zed-ext/languages/lui/highlights.scm,
; in the opposite order: here the first matching pattern wins (tree-sitter's highlighter),
; in Zed the last, so the narrow tag rules come first here and last there.

(comment) @comment

; A tag: a capitalized one is an element of bindings.imgui.ui, a lowercase one a component
; of the same file, and these few are the format's own.
((tag_name) @keyword
  (#match? @keyword "^(component|script|style)$"))
((tag_name) @keyword
  (#match? @keyword "^(if|else|for)$"))
((tag_name) @type
  (#match? @type "^[A-Z]"))
((tag_name) @function
  (#match? @function "^[a-z]"))
(tag_name) @tag

(attribute_name) @attribute
(quoted_attribute_value) @string
(entity) @string.escape

[
  "<"
  ">"
  "</"
  "/>"
] @punctuation.bracket

"=" @operator

(code
  [
    "{"
    "}"
  ] @punctuation.special)
