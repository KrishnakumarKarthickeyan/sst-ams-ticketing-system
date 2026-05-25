'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConsultantKnowledgebasePageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/consultant/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center font-mono text-xs text-zinc-950">
      Disabling Knowledgebase Module... Redirecting to dashboard.
    </div>
  );
}
