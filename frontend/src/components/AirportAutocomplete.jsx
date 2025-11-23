// frontend/src/components/AirportAutocomplete.jsx
import { useState, useRef, useEffect } from 'react';
import { Plane, X, Check } from 'lucide-react';
import { searchAirports, getAirportDisplayName } from '../data/airports';

export default function AirportAutocomplete({
  selectedAirports = [],
  onChange,
  maxSelection = 3,
  placeholder = 'Rechercher un aéroport...',
  label = 'Aéroports de départ',
  helperText = null,
  error = null
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search airports when query changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      const searchResults = searchAirports(query);
      setResults(searchResults);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (airport) => {
    // Check if airport already selected
    if (selectedAirports.some(a => a.code === airport.code)) {
      return;
    }

    // Check max selection limit
    if (selectedAirports.length >= maxSelection) {
      return;
    }

    onChange([...selectedAirports, airport]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (airportCode) => {
    onChange(selectedAirports.filter(a => a.code !== airportCode));
  };

  const isSelected = (airportCode) => {
    return selectedAirports.some(a => a.code === airportCode);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-medium text-text-main">
          {label}
          {maxSelection > 1 && (
            <span className="text-sm text-text-secondary ml-2">
              ({selectedAirports.length}/{maxSelection})
            </span>
          )}
        </label>
      )}

      {/* Selected airports */}
      {selectedAirports.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedAirports.map((airport) => (
            <div
              key={airport.code}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
            >
              <Plane size={14} />
              <span>
                {airport.city} ({airport.code})
              </span>
              <button
                onClick={() => handleRemove(airport.code)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Plane
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            size={20}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            placeholder={
              selectedAirports.length >= maxSelection
                ? `Maximum ${maxSelection} aéroports sélectionnés`
                : placeholder
            }
            disabled={selectedAirports.length >= maxSelection}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-primary'
            } focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
        </div>

        {/* Dropdown results */}
        {isOpen && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {results.map((airport) => {
              const selected = isSelected(airport.code);
              return (
                <button
                  key={airport.code}
                  onClick={() => handleSelect(airport)}
                  disabled={selected}
                  type="button"
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    selected ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-text-main flex items-center gap-2">
                      <Plane size={16} className="text-primary" />
                      {airport.city}
                      {airport.primary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {airport.name} • {airport.country}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="font-mono font-semibold text-primary">
                      {airport.code}
                    </span>
                    {selected && <Check size={18} className="text-green-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results message */}
        {isOpen && query.length >= 2 && results.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-text-secondary">
            Aucun aéroport trouvé pour &quot;{query}&quot;
          </div>
        )}
      </div>

      {/* Helper text or error */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && helperText && (
        <p className="text-sm text-text-secondary">{helperText}</p>
      )}
    </div>
  );
}
