import { useState, useRef, useEffect } from 'react';
import { ReferenceAudioData, GoldenSetFile, StatusMessage } from '../types';

interface AudioUploadProps {
  onAudioUploaded: (data: ReferenceAudioData | null) => void;
  disabled: boolean;
}

export default function AudioUpload({ onAudioUploaded, disabled }: AudioUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | { name: string; size: number; isGoldenSet: boolean; goldenSetFilename: string } | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [goldenSetFiles, setGoldenSetFiles] = useState<GoldenSetFile[]>([]);
  const [selectedGoldenSet, setSelectedGoldenSet] = useState<string>('');
  const [isLoadingGoldenSet, setIsLoadingGoldenSet] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch golden set files on mount
  useEffect(() => {
    const fetchGoldenSet = async () => {
      console.log('[AudioUpload] Fetching golden set files...');
      setIsLoadingGoldenSet(true);
      try {
        const response = await fetch('/api/tts/golden-set');
        const data = await response.json();
        console.log('[AudioUpload] Golden set response:', response.ok, data);
        if (response.ok && data.files) {
          setGoldenSetFiles(data.files);
          console.log('[AudioUpload] Loaded', data.files.length, 'golden set files');
        } else {
          console.error('[AudioUpload] Error in response:', data);
        }
      } catch (error) {
        console.error('[AudioUpload] Error fetching golden set:', error);
      } finally {
        setIsLoadingGoldenSet(false);
      }
    };
    fetchGoldenSet();
  }, []);

  const handleGoldenSetSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filename = e.target.value;
    setSelectedGoldenSet(filename);

    if (!filename) {
      setSelectedFile(null);
      if (onAudioUploaded) {
        onAudioUploaded(null);
      }
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const selectedFileInfo = goldenSetFiles.find(f => f.name === filename);
    if (selectedFileInfo) {
      const fileObj = {
        name: selectedFileInfo.label,
        size: selectedFileInfo.size,
        isGoldenSet: true,
        goldenSetFilename: filename
      };
      setSelectedFile(fileObj);

      if (onAudioUploaded) {
        onAudioUploaded({
          file: fileObj,
          isGoldenSet: true,
          goldenSetFilename: filename,
          filename: filename,
        });
      }
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setSelectedGoldenSet('');
    setStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onAudioUploaded) {
      onAudioUploaded(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedGoldenSet('');

      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/flac', 'audio/ogg'];
      const validExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setStatus(null);

        if (onAudioUploaded) {
          onAudioUploaded({
            file: file,
            isGoldenSet: false,
            filename: file.name,
          });
        }
      } else {
        setStatus({ type: 'error', message: 'Please select a valid audio file (.wav, .mp3, .m4a, .flac, .ogg)' });
        setSelectedFile(null);
      }
    }
  };

  return (
    <div className="audio-upload">
      <div className="form-group">
        <div className="upload-controls">
          <select
            value={selectedGoldenSet}
            onChange={handleGoldenSetSelect}
            disabled={disabled || isLoadingGoldenSet}
            className="setting-select"
          >
            <option value="">
              {isLoadingGoldenSet
                ? 'Loading golden set...'
                : goldenSetFiles.length > 0
                  ? 'Select from golden set...'
                  : 'No golden set files available'}
            </option>
            {goldenSetFiles.map((file) => (
              <option key={file.name} value={file.name}>
                {file.label}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.flac,.ogg,audio/*"
            onChange={handleFileSelect}
            disabled={disabled}
            className="file-input"
          />

          {selectedFile && (
            <div className="selected-file">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="upload-actions">
          <button
            onClick={handleClear}
            className="btn btn-secondary"
            disabled={disabled}
          >
            Clear
          </button>
        </div>
      )}

      {status && (
        <div className={`status-message status-${status.type}`}>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
