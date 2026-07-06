import React, { useState, useRef, useEffect, useMemo } from 'react';
import './ItemCombobox.css';
import type { IInventoryItem } from '../../types';

interface IItemComboboxProps {
  items: IInventoryItem[];
  value: string;
  onChange: (val: string) => void;
  onSelect: (item: IInventoryItem) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ItemCombobox({ items, value, onChange, onSelect, placeholder, className, style }: IItemComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    // filter out items with no name
    const validItems = items.filter(i => i && i.name);
    
    if (!value) return validItems.slice(0, 50); // limit empty search to 50 items for perf
    const lowerVal = value.toLowerCase();
    return validItems
      .filter(i => i.name.toLowerCase().includes(lowerVal))
      .slice(0, 50);
  }, [items, value]);

  const handleInputClick = () => setIsOpen(true);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (item: IInventoryItem) => {
    onChange(item.name);
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div className="combobox-container" ref={containerRef} style={style}>
      <input
        type="text"
        className={`input combobox-input ${className || ''}`}
        value={value}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onFocus={handleInputClick}
        placeholder={placeholder}
      />
      {isOpen && filteredItems.length > 0 && (
        <ul className="combobox-dropdown" style={{ backgroundColor: 'var(--bg-panel, #18181b)', border: 'var(--panel-border)' }}>
          {filteredItems.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="combobox-option"
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                handleSelect(item);
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
