import { useCallback, useRef, useState } from 'react';
import { formatFileSize, isValidDocument } from '../utils/format';
import './FileUploadZone.css';

interface FileUploadZoneProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileUploadZone({
  label,
  file,
  onFileChange,
  disabled = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    (selected: File | null) => {
      setLocalError(null);
      if (!selected) {
        onFileChange(null);
        return;
      }
      if (!isValidDocument(selected)) {
        setLocalError('Допустимы только файлы .pdf и .docx');
        return;
      }
      onFileChange(selected);
    },
    [onFileChange],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const dropped = event.dataTransfer.files[0];
      handleFile(dropped ?? null);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => setDragOver(false), []);

  return (
    <div className="upload-zone-wrapper">
      <span className="upload-label">{label}</span>
      <div
        className={[
          'upload-zone',
          dragOver && 'upload-zone--drag',
          file && 'upload-zone--filled',
          disabled && 'upload-zone--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="upload-input"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="upload-file-info">
            <div className="upload-file-icon" aria-hidden>
              {file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX'}
            </div>
            <div className="upload-file-meta">
              <span className="upload-file-name">{file.name}</span>
              <span className="upload-file-size">{formatFileSize(file.size)}</span>
            </div>
            <button
              type="button"
              className="upload-clear"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleFile(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              aria-label="Удалить файл"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon" aria-hidden>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="upload-hint">Перетащите файл или нажмите для выбора</p>
            <p className="upload-formats">PDF или DOCX</p>
          </div>
        )}
      </div>
      {localError && <p className="upload-error">{localError}</p>}
    </div>
  );
}
