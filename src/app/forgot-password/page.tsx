'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleClose = () => {
    router.push('/login');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 font-mono text-xs">
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-white border border-zinc-200 shadow-lg p-6 rounded-lg font-mono text-xs">
          <DialogHeader className="space-y-1 text-center sm:text-left">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-zinc-950">
              Password Reset Required
            </DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-550 pt-2 leading-relaxed">
              Please contact your Super Admin to reset your password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end">
            <Button
              onClick={handleClose}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded text-[10px] font-bold uppercase tracking-wider transition border-none cursor-pointer"
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
