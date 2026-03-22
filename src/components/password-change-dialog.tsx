'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useSupabase } from '@/supabase/provider';

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function PasswordChangeDialog({ isOpen, onOpenChange }: PasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();
  const { supabase } = useSupabase();

  const handleUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Wachtwoorden komen niet overeen.' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Wachtwoord moet minimaal 6 tekens bevatten.' });
      return;
    }
    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ variant: 'destructive', title: 'Fout', description: 'Kon wachtwoord niet wijzigen.' });
    } else {
      toast({ title: 'Wachtwoord bijgewerkt', description: 'Uw wachtwoord is succesvol gewijzigd.' });
      onOpenChange(false);
      setNewPassword(''); setConfirmPassword('');
    }
    setIsPending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Wachtwoord Wijzigen</DialogTitle>
          <DialogDescription>Voer uw nieuwe wachtwoord in.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">Nieuw wachtwoord</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-password">Bevestig wachtwoord</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleUpdate} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
