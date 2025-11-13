import './UnsavedChangesModal.css';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnsavedChangesModal({ isOpen, onConfirm, onCancel }: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Unsaved Changes</h2>
        </div>
        <div className="modal-body">
          <p>You have unsaved changes. Are you sure you want to discard them?</p>
        </div>
        <div className="modal-footer">
          <button className="modal-button modal-button--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="modal-button modal-button--confirm" onClick={onConfirm}>
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}
