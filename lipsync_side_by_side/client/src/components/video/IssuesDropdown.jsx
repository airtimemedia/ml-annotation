import { useState, useRef, useEffect } from 'react';
import { NO_ISSUES, SINGLE_ISSUE } from '../../constants/index';
import './IssuesDropdown.css';

const ISSUE_OPTIONS = [
  'Mouth shape mismatch',
  'Timing off',
  'Unnatural movements',
  'Audio desync',
  'Lip closure issues',
  'Teeth visibility',
  'Jaw movement',
  'Expression mismatch'
];

export default function IssuesDropdown({ selectedIssues, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleIssue = (issue) => {
    if (selectedIssues.includes(issue)) {
      onChange(selectedIssues.filter(i => i !== issue));
    } else {
      onChange([...selectedIssues, issue]);
    }
  };

  const getButtonText = () => {
    if (selectedIssues.length === NO_ISSUES) return 'Select issues';
    if (selectedIssues.length === SINGLE_ISSUE) return selectedIssues[0];
    return `${selectedIssues.length} issues selected`;
  };

  return (
    <div className="issues-dropdown" ref={dropdownRef}>
      <button
        className="issues-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {getButtonText()}
      </button>

      {isOpen && (
        <div className="issues-menu">
          {ISSUE_OPTIONS.map((issue) => (
            <div
              key={issue}
              className="issue-item"
              onClick={() => toggleIssue(issue)}
            >
              <input
                type="checkbox"
                checked={selectedIssues.includes(issue)}
                onChange={() => {}}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
