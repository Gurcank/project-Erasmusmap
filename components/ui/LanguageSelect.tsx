"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "@/hooks/useT";
import { useClickOutside } from "@/hooks/useClickOutside";
import FlagIcon from "@/components/ui/FlagIcon";
import GlassButton from "@/components/ui/GlassButton";
import { OFFERED_LANGUAGES, type Lang } from "@/lib/i18n";
import { useLangContext } from "@/components/LangProvider";

const OPTION_ID = (lang: Lang) => `language-option-${lang}`;

const LIST_WIDTH = 176;
const GAP = 8;

/** Fixed-position box for the list: under the trigger, right-aligned, on screen. */
function placeUnder(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  return {
    top: rect.bottom + GAP,
    left: Math.max(
      GAP,
      Math.min(rect.right - LIST_WIDTH, window.innerWidth - LIST_WIDTH - GAP),
    ),
    width: LIST_WIDTH,
  };
}

/**
 * Language picker: a listbox rather than a native <select>, because the options
 * carry flags and a <select> cannot render them (see FlagIcon on why emoji are
 * not an option either).
 *
 * The list is portalled to <body>. Its home on the settings page is a card with
 * `overflow-hidden`, which clipped all but a sliver of it, and `position: fixed`
 * would not have escaped either — the card is a glass panel, and a
 * `backdrop-filter` ancestor becomes the containing block for fixed children.
 *
 * The cost of leaving the tree is the native mobile picker and the automatic
 * click-outside; the keyboard contract and the positioning below replace them.
 */
export default function LanguageSelect() {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  const { lang: current, setLang } = useLangContext();

  const currentIndex = OFFERED_LANGUAGES.findIndex(
    (language) => language.code === current,
  );
  // Where the arrow keys are, which is not the selected option until Enter
  // commits it. Null means "wherever the selection is".
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  const activeIndex = keyboardIndex ?? Math.max(currentIndex, 0);

  const close = () => {
    setIsOpen(false);
    setKeyboardIndex(null);
  };

  useClickOutside(rootRef, close, isOpen, listRef);

  const open = () => {
    const trigger = rootRef.current;
    if (!trigger) return;
    // Placed before the list mounts, so the first frame is already in the right
    // spot and the effect below finds something to focus.
    setPosition(placeUnder(trigger));
    setIsOpen(true);
  };

  // The list is fixed to the viewport, so it has to follow the trigger rather
  // than being placed once.
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.focus();

    const reposition = () => {
      const trigger = rootRef.current;
      if (trigger) setPosition(placeUnder(trigger));
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [isOpen]);

  const choose = (lang: Lang) => {
    setLang(lang);
    close();
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    const last = OFFERED_LANGUAGES.length - 1;
    const move = (next: number) => {
      event.preventDefault();
      setKeyboardIndex(Math.min(last, Math.max(0, next)));
    };

    switch (event.key) {
      case "ArrowDown":
        return move(activeIndex + 1);
      case "ArrowUp":
        return move(activeIndex - 1);
      case "Home":
        return move(0);
      case "End":
        return move(last);
      case "Enter":
      case " ":
        event.preventDefault();
        return choose(OFFERED_LANGUAGES[activeIndex].code);
      case "Escape":
        event.preventDefault();
        return close();
      default:
        return undefined;
    }
  };

  const selected = OFFERED_LANGUAGES[Math.max(currentIndex, 0)];

  const list = (
    <ul
      ref={listRef}
      role="listbox"
      tabIndex={-1}
      aria-label={t.langLabel}
      aria-activedescendant={OPTION_ID(OFFERED_LANGUAGES[activeIndex].code)}
      onKeyDown={onListKeyDown}
      style={position ?? undefined}
      className="glass glass-edge fixed z-50 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-popover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
    >
      {OFFERED_LANGUAGES.map((language, index) => {
        const isSelected = language.code === current;
        return (
          <li key={language.code} role="none">
            <button
              id={OPTION_ID(language.code)}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              onClick={() => choose(language.code)}
              onMouseEnter={() => setKeyboardIndex(index)}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                index === activeIndex
                  ? "bg-surface-raised text-text"
                  : "text-text-muted"
              }`}
            >
              <FlagIcon lang={language.code} />
              <span className="flex-1">{language.label}</span>
              {isSelected && (
                <Check
                  size={14}
                  aria-hidden="true"
                  className="text-accent-text"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={rootRef} className="shrink-0">
      <GlassButton
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t.langLabel}
      >
        <FlagIcon lang={selected.code} />
        {selected.label}
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`text-text-subtle transition-transform motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </GlassButton>

      {isOpen && createPortal(list, document.body)}
    </div>
  );
}
