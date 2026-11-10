import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const variants = {
  error: {
    icon: AlertCircle,
    color: "border-rose-200 bg-rose-50 text-rose-800",
  },
  success: {
    icon: CheckCircle2,
    color: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  info: { icon: Info, color: "border-blue-200 bg-blue-50 text-blue-800" },
};

export default function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  const { icon: Icon, color } = variants[type] ?? variants.info;
  return (
    <div
      className={`fixed bottom-5 right-5 z-[70] flex max-w-[min(26rem,calc(100vw-2.5rem))] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${color}`}
      role="status"
    >
      <Icon className="mt-0.5 shrink-0" size={17} />
      <p className="text-xs leading-5">{message}</p>
      <button
        aria-label="Dismiss notification"
        className="ml-auto rounded p-0.5 opacity-70 hover:opacity-100"
        onClick={onClose}
      >
        <X size={15} />
      </button>
    </div>
  );
}
