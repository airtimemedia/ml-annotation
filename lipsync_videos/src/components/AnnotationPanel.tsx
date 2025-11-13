import { useState, useEffect } from 'react';
import { ButtonGroup } from './ButtonGroup';
import type { VideoAnnotation } from '../types';
import './AnnotationPanel.css';

interface AnnotationPanelProps {
  annotation: VideoAnnotation;
  onAnnotationChange: (annotation: VideoAnnotation) => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function AnnotationPanel({
  annotation,
  onAnnotationChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: AnnotationPanelProps) {
  const [localAnnotation, setLocalAnnotation] = useState<VideoAnnotation>(annotation);

  useEffect(() => {
    setLocalAnnotation(annotation);
  }, [annotation.path]);

  const handleFieldChange = (field: string, value: string) => {
    const updated = {
      ...localAnnotation,
      [field]: value,
      last_updated: new Date().toISOString().split('T')[0],
    };
    setLocalAnnotation(updated);
    onAnnotationChange(updated);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = {
      ...localAnnotation,
      notes: e.target.value,
      last_updated: new Date().toISOString().split('T')[0],
    };
    setLocalAnnotation(updated);
    onAnnotationChange(updated);
  };

  return (
    <div className="annotation-panel">
      <h3 className="annotation-panel__title">Annotations</h3>

      <div className="annotation-panel__form">
        <ButtonGroup
          label="Source"
          value={localAnnotation.source || ''}
          options={[
            { label: 'Real', value: 'real' },
            { label: 'Generated', value: 'generated' },
          ]}
          onChange={(value) => handleFieldChange('source', value)}
        />

        <ButtonGroup
          label="Character Type"
          value={localAnnotation.content_type || ''}
          options={[
            { label: 'Human', value: 'human' },
            { label: 'Human-Like', value: 'human-like' },
            { label: 'Non-Human', value: 'non-human' },
          ]}
          onChange={(value) => handleFieldChange('content_type', value)}
        />

        <ButtonGroup
          label="Direction"
          value={localAnnotation.direction || ''}
          options={[
            { label: 'Straight', value: 'straight' },
            { label: 'Up', value: 'up' },
            { label: 'Down', value: 'down' },
            { label: 'Left', value: 'left' },
            { label: 'Right', value: 'right' },
            { label: 'Multiple', value: 'multiple' },
          ]}
          onChange={(value) => handleFieldChange('direction', value)}
        />

        <ButtonGroup
          label="Size"
          value={localAnnotation.size || ''}
          options={[
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
          ]}
          onChange={(value) => handleFieldChange('size', value)}
        />

        <ButtonGroup
          label="Include"
          value={localAnnotation.include || ''}
          options={[
            { label: 'Include', value: 'include' },
            { label: 'Exclude', value: 'exclude' },
          ]}
          onChange={(value) => handleFieldChange('include', value)}
        />

        <ButtonGroup
          label="Category"
          value={localAnnotation.category || ''}
          options={[
            { label: 'Simple', value: 'simple' },
            { label: 'Complex', value: 'complex' },
          ]}
          onChange={(value) => handleFieldChange('category', value)}
        />

        <div className="form-group">
          <label htmlFor="notes">Notes:</label>
          <textarea
            id="notes"
            value={localAnnotation.notes || ''}
            onChange={handleNotesChange}
            placeholder="Optional notes"
            rows={4}
          />
        </div>

        <div className="navigation">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="btn btn--secondary"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="btn btn--primary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
