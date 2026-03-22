'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';
import { useSupabase } from '@/supabase/provider';

const formSchema = z.object({
  email: z.string().email({ message: 'Voer een geldig e-mailadres in.' }),
  password: z.string().min(6, { message: 'Wachtwoord moet minimaal 6 tekens lang zijn.' }),
});
type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const router = useRouter();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    if (isSignUp) {
      // Sign up
      const { error } = await supabase.auth.signUp({ 
        email: data.email, 
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Signup Mislukt', description: error.message });
      } else {
        toast({ title: 'Account aangemaakt!', description: 'Je kunt nu inloggen.' });
        setIsSignUp(false);
      }
    } else {
      // Sign in
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) {
        let description = 'E-mailadres of wachtwoord is onjuist.';
        if (error.message.includes('disabled')) description = 'Uw account is gedeactiveerd door een beheerder.';
        toast({ variant: 'destructive', title: 'Login Mislukt', description });
        setIsSubmitting(false);
        return;
      }
      const adminEmails = ['post@wastelcompany.eu', 'admin@chemstats.nl'];
      if (adminEmails.includes(data.email.toLowerCase())) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Chem</span>Stats
          </CardTitle>
          <CardDescription>{isSignUp ? 'Account aanmaken' : 'Log in op uw account om de analyses te bekijken.'}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4 py-6">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" type="email" placeholder="naam@bedrijf.nl" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isSignUp ? 'Account aanmaken' : 'Inloggen'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Heb je al een account? Inloggen' : 'Geen account? Registreer hier'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
