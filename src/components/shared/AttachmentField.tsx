import * as React from "react"
import { Paperclip, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateId, nowIso } from "@/mocks/db/ids"
import type { Attachment } from "@/types/entities"

interface AttachmentFieldProps {
  label?: string
  value: Attachment[]
  onChange?: (next: Attachment[]) => void
  /** Só permite visualizar/abrir anexos existentes, sem adicionar nem remover. */
  readOnly?: boolean
  /** Permite ver e abrir, mas não adicionar/remover (ex.: motorista vendo anexos gerais). */
  canRemove?: boolean
}

export function AttachmentField({
  label,
  value,
  onChange,
  readOnly = false,
  canRemove = !readOnly,
}: AttachmentFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !onChange) return
    const additions: Attachment[] = Array.from(files).map((file) => ({
      id: generateId("anexo"),
      name: file.name,
      url: URL.createObjectURL(file),
      uploaded_at: nowIso(),
    }))
    onChange([...value, ...additions])
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleRemove(id: string) {
    onChange?.(value.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
      )}
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-foreground hover:underline"
              >
                {attachment.name}
              </a>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemove(attachment.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${attachment.name}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            Adicionar anexo
          </Button>
        </>
      )}
    </div>
  )
}