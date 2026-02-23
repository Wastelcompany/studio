'use client';

import { useRouter } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog } from "lucide-react";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const isAdmin = user?.email === 'post@wastelcompany.eu';

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return collection(db, 'users');
  }, [isAdmin, db]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);

  const handleLogout = () => {
    signOut(auth).then(() => {
        router.push('/');
    });
  };

  const renderContent = () => {
    if (isUserLoading || (isAdmin && isLoadingUsers)) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="text-center space-y-4">
            <div className="flex justify-center">
              <UserCog className="w-12 h-12 text-destructive" />
            </div>
            <p className="text-muted-foreground">
              U heeft geen beheerdersrechten om deze pagina te bekijken.
            </p>
        </div>
      );
    }
    
    if (!users || users.length === 0) {
        return <p className="text-center text-muted-foreground">Geen gebruikers gevonden.</p>
    }

    return (
        <ScrollArea className="h-72">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>UID</TableHead>
                        <TableHead>Geregistreerd op</TableHead>
                        <TableHead className="text-right">Rol</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.sort((a, b) => a.email === 'post@wastelcompany.eu' ? -1 : (b.email === 'post@wastelcompany.eu' ? 1 : 0)).map((u) => (
                        <TableRow key={u.uid}>
                            <TableCell className="font-medium">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{u.uid}</TableCell>
                            <TableCell>
                                {u.createdAt?.seconds ? format(new Date(u.createdAt.seconds * 1000), 'dd-MM-yyyy HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                                {u.email === 'post@wastelcompany.eu' ? (
                                    <Badge variant="default" className="bg-primary/80">Admin</Badge>
                                ) : (
                                    <Badge variant="secondary">Gebruiker</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Gebruikersbeheer</CardTitle>
          <CardDescription>
            Overzicht van alle geregistreerde gebruikers in de applicatie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
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
