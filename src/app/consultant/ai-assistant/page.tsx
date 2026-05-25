'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConsultantAiAssistantPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/consultant/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center font-mono text-xs text-zinc-955">
      Disabling AI Assistant Module... Redirecting to dashboard.
    </div>
  );
}
