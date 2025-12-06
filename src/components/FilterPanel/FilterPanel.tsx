import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { FilterState, FilterOptions } from '../../types';
import './FilterPanel.css';

interface FilterPanelProps {
  availableFilters: FilterOptions;
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  loading?: boolean;
}

const FilterPanel: React.FC<FilterPanelProps> = memo(({
  availableFilters,
  activeFilters,
  onFilterChange,
  loading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState(activeFilters.priceRange);

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    size: false,
    color: false,
    type: false,
    availability: false,
    price: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Update local price range when active filters change
  useEffect(() => {
    setLocalPriceRange(activeFilters.priceRange);
  }, [activeFilters.priceRange]);

  const handleSizeToggle = useCallback((size: string) => {
    const newSizes = activeFilters.sizes.includes(size)
      ? activeFilters.sizes.filter(s => s !== size)
      : [...activeFilters.sizes, size];

    onFilterChange({
      ...activeFilters,
      sizes: newSizes
    });
  }, [activeFilters, onFilterChange]);

  const handleColorToggle = useCallback((color: string) => {
    const newColors = activeFilters.colors.includes(color)
      ? activeFilters.colors.filter(c => c !== color)
      : [...activeFilters.colors, color];

    onFilterChange({
      ...activeFilters,
      colors: newColors
    });
  }, [activeFilters, onFilterChange]);

  const handleProductTypeToggle = useCallback((type: string) => {
    const newTypes = activeFilters.productTypes.includes(type)
      ? activeFilters.productTypes.filter(t => t !== type)
      : [...activeFilters.productTypes, type];

    onFilterChange({
      ...activeFilters,
      productTypes: newTypes
    });
  }, [activeFilters, onFilterChange]);

  const handleAvailabilityChange = useCallback((availability: 'all' | 'inStock' | 'outOfStock') => {
    onFilterChange({
      ...activeFilters,
      availability
    });
  }, [activeFilters, onFilterChange]);

  const handlePriceRangeChange = (field: 'min' | 'max', value: number) => {
    const newPriceRange = {
      ...localPriceRange,
      [field]: value
    };
    setLocalPriceRange(newPriceRange);
  };

  const applyPriceRange = () => {
    onFilterChange({
      ...activeFilters,
      priceRange: localPriceRange
    });
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: Number.MAX_VALUE },
      availability: 'all',
      productTypes: []
    };
    setLocalPriceRange(clearedFilters.priceRange);
    onFilterChange(clearedFilters);
  };

  const removeFilter = (filterType: keyof FilterState, value?: string) => {
    switch (filterType) {
      case 'sizes':
        if (value) {
          handleSizeToggle(value);
        }
        break;
      case 'colors':
        if (value) {
          handleColorToggle(value);
        }
        break;
      case 'productTypes':
        if (value) {
          handleProductTypeToggle(value);
        }
        break;
      case 'availability':
        handleAvailabilityChange('all');
        break;
      case 'priceRange':
        const defaultRange = { min: 0, max: Number.MAX_VALUE };
        setLocalPriceRange(defaultRange);
        onFilterChange({
          ...activeFilters,
          priceRange: defaultRange
        });
        break;
    }
  };

  const hasActiveFilters = useMemo(() => {
    return activeFilters.sizes.length > 0 ||
      activeFilters.colors.length > 0 ||
      activeFilters.productTypes.length > 0 ||
      activeFilters.availability !== 'all' ||
      activeFilters.priceRange.min > 0 ||
      activeFilters.priceRange.max < Number.MAX_VALUE;
  }, [activeFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += activeFilters.sizes.length;
    count += activeFilters.colors.length;
    count += activeFilters.productTypes.length;
    if (activeFilters.availability !== 'all') count += 1;
    if (activeFilters.priceRange.min > 0 || activeFilters.priceRange.max < Number.MAX_VALUE) count += 1;
    return count;
  }, [activeFilters]);

  if (loading) {
    return (
      <div className="filter-panel loading">
        <div className="filter-panel-header">
          <h3>Filters</h3>
        </div>
        <div className="filter-loading">Loading filters...</div>
      </div>
    );
  }

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : ''}`}>
      {/* Mobile toggle button */}
      <button
        className="filter-toggle-btn mobile-only"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle filters"
      >
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="filter-count">{activeFilterCount}</span>
        )}
        <ChevronDown className={`toggle-icon ${isExpanded ? 'expanded' : ''}`} size={16} />
      </button>

      <div className="filter-panel-content">
        {/* Header with clear all button */}
        <div className="filter-panel-header">
          <h3>Filters</h3>
          {hasActiveFilters && (
            <button
              className="clear-all-btn"
              onClick={clearAllFilters}
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="active-filters">
            <h4>Active Filters:</h4>
            <div className="active-filter-tags">
              {activeFilters.sizes.map(size => (
                <span key={size} className="filter-tag">
                  Size: {size}
                  <button
                    onClick={() => removeFilter('sizes', size)}
                    aria-label={`Remove size filter: ${size}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {activeFilters.colors.map(color => (
                <span key={color} className="filter-tag">
                  Color: {color}
                  <button
                    onClick={() => removeFilter('colors', color)}
                    aria-label={`Remove color filter: ${color}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {activeFilters.productTypes.map(type => (
                <span key={type} className="filter-tag">
                  Type: {type}
                  <button
                    onClick={() => removeFilter('productTypes', type)}
                    aria-label={`Remove type filter: ${type}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {activeFilters.availability !== 'all' && (
                <span className="filter-tag">
                  Availability: {activeFilters.availability === 'inStock' ? 'In Stock' : 'Out of Stock'}
                  <button
                    onClick={() => removeFilter('availability')}
                    aria-label="Remove availability filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(activeFilters.priceRange.min > 0 || activeFilters.priceRange.max < Number.MAX_VALUE) && (
                <span className="filter-tag">
                  Price: ${activeFilters.priceRange.min} - ${activeFilters.priceRange.max === Number.MAX_VALUE ? '∞' : activeFilters.priceRange.max}
                  <button
                    onClick={() => removeFilter('priceRange')}
                    aria-label="Remove price range filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Size filters */}
        {availableFilters.sizes.length > 0 && (
          <div className={`filter-section ${expandedSections.size ? 'expanded' : 'collapsed'}`}>
            <button
              className="filter-section-header"
              onClick={() => toggleSection('size')}
              aria-expanded={expandedSections.size}
            >
              <h4>Size</h4>
              <ChevronDown className="toggle-icon" size={14} />
            </button>
            {expandedSections.size && (
              <div className="filter-options size-options">
                {availableFilters.sizes.map(size => (
                  <label key={size} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={activeFilters.sizes.includes(size)}
                      onChange={() => handleSizeToggle(size)}
                    />
                    <span className="checkmark"></span>
                    {size}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Color filters */}
        {availableFilters.colors.length > 0 && (
          <div className={`filter-section ${expandedSections.color ? 'expanded' : 'collapsed'}`}>
            <button
              className="filter-section-header"
              onClick={() => toggleSection('color')}
              aria-expanded={expandedSections.color}
            >
              <h4>Color</h4>
              <ChevronDown className="toggle-icon" size={14} />
            </button>
            {expandedSections.color && (
              <div className="filter-options color-options">
                {availableFilters.colors.map(color => (
                  <label key={color} className="filter-checkbox color-checkbox">
                    <input
                      type="checkbox"
                      checked={activeFilters.colors.includes(color)}
                      onChange={() => handleColorToggle(color)}
                    />
                    <span
                      className="color-swatch"
                      style={{ backgroundColor: color.toLowerCase() }}
                      title={color}
                    ></span>
                    {color}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Product type filters */}
        {availableFilters.productTypes.length > 0 && (
          <div className={`filter-section ${expandedSections.type ? 'expanded' : 'collapsed'}`}>
            <button
              className="filter-section-header"
              onClick={() => toggleSection('type')}
              aria-expanded={expandedSections.type}
            >
              <h4>Product Type</h4>
              <ChevronDown className="toggle-icon" size={14} />
            </button>
            {expandedSections.type && (
              <div className="filter-options horizontal-options">
                {availableFilters.productTypes.map(type => (
                  <label key={type} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={activeFilters.productTypes.includes(type)}
                      onChange={() => handleProductTypeToggle(type)}
                    />
                    <span className="checkmark"></span>
                    {type}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Availability filter */}
        <div className={`filter-section ${expandedSections.availability ? 'expanded' : 'collapsed'}`}>
          <button
            className="filter-section-header"
            onClick={() => toggleSection('availability')}
            aria-expanded={expandedSections.availability}
          >
            <h4>Availability</h4>
            <ChevronDown className="toggle-icon" size={14} />
          </button>
          {expandedSections.availability && (
            <div className="filter-options horizontal-options">
              <label className="filter-radio">
                <input
                  type="radio"
                  name="availability"
                  checked={activeFilters.availability === 'all'}
                  onChange={() => handleAvailabilityChange('all')}
                />
                <span className="radio-mark"></span>
                All
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="availability"
                  checked={activeFilters.availability === 'inStock'}
                  onChange={() => handleAvailabilityChange('inStock')}
                />
                <span className="radio-mark"></span>
                In Stock
              </label>
              <label className="filter-radio">
                <input
                  type="radio"
                  name="availability"
                  checked={activeFilters.availability === 'outOfStock'}
                  onChange={() => handleAvailabilityChange('outOfStock')}
                />
                <span className="radio-mark"></span>
                Out of Stock
              </label>
            </div>
          )}
        </div>

        {/* Price range filter */}
        <div className={`filter-section ${expandedSections.price ? 'expanded' : 'collapsed'}`}>
          <button
            className="filter-section-header"
            onClick={() => toggleSection('price')}
            aria-expanded={expandedSections.price}
          >
            <h4>Price Range</h4>
            <ChevronDown className="toggle-icon" size={14} />
          </button>
          {expandedSections.price && (
            <>
              <div className="price-range-inputs">
                <div className="price-input-group">
                  <label htmlFor="min-price">Min:</label>
                  <input
                    id="min-price"
                    type="number"
                    min="0"
                    max={availableFilters.priceRange.max}
                    value={localPriceRange.min}
                    onChange={(e) => handlePriceRangeChange('min', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="price-input-group">
                  <label htmlFor="max-price">Max:</label>
                  <input
                    id="max-price"
                    type="number"
                    min={localPriceRange.min}
                    max={availableFilters.priceRange.max}
                    value={localPriceRange.max === Number.MAX_VALUE ? '' : localPriceRange.max}
                    onChange={(e) => handlePriceRangeChange('max', e.target.value ? Number(e.target.value) : Number.MAX_VALUE)}
                    placeholder="No limit"
                  />
                </div>
                <button
                  className="apply-price-btn"
                  onClick={applyPriceRange}
                  disabled={
                    localPriceRange.min === activeFilters.priceRange.min &&
                    localPriceRange.max === activeFilters.priceRange.max
                  }
                >
                  Apply
                </button>
              </div>
              <div className="price-range-info">
                <span>Available range: ${availableFilters.priceRange.min} - ${availableFilters.priceRange.max}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

// Add display name for debugging
FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;