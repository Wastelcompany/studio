'use client';

import { useState, useMemo } from 'react';
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
import { Loader2, LogOut, Users, UserCog, Pencil, UserX, UserCheck, Trash2, Building2, Search, X, Briefcase, Plus, MapPin, Hash } from "lucide-react";
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
import { toggleUserDisabledStatus, updateUserGroup, deleteUserAndData, createCompanyFromKvk, renameCustomerGroup } from '@/lib/admin';
import { deleteCompanyFromDb } from '@/lib/companies';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getShortId } from '@/lib/utils';
import { kvkSearch, type KvkSearchOutput } from '@/ai/flows/kvk-search-flow';

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false);
  const [isKvkDialogOpen, setIsKvkDialogOpen] = useState(false);
  const [isRenameGroupDialogOpen, setIsRenameGroupDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // KVK Search State
  const [kvkQuery, setKvkQuery] = useState('');
  const [isSearchingKvk, setIsSearchingKvk] = useState(false);
  const [kvkResults, setKvkResults] = useState<KvkSearchOutput['results']>([]);
  const [selectedKvkResult, setSelectedKvkResult] = useState<KvkSearchOutput['results'][0] | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState('');

  // Per-column filters
  const [userFilters, setUserFilters] = useState({ email: "", group: "", status: "" });
  const [companyFilters, setCompanyFilters] = useState({ name: "", group: "", owner: "" });
  const [customerFilters, setCustomerFilters] = useState({ name: "", users: "", companies: "" });

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

  const customerGroups = useMemo(() => {
    if (!users) return [];
    const groups: Record<string, { id: string, name: string, userCount: number, companyCount: number }> = {};
    
    users.forEach(u => {
      if (!groups[u.customerId]) {
        groups[u.customerId] = { id: u.customerId, name: u.customerName || 'Geen naam', userCount: 0, companyCount: 0 };
      }
      groups[u.customerId].userCount++;
    });

    companies?.forEach(c => {
      if (groups[c.customerId]) {
        groups[c.customerId].companyCount++;
      }
    });

    return Object.values(groups);
  }, [users, companies]);

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

  const handleOpenRenameGroupDialog = (customerId: string, currentName: string) => {
    setSelectedCustomerId(customerId);
    setNewGroupName(currentName);
    setIsRenameGroupDialogOpen(true);
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

  const handleRenameGroup = async () => {
    if (!selectedCustomerId || !newGroupName.trim() || !db) return;
    setIsUpdating(true);
    try {
      await renameCustomerGroup(db, selectedCustomerId, newGroupName.trim());
      toast({ title: "Klantgroep hernoemd", description: `De groep is nu '${newGroupName.trim()}'.` });
      setIsRenameGroupDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: "Fout", description: "Kon de groep niet hernoemen." });
    } finally {
      setIsUpdating(false);
    }
  }

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

  const handleKvkSearch = async () => {
    if (!kvkQuery.trim()) return;
    setIsSearchingKvk(true);
    try {
      const result = await kvkSearch({ query: kvkQuery });
      setKvkResults(result.results);
      if (result.results.length === 0) {
        toast({ title: "Geen resultaten", description: "Geen bedrijven gevonden voor deze zoekopdracht." });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: "Zoekfout", description: "Kon niet zoeken in KVK register." });
    } finally {
      setIsSearchingKvk(false);
    }
  };

  const handleAddCompanyFromKvk = async () => {
    if (!selectedKvkResult || !targetCustomerId || !db || !user) return;
    setIsUpdating(true);
    try {
      await createCompanyFromKvk(db, user.uid, targetCustomerId, {
        name: selectedKvkResult.name,
        address: selectedKvkResult.address
      });
      toast({ title: "Bedrijf toegevoegd", description: `${selectedKvkResult.name} is geregistreerd.` });
      setIsKvkDialogOpen(false);
      // Reset
      setKvkResults([]);
      setSelectedKvkResult(null);
      setKvkQuery('');
    } catch (error) {
      toast({ variant: 'destructive', title: "Fout", description: "Kon bedrijf niet toevoegen." });
    } finally {
      setIsUpdating(false);
    }
  };

  const renderUsersTable = () => {
    const filteredUsers = (users || [])
      .filter(u => {
          const matchEmail = !userFilters.email || u.email.toLowerCase().includes(userFilters.email.toLowerCase());
          const matchGroup = !userFilters.group || (u.customerName || '').toLowerCase().includes(userFilters.group.toLowerCase());
          const matchStatus = !userFilters.status || (
              (userFilters.status === 'admin' && u.email === 'post@wastelcompany.eu') ||
              (userFilters.status === 'actief' && !u.disabled && u.email !== 'post@wastelcompany.eu') ||
              (userFilters.status === 'gedeactiveerd' && u.disabled)
          );
          return matchEmail && matchGroup && matchStatus;
      })
      .sort((a, b) => {
        if (a.email === 'post@wastelcompany.eu') return -1;
        if (b.email === 'post@wastelcompany.eu') return 1;
        return (a.customerName || '').localeCompare(b.customerName || '') || a.email.localeCompare(b.email);
      });

    const hasUserFilters = userFilters.email || userFilters.group || userFilters.status;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-muted-foreground">{filteredUsers.length} resultaten</span>
                {hasUserFilters && (
                    <Button variant="ghost" size="sm" onClick={() => setUserFilters({ email: "", group: "", status: "" })} className="h-8 text-xs">
                        <X className="mr-2 h-3 w-3" /> Filters wissen
                    </Button>
                )}
            </div>
            <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Email</span>
                                    <Input 
                                        placeholder="Filter email..." 
                                        value={userFilters.email} 
                                        onChange={(e) => setUserFilters(prev => ({ ...prev, email: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Klantgroep</span>
                                    <Input 
                                        placeholder="Filter groep..." 
                                        value={userFilters.group} 
                                        onChange={(e) => setUserFilters(prev => ({ ...prev, group: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Registratie</span>
                                    <div className="h-7" />
                                </div>
                            </TableHead>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Status</span>
                                    <Input 
                                        placeholder="Filter status..." 
                                        value={userFilters.status} 
                                        onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="text-right py-3">
                                <div className="h-7" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Geen gebruikers gevonden.</TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((u) => (
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
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
  };

  const renderCompaniesTable = () => {
    const filteredCompanies = (companies || [])
      .filter(c => {
        const owner = users?.find(u => u.uid === c.userId);
        const matchName = !companyFilters.name || c.name.toLowerCase().includes(companyFilters.name.toLowerCase()) || getShortId(c.id).includes(companyFilters.name);
        const matchGroup = !companyFilters.group || (owner?.customerName || '').toLowerCase().includes(companyFilters.group.toLowerCase());
        const matchOwner = !companyFilters.owner || (owner?.email || '').toLowerCase().includes(companyFilters.owner.toLowerCase());
        return matchName && matchGroup && matchOwner;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const hasCompanyFilters = companyFilters.name || companyFilters.group || companyFilters.owner;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-muted-foreground">{filteredCompanies.length} resultaten</span>
                {hasCompanyFilters && (
                    <Button variant="ghost" size="sm" onClick={() => setCompanyFilters({ name: "", group: "", owner: "" })} className="h-8 text-xs">
                        <X className="mr-2 h-3 w-3" /> Filters wissen
                    </Button>
                )}
                <Button onClick={() => setIsKvkDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Nieuw bedrijf (KVK)
                </Button>
            </div>
            <ScrollArea className="h-[500px]">
                <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Bedrijf / ID</span>
                                    <Input 
                                        placeholder="Filter naam/ID..." 
                                        value={companyFilters.name} 
                                        onChange={(e) => setCompanyFilters(prev => ({ ...prev, name: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Klantgroep</span>
                                    <Input 
                                        placeholder="Filter groep..." 
                                        value={companyFilters.group} 
                                        onChange={(e) => setCompanyFilters(prev => ({ ...prev, group: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="py-3">
                                <div className="space-y-1">
                                    <span className="text-xs font-bold uppercase tracking-wider">Eigenaar</span>
                                    <Input 
                                        placeholder="Filter eigenaar..." 
                                        value={companyFilters.owner} 
                                        onChange={(e) => setCompanyFilters(prev => ({ ...prev, owner: e.target.value }))}
                                        className="h-7 text-xs bg-background"
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="text-right py-3">
                                <div className="h-7" />
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCompanies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Geen bedrijven gevonden.</TableCell>
                            </TableRow>
                        ) : (
                            filteredCompanies.map((c) => {
                                const owner = users?.find(u => u.uid === c.userId);
                                return (
                                    <TableRow key={c.id}>
                                        <TableCell>
                                            <div className="font-medium">{c.name}</div>
                                            <div className="font-mono text-[10px] text-primary font-bold">[{getShortId(c.id)}]</div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {owner?.customerName || 'Onbekend'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {owner?.email || 'Admin / Onbekend'}
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
                            })
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
  };

  const renderCustomersTable = () => {
    const filteredCustomers = customerGroups
      .filter(g => {
        const matchName = !customerFilters.name || g.name.toLowerCase().includes(customerFilters.name.toLowerCase());
        const matchUsers = !customerFilters.users || g.userCount.toString().includes(customerFilters.users);
        const matchCompanies = !customerFilters.companies || g.companyCount.toString().includes(customerFilters.companies);
        return matchName && matchUsers && matchCompanies;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const hasCustomerFilters = customerFilters.name || customerFilters.users || customerFilters.companies;

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-muted-foreground">{filteredCustomers.length} resultaten</span>
          {hasCustomerFilters && (
            <Button variant="ghost" size="sm" onClick={() => setCustomerFilters({ name: "", users: "", companies: "" })} className="h-8 text-xs">
              <X className="mr-2 h-3 w-3" /> Filters wissen
            </Button>
          )}
        </div>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow>
                <TableHead className="py-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Klant / Groepsnaam</span>
                    <Input 
                      placeholder="Filter naam..." 
                      value={customerFilters.name} 
                      onChange={(e) => setCustomerFilters(prev => ({ ...prev, name: e.target.value }))}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Gebruikers</span>
                    <Input 
                      placeholder="#" 
                      value={customerFilters.users} 
                      onChange={(e) => setCustomerFilters(prev => ({ ...prev, users: e.target.value }))}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </TableHead>
                <TableHead className="py-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider">Bedrijven</span>
                    <Input 
                      placeholder="#" 
                      value={customerFilters.companies} 
                      onChange={(e) => setCustomerFilters(prev => ({ ...prev, companies: e.target.value }))}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right py-3">
                  <div className="h-7" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Geen klanten gevonden.</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {g.name}
                      <div className="text-[10px] text-muted-foreground font-mono">ID: {g.id}</div>
                    </TableCell>
                    <TableCell>{g.userCount}</TableCell>
                    <TableCell>{g.companyCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenRenameGroupDialog(g.id, g.name)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
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
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Uitloggen
                </Button>
            </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
                <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Gebruikers
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Klanten
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

            <TabsContent value="customers" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Klantgroepen</CardTitle>
                        <CardDescription>Beheer en groepeer gebruikers onder één klantnaam.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderCustomersTable()}
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

      <Dialog open={isRenameGroupDialogOpen} onOpenChange={setIsRenameGroupDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Groep Hernoemen</DialogTitle>
                <DialogDescription>
                    Pas de naam aan voor de volledige groep.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rename-group" className="text-right">Nieuwe Naam</Label>
                    <Input
                        id="rename-group"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsRenameGroupDialogOpen(false)}>Annuleren</Button>
                <Button onClick={handleRenameGroup} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Hernoemen
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* KVK Search Dialog */}
      <Dialog open={isKvkDialogOpen} onOpenChange={setIsKvkDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Nieuw Bedrijf Toevoegen (KVK)</DialogTitle>
            <DialogDescription>
              Zoek bedrijfsgegevens op via het KVK register en koppel deze aan een klantgroep.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex gap-2">
              <div className="flex-grow relative">
                <Input 
                  placeholder="KVK nummer of bedrijfsnaam..." 
                  value={kvkQuery}
                  onChange={(e) => setKvkQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleKvkSearch()}
                />
              </div>
              <Button onClick={handleKvkSearch} disabled={isSearchingKvk || !kvkQuery.trim()}>
                {isSearchingKvk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Zoek</span>
              </Button>
            </div>

            {kvkResults.length > 0 && (
              <div className="space-y-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Zoekresultaten</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {kvkResults.map((result, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedKvkResult(result)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${selectedKvkResult === result ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-bold">{result.name}</div>
                          <Badge variant="outline" className="font-mono">{result.kvkNumber}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {result.address}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectedKvkResult && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Koppel aan Klantgroep</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={targetCustomerId}
                    onChange={(e) => setTargetCustomerId(e.target.value)}
                  >
                    <option value="">Selecteer een groep...</option>
                    {customerGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsKvkDialogOpen(false)}>Annuleren</Button>
            <Button 
              onClick={handleAddCompanyFromKvk} 
              disabled={!selectedKvkResult || !targetCustomerId || isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Bedrijf Toevoegen
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
