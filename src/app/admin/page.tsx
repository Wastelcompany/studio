'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Users } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Adminpaneel</CardTitle>
          <CardDescription>
            Deze pagina is voor het beheer van de applicatie en gebruikers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              De functionaliteit om een overzicht van alle gebruikers te zien is in ontwikkeling. Dit vereist uitgebreidere beheerdersrechten (custom claims) die in een volgende stap geconfigureerd zullen worden.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Uitloggen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
