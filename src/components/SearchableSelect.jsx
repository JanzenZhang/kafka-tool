import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function SearchableSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    disabled = false,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options case-insensitively
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-3 py-2 bg-surface rounded-lg border text-sm text-left flex items-center justify-between transition-smooth
                    ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-gray-500 cursor-pointer'}
                    ${isOpen ? 'ring-2 ring-accent/50 border-accent' : ''}
                `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-100'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-surface-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search topics..."
                            className="w-full pl-8 pr-3 py-1.5 bg-surface rounded-md border border-border text-sm text-gray-100
                                focus:outline-none focus:border-accent transition-smooth"
                            autoFocus
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-gray-500 text-center">
                                No topics found
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full px-3 py-2 flex items-center justify-between text-sm text-left transition-smooth
                                        ${value === opt.value ? 'bg-accent/15 text-accent' : 'text-gray-300 hover:bg-surface-hover hover:text-gray-100'}
                                    `}
                                >
                                    <span className="truncate pr-2">{opt.label}</span>
                                    {value === opt.value && <Check size={14} className="text-accent flex-shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
