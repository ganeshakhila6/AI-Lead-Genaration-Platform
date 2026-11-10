import { useEffect, useRef, useState } from "react";
import {
  File,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileUp,
  Eye,
  Image,
  MapPin,
  Music2,
  Search,
  Video,
  X,
} from "lucide-react";
import { indiaLocations } from "../../data/indiaLocations.js";

function extensionOf(name) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconFor(file) {
  const extension = extensionOf(file.name);
  if (
    file.type.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "heic"].includes(
      extension,
    )
  )
    return Image;
  if (
    file.type.startsWith("video/") ||
    ["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(extension)
  )
    return Video;
  if (
    file.type.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)
  )
    return Music2;
  if (["xlsx", "xls", "csv"].includes(extension)) return FileSpreadsheet;
  if (extension === "pdf") return FileText;
  if (["docx", "zip", "rar", "7z", "gz"].includes(extension))
    return FileArchive;
  return File;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows.slice(0, 7);
}

export default function FileUpload({
  onGenerateLeads,
  onImportLeads,
  generating = false,
}) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [leadCount, setLeadCount] = useState("20");
  const [selectedState, setSelectedState] = useState("Telangana");
  const [selectedCity, setSelectedCity] = useState("Hyderabad");
  const [targetingPrompt, setTargetingPrompt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");

  function addFiles(fileList) {
    const incoming = Array.from(fileList);
    const supported = incoming.filter((file) =>
      [".csv", ".xlsx", ".pdf", ".jpg", ".jpeg"].includes(
        `.${extensionOf(file.name)}`,
      ),
    );
    const isReference = (file) =>
      [".pdf", ".jpg", ".jpeg"].includes(`.${extensionOf(file.name)}`);
    const references = supported.filter(isReference);
    const existingReference = files.some(isReference);
    const hasTooManyReferences =
      references.length > 1 || (existingReference && references.length > 0);
    const accepted = hasTooManyReferences
      ? supported.filter((file) => !isReference(file))
      : supported;
    setFileError(
      supported.length !== incoming.length
        ? "Supported files: CSV/XLSX contact lists and PDF/JPG/JPEG reference files."
        : hasTooManyReferences
          ? "Attach one PDF or JPG reference per discovery run."
          : "",
    );
    const existing = new Set(files.map((file) => `${file.name}-${file.size}`));
    const unique = accepted.filter(
      (file) => !existing.has(`${file.name}-${file.size}`),
    );
    if (unique.length) {
      setFiles((current) => [...current, ...unique]);
      setPreview(null);
    }
  }

  async function previewFile(file) {
    const extension = extensionOf(file.name);
    const isCsv = extension === "csv";
    const isText = file.type.startsWith("text/") || isCsv;
    const isPdf = file.type === "application/pdf" || extension === "pdf";
    const isImage =
      file.type.startsWith("image/") ||
      ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension);
    const isVideo =
      file.type.startsWith("video/") ||
      ["mp4", "mov", "m4v", "webm", "ogv"].includes(extension);
    const isAudio =
      file.type.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension);

    if (isImage || isVideo || isAudio || isPdf) {
      setPreview({
        name: file.name,
        file,
        kind: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "pdf",
      });
      return;
    }

    if (!isText) {
      setPreview({
        name: file.name,
        file,
        kind: "download",
        error:
          "This file is selected and can be downloaded, but its format has no built-in browser preview. Backend extraction support depends on the configured service.",
      });
      return;
    }

    try {
      const text = await file.text();
      setPreview({
        name: file.name,
        kind: isCsv ? "table" : "text",
        rows: isCsv
          ? parseCsv(text)
          : text.split(/\r?\n/).slice(0, 50).map((line) => [line]),
      });
    } catch (error) {
      setPreview({
        name: file.name,
        error:
          error instanceof Error
            ? `Could not read this file: ${error.message}`
            : "Could not read this file.",
      });
    }
  }

  function removeFile(fileToRemove) {
    setFiles((current) =>
      current.filter(
        (file) =>
          file.name !== fileToRemove.name || file.size !== fileToRemove.size,
      ),
    );
    if (
      preview?.name === fileToRemove.name &&
      preview?.file?.size === fileToRemove.size
    )
      setPreview(null);
  }

  useEffect(() => {
    if (!preview?.file) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(preview.file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview?.file]);

  return (
    <section
      aria-labelledby="upload-title"
      className="rounded-xl border border-line bg-white shadow-panel"
      id="source-files"
    >
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink" id="upload-title">
              Source files
            </h2>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {files.length} selected
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Upload your source files, choose a market, and define the prospects
            you want to discover.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 sm:self-center">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          CSV / XLSX · PDF / JPG
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <button
            type="button"
            className={`flex min-h-[180px] w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
              dragging
                ? "border-brand-500 bg-brand-50"
                : "border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/50"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
              <FileUp size={20} />
            </span>
            <span className="mt-3 text-xs font-semibold text-slate-700">
              Drop source files here or{" "}
              <span className="text-brand-600">browse files</span>
            </span>
            <span className="mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
              CSV/XLSX contact lists or one PDF/JPG discovery reference.
            </span>
          </button>

          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm">
                <MapPin size={16} />
              </span>
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Where should we search?
                </h3>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  This location is added to the discovery search criteria.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                  htmlFor="lead-state"
                >
                  State
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  id="lead-state"
                  onChange={(event) => {
                    const nextState = event.target.value;
                    setSelectedState(nextState);
                    setSelectedCity(indiaLocations[nextState][0]);
                  }}
                  value={selectedState}
                >
                  {Object.keys(indiaLocations)
                    .sort((left, right) => left.localeCompare(right))
                    .map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                  htmlFor="lead-city"
                >
                  City
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-xs text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  id="lead-city"
                  onChange={(event) => setSelectedCity(event.target.value)}
                  value={selectedCity}
                >
                  {[...indiaLocations[selectedState]]
                    .sort((left, right) => left.localeCompare(right))
                    .map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                    ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              Select a state first. The city list is limited to that state and
              is applied automatically to discovery.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          aria-label="Choose source files"
          className="sr-only"
          multiple
          onChange={(event) => {
            addFiles(event.target.files ?? []);
            event.target.value = "";
          }}
          accept=".csv,.xlsx,.pdf,.jpg,.jpeg,text/csv,application/pdf,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          type="file"
        />
        {fileError && (
          <p className="mt-3 text-xs text-rose-700" role="alert">
            {fileError}
          </p>
        )}
        {files.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {files.map((file, index) => {
              const FileIcon = iconFor(file);
              return (
                <li
                  className="flex items-center gap-3 px-3 py-3"
                  key={`${file.name}-${file.size}-${index}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <FileIcon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-700">
                      {file.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                      {formatSize(file.size)}
                      <span className="text-slate-300">•</span>
                      {["pdf", "jpg", "jpeg"].includes(extensionOf(file.name))
                        ? "Ready as discovery reference"
                        : "Ready to import"}
                    </span>
                  </span>
                  <button
                    aria-label={`Preview ${file.name}`}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink"
                    onClick={() => previewFile(file)}
                    type="button"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    aria-label={`Remove ${file.name}`}
                    className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => removeFile(file)}
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-slate-700"
              htmlFor="lead-targeting-prompt"
            >
              Lead search prompt
            </label>
            <textarea
              className="min-h-24 w-full rounded-lg border border-line px-3 py-2 text-xs leading-5 text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              id="lead-targeting-prompt"
              maxLength={2000}
              onChange={(event) => setTargetingPrompt(event.target.value)}
              placeholder="Example: Find independent music schools with multiple teachers that offer online classes."
              value={targetingPrompt}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Describe the industry and lead qualities you want. The selected
              location is applied automatically.
            </p>
          </div>
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-slate-700"
              htmlFor="lead-target-count"
            >
              Number of leads
            </label>
            <input
              className="h-10 w-full rounded-lg border border-line px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              id="lead-target-count"
              max="100"
              min="1"
              onChange={(event) => setLeadCount(event.target.value)}
              type="number"
              value={leadCount}
            />
            <p className="mt-1 text-[10px] text-slate-500">Choose 1–100.</p>
          </div>
        </div>

        {preview && (
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line bg-slate-50 px-3 py-2">
              <span className="truncate text-xs font-medium text-slate-700">
                Preview · {preview.name}
              </span>
              <button
                aria-label="Close preview"
                className="ml-3 rounded p-1 text-slate-500 hover:bg-white"
                onClick={() => setPreview(null)}
                type="button"
              >
                <X size={14} />
              </button>
            </div>
            {preview.error ? (
              <div className="px-3 py-3">
                <p className="text-xs leading-5 text-amber-800">
                  {preview.error}
                </p>
                {previewUrl && (
                  <a
                    className="mt-2 inline-flex text-xs font-medium text-brand-700 hover:underline"
                    download={preview.name}
                    href={previewUrl}
                  >
                    Download selected file
                  </a>
                )}
              </div>
            ) : preview.kind === "image" && previewUrl ? (
              <div className="flex max-h-80 justify-center bg-slate-50 p-3">
                <img
                  alt={`Preview of ${preview.name}`}
                  className="max-h-72 max-w-full object-contain"
                  onError={() =>
                    setPreview((current) =>
                      current
                        ? {
                            ...current,
                            error:
                              "This image format cannot be previewed by this browser.",
                          }
                        : current,
                    )
                  }
                  src={previewUrl}
                />
              </div>
            ) : preview.kind === "video" && previewUrl ? (
              <video
                className="max-h-80 w-full bg-black"
                controls
                onError={() =>
                  setPreview((current) =>
                    current
                      ? {
                          ...current,
                          error:
                            "This video format cannot be played by this browser.",
                        }
                      : current,
                  )
                }
                src={previewUrl}
              >
                Your browser cannot play this video format.
              </video>
            ) : preview.kind === "audio" && previewUrl ? (
              <div className="p-4">
                <audio
                  className="w-full"
                  controls
                  onError={() =>
                    setPreview((current) =>
                      current
                        ? {
                            ...current,
                            error:
                              "This audio format cannot be played by this browser.",
                          }
                        : current,
                    )
                  }
                  src={previewUrl}
                >
                  Your browser cannot play this audio format.
                </audio>
              </div>
            ) : preview.kind === "pdf" && previewUrl ? (
              <iframe
                className="h-80 w-full"
                src={previewUrl}
                title={`Preview of ${preview.name}`}
              />
            ) : preview.kind === "text" ? (
              <div className="max-h-52 overflow-auto px-3 py-2">
                <pre className="whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-600">
                  {preview.rows.map((row) => row[0]).join("\n")}
                </pre>
              </div>
            ) : preview.kind === "table" && preview.rows ? (
              <div className="max-h-52 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <tbody>
                    {preview.rows.map((row, rowIndex) => (
                      <tr
                        className="border-b border-line last:border-0"
                        key={`${preview.name}-${rowIndex}`}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            className={`max-w-64 px-3 py-2 ${
                              rowIndex === 0
                                ? "font-semibold text-slate-700"
                                : "text-slate-600"
                            }`}
                            key={`${rowIndex}-${cellIndex}`}
                          >
                            <span className="block truncate">{cell}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-3 py-4 text-xs text-slate-500">
                Preparing preview…
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] leading-4 text-slate-500">
            PDF/JPG/JPEG references guide discovery; only CSV/XLSX files are
            imported as existing contacts.
          </p>
          <div className="flex flex-wrap gap-2">
            {files.some((file) =>
              [".csv", ".xlsx"].includes(`.${extensionOf(file.name)}`),
            ) && (
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={generating}
                onClick={() =>
                  onImportLeads(
                    files.filter((file) =>
                      [".csv", ".xlsx"].includes(`.${extensionOf(file.name)}`),
                    ),
                  )
                }
                type="button"
              >
                <FileUp size={15} />
                Import contacts
              </button>
            )}
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                generating ||
                !Number.isInteger(Number(leadCount)) ||
                Number(leadCount) < 1 ||
                Number(leadCount) > 100
              }
              onClick={() => {
                const referenceFile = files.find((file) =>
                  [".pdf", ".jpg", ".jpeg"].includes(
                    `.${extensionOf(file.name)}`,
                  ),
                );
                onGenerateLeads({
                  leadCount: Number(leadCount),
                  targetingPrompt: [
                    `Location: ${selectedCity}, ${selectedState}.`,
                    targetingPrompt.trim(),
                  ]
                    .filter(Boolean)
                    .join(" "),
                  referenceFile,
                });
              }}
              type="button"
            >
              <Search size={15} />
              {generating ? "Generating…" : "Generate leads"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
