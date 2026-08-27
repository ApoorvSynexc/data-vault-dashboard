import { useRef, useState } from 'react';

// Same ad-hoc useState+setTimeout toast pattern already used elsewhere in the
// app (e.g. BackupManagementV2/AddBackup/steps/Step6.tsx) — there's no shared
// toast system/library in this codebase, so this isn't a new one, just that
// same local convention factored out for its two consumers here
// (ByObjectScope and ByFieldScope) instead of duplicated twice.
export function useAutoSelectToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (msg: string) => {
    setMessage(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 4000);
  };

  return { toastMessage: message, showToast };
}
