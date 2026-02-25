'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog, Pencil, UserX, UserCheck, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { toggleUserDisabledStatus, updateUserGroup, deleteUserAndData } from '@/lib/admin';

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
  
  const handleOpenGroupDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setNewGroupName(user.customerName || '');
    setIsGroupDialogOpen(true);
  }

  const handleOpenDeleteDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }

  const handleToggleDisable = async (userToToggle: UserProfile) => {
    if (!db) return;
    setIsUpdating(true);
    try {
        await toggleUserDisabledStatus(db, userToToggle.uid, userToToggle.disabled);
        toast({
            title: "Gebruiker bijgewerkt",
            description: `${userToToggle.email} is ${userToToggle.disabled ? 'geactiveerd' : 'gedeactiveerd'}.`
        });
    } catch(error) {
        toast({ variant: 'destructive', title: "Fout", description: "Kon gebruiker niet bijwerken." });
    } finally {
        setIsUpdating(false);
    }
  }

  const handleSaveGroup = async () => {
    if (!selectedUser || !newGroupName.trim() || !db) return;

    setIsUpdating(true);
    try {
      await updateUserGroup(db, selectedUser, newGroupName.trim());
      toast({
          title: "Groep bijgewerkt",
          description: `${selectedUser.email} is nu onderdeel van groep '${newGroupName.trim()}'.`
      });
      setIsGroupDialogOpen(false);
    } catch(error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Fout", description: "Kon de gebruikersgroep niet bijwerken." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !db) return;
    setIsUpdating(true);
    try {
      await deleteUserAndData(db, selectedUser);
       toast({
          title: "Gebruiker Verwijderd",
          description: `Het profiel en alle data van ${selectedUser.email} zijn verwijderd.`,
      });
      setIsDeleteDialogOpen(false);
    } catch(error) {
       console.error(error);
      toast({ variant: 'destructive', title: "Fout", description: "Kon de gebruiker en diens data niet verwijderen." });
    } finally {
        setIsUpdating(false);
    }
  }

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
    
    const sortedUsers = users?.sort((a, b) => {
      if (a.email === 'post@wastelcompany.eu') return -1;
      if (b.email === 'post@wastelcompany.eu') return 1;
      return (a.customerName || '').localeCompare(b.customerName || '') || a.email.localeCompare(b.email);
    }) ?? [];
    
    if (sortedUsers.length === 0) {
        return <p className="text-center text-muted-foreground">Geen gebruikers gevonden.</p>
    }

    return (
        <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Klantgroep</TableHead>
                        <TableHead>Geregistreerd op</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedUsers.map((u) => (
                        <TableRow key={u.uid} className={u.disabled ? 'bg-muted/50' : ''}>
                            <TableCell className="font-medium">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {u.customerName}
                            </TableCell>
                            <TableCell>
                                {u.createdAt?.seconds ? format(new Date(u.createdAt.seconds * 1000), 'dd-MM-yyyy HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell>
                               {u.email === 'post@wastelcompany.eu' ? (
                                    <Badge variant="default" className="bg-primary/80">Admin</Badge>
                                ) : u.disabled ? (
                                    <Badge variant="destructive">Gedeactiveerd</Badge>
                                ) : (
                                    <Badge variant="secondary">Actief</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                              {u.email !== 'post@wastelcompany.eu' && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenGroupDialog(u)} disabled={isUpdating} title="Groep aanpassen">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleToggleDisable(u)} disabled={isUpdating} title={u.disabled ? 'Activeren' : 'Deactiveren'}>
                                      {u.disabled ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4 text-destructive" />}
                                  </Button>
                                   <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteDialog(u)} disabled={isUpdating} title="Gebruiker verwijderen">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
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
      <Card className="w-full max-w-6xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Gebruikersbeheer</CardTitle>
          <CardDescription>
            Overzicht van alle geregistreerde gebruikers en hun groepen.
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
      
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Klantgroep aanpassen</DialogTitle>
                <DialogDescription>
                    Pas de klantgroep aan voor {selectedUser?.email}. Gebruikers in dezelfde groep kunnen elkaars bedrijven zien.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="group-name" className="text-right">
                        Groepsnaam
                    </Label>
                    <Input
                        id="group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Annuleren</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveGroup} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Opslaan
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet u het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit verwijdert het profiel en alle bijbehorende data van <span className="font-bold">{selectedUser?.email}</span> permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ja, verwijder gebruiker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
