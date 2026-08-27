"use client";

import { useRouter } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";

export function BackButton({ label = "Voltar" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-drc-green-700 hover:text-drc-green-900"
    >
      <IconChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
