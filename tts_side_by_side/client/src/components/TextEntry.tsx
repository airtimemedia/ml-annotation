import { useState, useEffect } from 'react';

interface TextEntryProps {
  onTextChange: (text: string) => void;
  disabled: boolean;
}

const DEFAULT_TEXT = "That hurts to admit but um I have no choice in the matter! at least uh not in a way that doesn't go against my interests...";

export default function TextEntry({ onTextChange, disabled }: TextEntryProps) {
  const [text, setText] = useState<string>(DEFAULT_TEXT);

  // Notify parent of initial text on mount
  useEffect(() => {
    if (onTextChange) {
      onTextChange(DEFAULT_TEXT);
    }
  }, [onTextChange]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (onTextChange) {
      onTextChange(newText);
    }
  };

  return (
    <div className="text-entry">
      <div className="form-group">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="Enter text to convert to speech..."
          disabled={disabled}
          className="form-textarea"
          rows={3}
        />
      </div>
    </div>
  );
}
