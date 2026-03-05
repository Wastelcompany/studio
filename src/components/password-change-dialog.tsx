
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function PasswordChangeDialog({ isOpen, onOpenChange }: PasswordChangeDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Nieuwe wachtwoorden komen niet overeen.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Wachtwoord moet minimaal 6 tekens bevatten.' });
      return;
    }

    setIsPending(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Niet ingelogd");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      toast({ title: 'Wachtwoord bijgewerkt', description: 'Uw wachtwoord is succesvol gewijzigd.' });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      let msg = "Kon wachtwoord niet wijzigen.";
      if (error.code === 'auth/wrong-password') msg = "Huidig wachtwoord is onjuist.";
      toast({ variant: 'destructive', title: 'Fout', description: msg });
    } finally {
      setIsPending(false);
    }
  };

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wachtwoord Wijzigen</DialogTitle>
          <DialogDescription>
            Voer uw huidige wachtwoord en het nieuwe wachtwoord in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Huidig wachtwoord</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Nieuw wachtwoord</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Bevestig nieuw wachtwoord</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuleren</Button>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bijwerken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
