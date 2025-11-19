import React from 'react';
import './LoadingIndicator.css';

export interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse';
  color?: 'primary' | 'secondary' | 'white' | 'inherit';
  text?: string;
  className?: string;
  inline?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  variant = 'spinner',
  color = 'primary',
  text,
  className = '',
  inline = false
}) => {
  const baseClass = `loading-indicator ${size} ${variant} ${color} ${inline ? 'inline' : ''} ${className}`;

  const renderSpinner = () => (
    <div className={`${baseClass} spinner-container`} role="status" aria-label={text || 'Loading'}>
      <div className="spinner" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );

  const renderDots = () => (
    <div className={`${baseClass} dots-container`} role="status" aria-label={text || 'Loading'}>
      <div className="dots">
        <div className="dot" />
        <div className="dot" />
        <div className="dot" />
      </div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );

  const renderPulse = () => (
    <div className={`${baseClass} pulse-container`} role="status" aria-label={text || 'Loading'}>
      <div className="pulse" />
      {text && <span className="loading-text">{text}</span>}
    </div>
  );

  switch (variant) {
    case 'dots':
      return renderDots();
    case 'pulse':
      return renderPulse();
    case 'spinner':
    default:
      return renderSpinner();
  }
};

export default LoadingIndicator;