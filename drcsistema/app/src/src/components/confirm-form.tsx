"use client";

export function ConfirmForm({
  action,
  confirmMessage,
  children,
  className,
}: {
  action: (formData: FormData) => void;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
