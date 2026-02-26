'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile, Company } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog, Pencil, UserX, UserCheck, Trash2, Building2, Search } from "lucide-react";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { deleteCompanyFromDb } from '@/lib/companies';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getShortId } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.email === 'post@wastelcompany.eu';

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return collection(db, 'users');
  }, [isAdmin, db]);

  const companiesQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return collection(db, 'companies');
  }, [isAdmin, db]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);

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

  const handleOpenDeleteUserDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteUserDialogOpen(true);
  }

  const handleOpenDeleteCompanyDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteCompanyDialogOpen(true);
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
          title: "Gebruikersdata Verwijderd",
          description: `De data van ${selectedUser.email} is verwijderd.`,
      });
      setIsDeleteUserDialogOpen(false);
    } catch(error) {
       console.error(error);
      toast({ variant: 'destructive', title: "Fout", description: "Kon de gebruiker niet verwijderen." });
    } finally {
        setIsUpdating(false);
    }
  }

  const handleDeleteCompany = async () => {
    if (!selectedCompany || !db) return;
    setIsUpdating(true);
    try {
      await deleteCompanyFromDb(db, selectedCompany.id);
      toast({
          title: "Bedrijf Verwijderd",
          description: `Bedrijf "${selectedCompany.name}" is verwijderd.`,
      });
      setIsDeleteCompanyDialogOpen(false);
    } catch(error) {
       console.error(error);
      toast({ variant: 'destructive', title: "Fout", description: "Kon het bedrijf niet verwijderen." });
    } finally {
        setIsUpdating(false);
    }
  }

  const renderUsersTable = () => {
    const filteredUsers = (users || [])
      .filter(u => 
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (a.email === 'post@wastelcompany.eu') return -1;
        if (b.email === 'post@wastelcompany.eu') return 1;
        return (a.customerName || '').localeCompare(b.customerName || '') || a.email.localeCompare(b.email);
      });

    if (filteredUsers.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Geen gebruikers gevonden.</p>
    }

    return (
        <ScrollArea className="h-[500px]">
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
                    {filteredUsers.map((u) => (
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
                                <div className="flex justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenGroupDialog(u)} disabled={isUpdating}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Groep aanpassen</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleToggleDisable(u)} disabled={isUpdating}>
                                            {u.disabled ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4 text-destructive" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{u.disabled ? 'Gebruiker activeren' : 'Gebruiker deactiveren'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteUserDialog(u)} disabled={isUpdating}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Gebruikersdata verwijderen</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
  };

  const renderCompaniesTable = () => {
    const filteredCompanies = (companies || [])
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (filteredCompanies.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Geen bedrijven gevonden.</p>
    }

    return (
        <ScrollArea className="h-[500px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nummer</TableHead>
                        <TableHead>Bedrijfsnaam</TableHead>
                        <TableHead>Klantgroep</TableHead>
                        <TableHead>Eigenaar (Email)</TableHead>
                        <TableHead className="text-right">Acties</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCompanies.map((c) => {
                        const owner = users?.find(u => u.uid === c.userId);
                        return (
                            <TableRow key={c.id}>
                                <TableCell className="font-mono text-xs font-bold text-primary">
                                    {getShortId(c.id)}
                                </TableCell>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {owner?.customerName || 'Onbekend'}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {owner?.email || 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleOpenDeleteCompanyDialog(c)} 
                                                    disabled={isUpdating}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Bedrijf verwijderen</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
    );
  };

  if (isUserLoading || (isAdmin && (isLoadingUsers || isLoadingCompanies))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Gegevens ophalen...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
            <CardHeader className="text-center">
                <UserCog className="w-12 h-12 text-destructive mx-auto mb-4" />
                <CardTitle>Geen Toegang</CardTitle>
                <CardDescription>
                    U heeft geen beheerdersrechten om deze pagina te bekijken.
                </CardDescription>
            </CardHeader>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={handleLogout}>Uitloggen</Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Beheercentrum</h1>
                <p className="text-muted-foreground">Beheer gebruikers, klantgroepen en bedrijfsgegevens.</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Zoeken..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px] md:w-[300px] bg-background"
                    />
                </div>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Uitloggen
                </Button>
            </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Gebruikers
                </TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Bedrijven
                </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Gebruikersbeheer</CardTitle>
                        <CardDescription>Overzicht van alle geregistreerde accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderUsersTable()}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="companies" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Bedrijfsoverzicht</CardTitle>
                        <CardDescription>Lijst van alle aangemaakte bedrijven en hun eigenaars.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderCompaniesTable()}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Klantgroep aanpassen</DialogTitle>
                <DialogDescription>
                    Pas de klantgroep aan voor {selectedUser?.email}.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="group-name" className="text-right">Groepsnaam</Label>
                    <Input
                        id="group-name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsGroupDialogOpen(false)}>Annuleren</Button>
                <Button onClick={handleSaveGroup} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Opslaan
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
                Dit verwijdert het profiel en alle bijbehorende data van <span className="font-bold">{selectedUser?.email}</span> permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verwijder Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCompanyDialogOpen} onOpenChange={setIsDeleteCompanyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
                Weet u zeker dat u het bedrijf <span className="font-bold">"{selectedCompany?.name}"</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verwijder Bedrijf
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
