// frontend/src/components/DestinationAutocomplete.jsx
// Autocomplete input for destination selection with API-powered suggestions

import { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Search destination...",
  className = "",
  disabled = false,
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value && value !== query && !selectedDestination) {
      setQuery(value);
    }
  }, [value]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Don't search if we just selected a destination
    if (selectedDestination && query === selectedDestination.label) {
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/travel/destinations/search?query=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        if (data.success && data.destinations) {
          setSuggestions(data.destinations);
          setIsOpen(data.destinations.length > 0);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedDestination(null);

    // If user clears the input, also clear the selected destination
    if (!newValue) {
      onChange({ destination: '', destinationId: null });
    }
  };

  const handleSelect = (destination) => {
    setQuery(destination.label);
    setSelectedDestination(destination);
    setIsOpen(false);
    setSuggestions([]);

    // Pass both the display name and the API ID to parent
    onChange({
      destination: destination.label,
      destinationId: destination.id,
      destinationCode: destination.code,
      destinationCity: destination.city,
      destinationCountry: destination.country,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        />

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {selectedDestination && !isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-green-500">✓</span>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((dest, index) => (
            <button
              key={dest.id || index}
              type="button"
              onClick={() => handleSelect(dest)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Icon based on type */}
                <span className="text-lg">
                  {dest.type === 'CITY' ? '🏙️' : dest.type === 'AIRPORT' ? '✈️' : '📍'}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-main truncate">
                    {dest.city || dest.name}
                  </div>
                  <div className="text-sm text-text-secondary flex items-center gap-2">
                    <span>{dest.country}</span>
                    {dest.code && (
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {dest.code}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= 2 && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4 text-center text-text-secondary">
          No destinations found for "{query}"
        </div>
      )}
    </div>
  );
}
