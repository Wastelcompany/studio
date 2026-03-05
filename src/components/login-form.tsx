
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
} from 'firebase/auth';
import type { FirebaseError } from 'firebase/auth';

const formSchema = z.object({
  email: z.string().email({ message: 'Voer een geldig e-mailadres in.' }),
  password: z.string().min(6, { message: 'Wachtwoord moet minimaal 6 tekens lang zijn.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleAuthError = (error: FirebaseError) => {
    let title = 'Authenticatie Fout';
    let description = 'Er is een onbekende fout opgetreden.';

    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        title = 'Login Mislukt';
        description = 'E-mailadres of wachtwoord is onjuist.';
        break;
      case 'auth/user-disabled':
        title = 'Account Gedeactiveerd';
        description = 'Uw account is gedeactiveerd door een beheerder.';
        break;
      default:
        description = error.message;
        break;
    }
    toast({ variant: 'destructive', title, description });
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      if (data.email.toLowerCase() === 'post@wastelcompany.eu') {
          router.push('/admin');
      } else {
          router.push('/dashboard');
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        handleAuthError(error as FirebaseError);
      } else {
        toast({ variant: 'destructive', title: 'Fout', description: 'Er is een onverwachte fout opgetreden.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
           <CardTitle className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Chem</span>Stats
           </CardTitle>
           <CardDescription>
              Log in op uw account om de analyses te bekijken.
           </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label htmlFor="email-login">E-mailadres</Label>
              <Input id="email-login" type="email" placeholder="naam@voorbeeld.com" {...register('email')} disabled={isSubmitting} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-login">Wachtwoord</Label>
              <Input id="password-login" type="password" {...register('password')} disabled={isSubmitting} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Bezig...</> : <><LogIn className="mr-2 h-4 w-4" /> Inloggen</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
