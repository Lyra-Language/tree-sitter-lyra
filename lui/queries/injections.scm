; `{…}` and a <script>'s body are Lyra; a <style>'s body is a sheet, close enough to CSS to
; be highlighted as CSS. A code node's nested braces and strings are children of its
; content, so the whole of it is injected (include-children).
((code_content) @injection.content
  (#set! injection.language "lyra")
  (#set! injection.include-children))

(script_element
  (raw_text) @injection.content
  (#set! injection.language "lyra"))

(style_element
  (raw_text) @injection.content
  (#set! injection.language "css"))

; A prop's default is Lyra.
((prop_default) @injection.content
  (#set! injection.language "lyra")
  (#set! injection.include-children))
