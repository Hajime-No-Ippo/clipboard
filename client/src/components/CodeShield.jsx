import { useRef } from "react";
import { extractCode } from "@/lib/code";

const CODE_LENGTH = 6;
// Same alphabet the server generates from (worker/index.js's newCode()) — no
// I/L/O/0/1, so a box never accepts a character the generator itself would
// never produce.
const CODE_CHAR = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]$/;

// Same idea as the ROTATIONS in lib/board.js — nothing on this board sits
// perfectly square, so the six boxes alternate a small tilt instead of
// standing in a rigid, printed-looking row.
const TILTS = [-2, 1.5, -1, 2, -1.5, 1];

/**
 * Six individual boxes for a board code, instead of one plain text field —
 * the code IS six fixed characters (worker/index.js's generator), so the
 * input should look like it: one slot per character, not a sentence field.
 *
 * Paste stays first-class: dropping a whole code, or a full board link,
 * into any box runs it through extractCode() — the same parser the old
 * plain `<Input>` in Home.jsx relied on — and fans the result out across
 * all six boxes, rather than only accepting one typed character at a time.
 */
export function CodeShield({ value, onChange, onSubmit, disabled, error }) {
  const chars = value.padEnd(CODE_LENGTH, " ").slice(0, CODE_LENGTH).split("");
  const boxRefs = useRef([]);

  const setChar = (index, char) => {
    const next = chars.slice();
    next[index] = char;
    onChange(next.join("").trimEnd());
  };

  const focusBox = (index) => {
    const box = boxRefs.current[index];
    box?.focus();
    box?.select();
  };

  const handleChange = (index, event) => {
    const raw = event.target.value.toUpperCase();
    // The browser can hand back more than one character here (IME input,
    // some mobile keyboards autocompleting a whole word) — the box only
    // ever holds one, so take the last character typed.
    const char = raw.slice(-1);
    if (char && !CODE_CHAR.test(char)) return;

    setChar(index, char);
    if (char && index < CODE_LENGTH - 1) focusBox(index + 1);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !chars[index].trim() && index > 0) {
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      focusBox(index + 1);
    } else if (event.key === "Enter") {
      onSubmit?.();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    // extractCode() handles a bare code or a full pasted board link; either
    // way what comes back (if anything) is already the six-character code.
    const code = extractCode(pasted) ?? pasted.toUpperCase().replace(/[^A-Z0-9]/g, "");
    onChange(code.slice(0, CODE_LENGTH));
    focusBox(Math.min(code.length, CODE_LENGTH - 1));
  };

  return (
    <div>
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {chars.map((char, index) => (
          <input
            key={index}
            ref={(el) => (boxRefs.current[index] = el)}
            value={char.trim()}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onFocus={(event) => event.target.select()}
            disabled={disabled}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={1}
            aria-label={`Code character ${index + 1}`}
            style={{ transform: `rotate(${TILTS[index]}deg)` }}
            className="h-12 w-9 rounded-[3px] border border-[#cbb79a] bg-[#fffdf4] text-center font-mono text-lg text-[#2f2418] shadow-[2px_3px_0_rgba(47,36,24,0.08)] transition-colors focus:border-[#7a5a33] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-10 sm:text-xl"
          />
        ))}
      </div>
      {error && <p className="mt-2 text-center text-sm text-red-700">{error}</p>}
    </div>
  );
}
