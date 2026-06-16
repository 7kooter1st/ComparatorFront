interface FileUploadProps {
  id: string
  label: string
  accept: string
  file: File | null
  disabled?: boolean
  onChange: (file: File | null) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function FileUpload({
  id,
  label,
  accept,
  file,
  disabled = false,
  onChange,
}: FileUploadProps) {
  return (
    <div className="file-upload">
      <label className="file-upload__label" htmlFor={id}>
        {label}
      </label>
      <div className="file-upload__control">
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="file-upload__input"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null
            onChange(selected)
          }}
        />
        <label htmlFor={id} className="file-upload__button">
          Выбрать файл
        </label>
        {file ? (
          <div className="file-upload__meta">
            <span className="file-upload__name">{file.name}</span>
            <span className="file-upload__size">{formatFileSize(file.size)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
