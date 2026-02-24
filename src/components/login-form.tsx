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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  FirebaseError,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';


const formSchema = z.object({
  email: z.string().email({ message: 'Voer een geldig e-mailadres in.' }),
  password: z.string().min(6, { message: 'Wachtwoord moet minimaal 6 tekens lang zijn.' }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
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
      case 'auth/email-already-in-use':
        title = 'Registratie Mislukt';
        description = 'Dit e-mailadres is al in gebruik.';
        break;
      case 'auth/weak-password':
        title = 'Registratie Mislukt';
        description = 'Het wachtwoord is te zwak. Gebruik minimaal 6 tekens.';
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
      if (activeTab === 'login') {
        await signInWithEmailAndPassword(auth, data.email, data.password);

        if (data.email.toLowerCase() === 'post@wastelcompany.eu') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          createdAt: serverTimestamp(),
        });
        
        toast({
            title: "Registratie succesvol",
            description: "U wordt nu doorgestuurd naar het dashboard.",
        });
        router.push('/dashboard');
      }
    } catch (error) {
      if (error instanceof FirebaseError) {
        handleAuthError(error);
      } else {
        toast({ variant: 'destructive', title: 'Fout', description: 'Er is een onverwachte fout opgetreden.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Tabs value={activeTab} className="w-full max-w-sm" onValueChange={(value) => {
          setActiveTab(value);
          reset();
      }}>
        <Card>
          <CardHeader>
             <CardTitle className="text-2xl">
                <span className="text-primary">Chem</span>Stats
             </CardTitle>
             <CardDescription>
                Log in of maak een nieuw account aan om door te gaan.
             </CardDescription>
          </CardHeader>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Inloggen</TabsTrigger>
            <TabsTrigger value="signup">Registreren</TabsTrigger>
          </TabsList>
          <form onSubmit={handleSubmit(onSubmit)}>
            <TabsContent value="login">
              <CardContent className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-login">E-mailadres</Label>
                  <Input id="email-login" type="email" placeholder="naam@voorbeeld.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-login">Wachtwoord</Label>
                  <Input id="password-login" type="password" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Bezig...' : <><LogIn className="mr-2 h-4 w-4" /> Inloggen</>}
                </Button>
              </CardFooter>
            </TabsContent>
            <TabsContent value="signup">
               <CardContent className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-signup">E-mailadres</Label>
                  <Input id="email-signup" type="email" placeholder="naam@voorbeeld.com" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password-signup">Wachtwoord</Label>
                  <Input id="password-signup" type="password" {...register('password')} />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Bezig...' : <><UserPlus className="mr-2 h-4 w-4" /> Registreren</>}
                </Button>
              </CardFooter>
            </TabsContent>
          </form>
        </Card>
      </Tabs>
    </div>
  );
}
