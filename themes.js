/* =========================================================
   themes.js — defines what each tile displays. "classic" shows
   the tile's own number. Emoji themes map a tile's number to a
   symbol, cycling through the list if there are more tiles than
   symbols (only relevant at 5x5, which needs up to 24 symbols).
   ========================================================= */

export const THEMES = {
  classic: {
    label: "Classic",
    preview: "🔢",
    symbols: null, // null means "just show the number"
  },
  animals: {
    label: "Animals",
    preview: "🐶",
    symbols: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦉", "🐴", "🦄", "🐝"],
  },
  space: {
    label: "Space",
    preview: "🚀",
    symbols: ["🚀", "🌎", "⭐", "🪐", "☄️", "🌙", "👽", "🛸", "🌌", "🔭", "🌠", "☀️", "🌕", "🌗", "🌑", "🛰️", "🧑‍🚀", "🌟", "💫", "🌞", "🪨", "🔥", "❄️", "🌈"],
  },
  fruits: {
    label: "Fruits",
    preview: "🍎",
    symbols: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍉", "🍑", "🍍", "🥝", "🍒", "🍌", "🥭", "🍏", "🍈", "🫐", "🍐", "🥥", "🍅", "🥑", "🍆", "🌽", "🥕", "🫑", "🥔"],
  },
};

/** Returns what to display inside a tile with the given value. */
export function getTileDisplay(themeKey, value, size) {
  const theme = THEMES[themeKey] || THEMES.classic;
  if (!theme.symbols) return String(value);
  return theme.symbols[(value - 1) % theme.symbols.length];
}
