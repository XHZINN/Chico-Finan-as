"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, pendingText, className, ...props }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
      data-pending={pending || undefined}
      {...props}
    >
      {pending && <span className="btn-spinner" aria-hidden="true" />}
      <span style={pending ? { visibility: "hidden" } : undefined}>
        {children}
      </span>
    </button>
  );
}
