import React, { useState, useCallback } from 'react';
import { ValidationResult, validateField, ValidationRule } from '../../utils/formValidation';
import './FormField.css';

export interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
  value: string;
  onChange: (name: string, value: string) => void;
  onBlur?: (name: string) => void;
  onValidation?: (name: string, result: ValidationResult) => void;
  validationRules?: ValidationRule;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  showPasswordToggle?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  onValidation,
  validationRules,
  error,
  placeholder,
  disabled = false,
  autoComplete,
  autoFocus = false,
  required = false,
  showPasswordToggle = false,
  className = '',
  'aria-describedby': ariaDescribedBy
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Determine input type based on password toggle state
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(name, newValue);

    // Perform real-time validation if rules are provided
    if (validationRules && onValidation) {
      const result = validateField(newValue, validationRules);
      onValidation(name, result);
    }
  }, [name, onChange, onValidation, validationRules]);

  // Handle input blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    if (onBlur) {
      onBlur(name);
    }

    // Perform validation on blur if rules are provided
    if (validationRules && onValidation) {
      const result = validateField(e.target.value, validationRules);
      onValidation(name, result);
    }
  }, [name, onBlur, onValidation, validationRules]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Generate IDs for accessibility
  const inputId = `${name}-input`;
  const errorId = `${name}-error`;
  const describedBy = [
    ariaDescribedBy,
    error ? errorId : undefined
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field ${className} ${error ? 'has-error' : ''} ${isFocused ? 'is-focused' : ''}`}>
      <label htmlFor={inputId} className="form-field-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>
      
      <div className="form-field-input-container">
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          className={`form-field-input ${error ? 'error' : ''}`}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
        
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            className="password-toggle-button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            <span className="password-toggle-icon">
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </span>
          </button>
        )}
      </div>
      
      {error && (
        <div id={errorId} className="form-field-error" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormField;