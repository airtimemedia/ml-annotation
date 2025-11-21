import React from 'react';

interface SectionProps {
  stepNumber: number;
  title: string;
  description: string;
  isComplete: boolean;
  isDisabled: boolean;
  isHighlighted?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable section component with completion states
 */
export default function Section({
  stepNumber,
  title,
  description,
  isComplete,
  isDisabled,
  isHighlighted = false,
  children
}: SectionProps) {
  const sectionClass = `section ${isComplete ? 'section-completed' : ''} ${isDisabled ? 'section-disabled' : ''} ${isHighlighted ? 'section-highlighted' : ''}`;

  return (
    <section className={sectionClass}>
      <h2 className="section-header">
        {stepNumber}. {title}
        {isComplete && <span className="step-checkmark">✓</span>}
      </h2>
      <p className="section-description">{description}</p>
      {children}
    </section>
  );
}
