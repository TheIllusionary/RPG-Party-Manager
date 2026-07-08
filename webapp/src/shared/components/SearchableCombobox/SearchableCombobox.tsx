import React, { useState, useEffect, useRef } from 'react';
import './SearchableCombobox.css';

export interface ISearchableComboboxOption {
    label: string;
    value: string;
}

export interface ISearchableComboboxProps {
    options: ISearchableComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function SearchableCombobox({
    options,
    value,
    onChange,
    placeholder = 'Search...',
    disabled = false,
    className = ''
}: ISearchableComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const [activeIndex, setActiveIndex] = useState(-1);
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Sync external value changes if they don't match the search term
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Reset active index when search changes
    useEffect(() => {
        setActiveIndex(-1);
    }, [searchTerm]);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && activeIndex >= 0 && listRef.current) {
            const listElement = listRef.current;
            const activeElement = listElement.children[activeIndex] as HTMLElement;
            if (activeElement) {
                const elementTop = activeElement.offsetTop;
                const elementBottom = elementTop + activeElement.clientHeight;
                const listTop = listElement.scrollTop;
                const listBottom = listTop + listElement.clientHeight;

                if (elementTop < listTop) {
                    listElement.scrollTop = elementTop;
                } else if (elementBottom > listBottom) {
                    listElement.scrollTop = elementBottom - listElement.clientHeight;
                }
            }
        }
    }, [activeIndex, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue); // Emit raw text directly
        setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                    const selected = filteredOptions[activeIndex];
                    setSearchTerm(selected.label);
                    onChange(selected.value);
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    };

    const handleOptionClick = (option: ISearchableComboboxOption) => {
        setSearchTerm(option.label);
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={`searchable-combobox-wrapper ${className}`} ref={wrapperRef}>
            <input
                type="text"
                className="input full-width"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
            />
            {isOpen && !disabled && (
                <ul className="searchable-combobox-dropdown" ref={listRef}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <li
                                key={`${option.value}-${index}`}
                                className={`searchable-combobox-option ${index === activeIndex ? 'is-active' : ''}`}
                                onMouseDown={(e) => e.preventDefault()} // Prevent blur on input
                                onClick={() => handleOptionClick(option)}
                                onMouseEnter={() => setActiveIndex(index)}
                            >
                                {option.label}
                            </li>
                        ))
                    ) : (
                        <li className="searchable-combobox-empty">
                            No matching results found
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
