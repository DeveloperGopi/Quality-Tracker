import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Paperclip, AlertTriangle } from "lucide-react";

export type AttachmentValue = {
  attachmentId?: string;
  attachmentName?: string;
  attachmentType?: string;
};

/** Pick a file, upload it to Convex storage, and expose the storage id.
 *  Pass `initial` to show an existing attachment with a view link. */
export function AttachmentPicker({
  initial,
  onChange,
  disabled,
  label = "Attachment",
  accept,
  validateFile,
}: {
  initial?: AttachmentValue | null;
  onChange: (value: AttachmentValue | null) => void;
  disabled?: boolean;
  label?: string;
  /** Optional accept attribute override (e.g. ".pdf" for the SA report). */
  accept?: string;
  /** Optional pre-upload check returning a plain-language error message
   *  (extension + size limits, used by the Facility Profile forms). */
  validateFile?: (file: File) => string | null;
}) {
  const generateUploadUrl = useMutation(api.modules.generateUploadUrl);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<AttachmentValue | null>(initial ?? null);

  const upload = async (file: File) => {
    const validationError = validateFile?.(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const url = await generateUploadUrl({});
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { storageId } = (await res.json()) as { storageId: string };
      const value = {
        attachmentId: storageId,
        attachmentName: file.name,
        attachmentType: file.type || undefined,
      };
      setPicked(value);
      onChange(value);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={accept ?? ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv"}
          disabled={disabled || busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Paperclip className="size-4" />
          )}
          {busy ? "Uploading…" : picked?.attachmentName ? "Replace file" : "Choose file"}
        </Button>
        {picked?.attachmentName &&
          (picked.attachmentId ? (
            // Saved attachment — the name is a clickable link that opens the
            // stored document (auth-gated signed URL from Convex storage).
            <AttachmentLink id={picked.attachmentId} name={picked.attachmentName} />
          ) : (
            <span className="flex max-w-[16rem] items-center gap-1.5 truncate text-xs text-muted-foreground">
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate" data-tip={picked.attachmentName} data-tip-truncate>
                {picked.attachmentName}
              </span>
            </span>
          ))}
        {picked && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPicked(null);
              onChange(null);
            }}
          >
            Remove
          </Button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-xs leading-snug font-medium text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/** Compact "view document" link for a record's stored attachment. Resolves
 *  the storage id into a signed URL through the auth-gated query. */
export function AttachmentLink({
  id,
  name,
}: {
  id: string;
  name?: string | null;
}) {
  const url = useQuery(api.modules.getAttachmentUrl, {
    storageId: id as never,
  });
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline"
      data-tip={name ?? "View file"}
    >
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{name ?? "View file"}</span>
    </a>
  );
}
