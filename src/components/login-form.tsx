"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    if (username.toLowerCase() === 'admin') {
      router.push('/admin');
    } else {
      // For now, we just redirect. No real user switching is happening.
      // The username could be stored in localStorage for future use if needed.
      router.push('/dashboard');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            <span className="text-primary">Chem</span>Stats Login
          </CardTitle>
          <CardDescription>
            Voer een gebruikersnaam in om door te gaan. Gebruik 'admin' voor beheerdersrechten.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Gebruikersnaam</Label>
            <Input
              id="username"
              type="text"
              placeholder="bijv. gebruiker1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleLogin} disabled={!username}>
            <LogIn className="mr-2 h-4 w-4" />
            Inloggen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
