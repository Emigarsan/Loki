import { useEffect, useMemo, useRef, useState } from 'react';

const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function CharacterSelector({
  value,
  onChange,
  options = [],
  placeholder = 'Busca personaje',
  maxSuggestions = 12
}) {
  const [query, setQuery] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef(null);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => () => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
    }
  }, []);

  const matches = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    const normalized = normalize(query);
    if (!normalized) {
      return base.slice(0, maxSuggestions);
    }
    return base.filter((opt) => normalize(opt).includes(normalized)).slice(0, maxSuggestions);
  }, [options, query, maxSuggestions]);

  const handleSelect = (next) => {
    setQuery(next);
    onChange?.(next);
    setOpen(false);
  };

  const handleInput = (ev) => {
    const next = ev.target.value;
    setQuery(next);
    onChange?.(next);
    setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className={`character-selector${open ? ' is-open' : ''}`}>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        placeholder={placeholder}
      />
      {open && matches.length > 0 && (
        <ul className="character-selector__list" role="listbox">
          {matches.map((opt) => (
            <li
              key={opt}
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
