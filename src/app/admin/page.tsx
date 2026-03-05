
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore, useAuth } from '@/firebase';
import { collection, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { UserProfile, Company, Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog, Building2, Briefcase, BrainCircuit, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { format, startOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createCustomerRecord, toggleUserDisabledStatus, updateUserRole } from "@/lib/admin";

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerKvk, setNewCustomerKvk] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserCustomerId, setNewUserCustomerId] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const isAdmin = user?.email === 'post@wastelcompany.eu' || (user as any)?.role === 'admin';

  const usersQuery = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return collection(db, 'users');
  }, [user, isAdmin, db]);

  const companiesQuery = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return collection(db, 'companies');
  }, [user, isAdmin, db]);

  const customersQuery = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return collection(db, 'customers');
  }, [user, isAdmin, db]);

  const aiLogsQuery = useMemoFirebase(() => {
    if (!user || !isAdmin) return null;
    return query(collection(db, 'ai_usage_logs'), orderBy('timestamp', 'desc'), limit(500));
  }, [user, isAdmin, db]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const { data: aiLogs, isLoading: isLoadingAiLogs } = useCollection<any>(aiLogsQuery);

  const aiStats = useMemo(() => {
    if (!aiLogs) return { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0, monthlyBreakdown: [] };
    
    const totals = aiLogs.reduce((acc, log) => ({
      totalCalls: acc.totalCalls + 1,
      estimatedCost: acc.estimatedCost + (log.estimatedCost || 0),
      extractionCount: acc.extractionCount + (log.type === 'SDS_EXTRACTION' ? 1 : 0),
      kvkCount: acc.kvkCount + (log.type === 'KVK_SEARCH' ? 1 : 0),
    }), { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0 });

    const monthlyGroups: Record<string, number> = {};
    aiLogs.forEach(log => {
      if (!log.timestamp?.toDate) return;
      const date = log.timestamp.toDate();
      const monthKey = format(startOfMonth(date), 'yyyy-MM');
      monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + (log.estimatedCost || 0);
    });

    const monthlyBreakdown = Object.entries(monthlyGroups)
      .map(([key, cost]) => ({
        key,
        display: format(new Date(key), 'MMMM yyyy', { locale: nl }),
        cost
      }))
      .sort((a, b) => b.key.localeCompare(a.key));

    return { ...totals, monthlyBreakdown };
  }, [aiLogs]);

  const handleLogout = () => {
    signOut(auth).then(() => {
        router.push('/');
    });
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName) return;
    setIsCreatingCustomer(true);
    try {
      await createCustomerRecord(db, {
        name: newCustomerName,
        address: newCustomerAddress,
        kvkNumber: newCustomerKvk
      });
      toast({ title: "Klant aangemaakt", description: `${newCustomerName} is succesvol toegevoegd.` });
      setIsCustomerDialogOpen(false);
      setNewCustomerName('');
      setNewCustomerAddress('');
      setNewCustomerKvk('');
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij aanmaken", description: "Kon de klant niet opslaan." });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserCustomerId) {
      toast({ variant: "destructive", title: "Incomplete gegevens", description: "Vul alle velden in." });
      return;
    }
    
    setIsCreatingUser(true);
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCred = await createUserWithEmailAndPassword(tempAuth, newUserEmail, newUserPassword);
      const customer = customers?.find(c => c.id === newUserCustomerId);
      
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid: userCred.user.uid,
        email: newUserEmail,
        customerId: newUserCustomerId,
        customerName: customer?.name || newUserEmail,
        disabled: false,
        role: 'user',
        createdAt: serverTimestamp()
      });

      toast({ title: "Gebruiker aangemaakt", description: `${newUserEmail} is succesvol toegevoegd.` });
      setIsUserDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserCustomerId('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout bij aanmaken", description: error.message });
    } finally {
      await deleteApp(tempApp);
      setIsCreatingUser(false);
    }
  };

  const handleToggleAdmin = async (u: UserProfile) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(db, u.uid, newRole);
      toast({ title: "Rol bijgewerkt", description: `${u.email} is nu een ${newRole}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon de rol niet wijzigen." });
    }
  };

  const handleToggleDisabled = async (u: UserProfile) => {
    try {
      await toggleUserDisabledStatus(db, u.uid, u.disabled);
      toast({ title: "Status bijgewerkt", description: `Account van ${u.email} is ${!u.disabled ? 'gedeactiveerd' : 'geactiveerd'}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Fout", description: "Kon de status niet wijzigen." });
    }
  };

  if (isUserLoading || (isAdmin && (isLoadingUsers || isLoadingCompanies || isLoadingCustomers))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 text-center">
        <Card className="max-w-md w-full">
            <CardHeader>
                <UserCog className="w-12 h-12 text-destructive mx-auto mb-4" />
                <CardTitle>Geen Toegang</CardTitle>
                <CardDescription>U heeft geen beheerdersrechten.</CardDescription>
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
                <p className="text-muted-foreground">Beheer van klanten, gebruikers en AI-verbruik.</p>
            </div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Uitloggen</Button>
        </div>

        <Tabs defaultValue="customers" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
                <TabsTrigger value="customers"><Briefcase className="h-4 w-4 mr-2" /> Klanten</TabsTrigger>
                <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-2" /> Vestigingen</TabsTrigger>
                <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /> Gebruikers</TabsTrigger>
                <TabsTrigger value="ai"><BrainCircuit className="h-4 w-4 mr-2" /> AI Verbruik</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Klanten</CardTitle>
                          <CardDescription>Facturatie-entiteiten in het systeem.</CardDescription>
                        </div>
                        <Button onClick={() => setIsCustomerDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Klant Toevoegen</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                              <TableHead>Klantnaam</TableHead>
                              <TableHead>KVK</TableHead>
                              <TableHead>Adres</TableHead>
                              <TableHead>Aangemaakt op</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customers?.map((customer) => (
                              <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.kvkNumber || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{customer.address || '-'}</TableCell>
                                <TableCell className="text-xs">
                                  {customer.createdAt?.toDate ? format(customer.createdAt.toDate(), 'dd-MM-yyyy') : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="companies" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Vestigingen / Bedrijven</CardTitle>
                        <CardDescription>Alle locaties gekoppeld aan klanten.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                              <TableHead>Bedrijfsnaam</TableHead>
                              <TableHead>Klant</TableHead>
                              <TableHead>Adres</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {companies?.map((company) => (
                              <TableRow key={company.id}>
                                <TableCell className="font-medium">{company.name}</TableCell>
                                <TableCell>{customers?.find(c => c.id === company.customerId)?.name || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-xs">{company.address || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Gebruikersbeheer</CardTitle>
                          <CardDescription>Beheer rollen en toegang voor alle gebruikers.</CardDescription>
                        </div>
                        <Button onClick={() => setIsUserDialogOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Gebruiker Toevoegen</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                              <TableHead>E-mail</TableHead>
                              <TableHead>Klantgroep</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Acties</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users?.map((u) => (
                              <TableRow key={u.uid}>
                                <TableCell className="font-medium">{u.email}</TableCell>
                                <TableCell>{u.customerName || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                                    {u.role === 'admin' ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                                    {u.role === 'admin' ? 'Admin' : 'User'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={u.disabled ? 'destructive' : 'secondary'}>
                                    {u.disabled ? 'Gedeactiveerd' : 'Actief'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button size="sm" variant="outline" onClick={() => handleToggleAdmin(u)} disabled={u.email === 'post@wastelcompany.eu'}>
                                    {u.role === 'admin' ? 'Maak User' : 'Maak Admin'}
                                  </Button>
                                  <Button size="sm" variant={u.disabled ? 'default' : 'destructive'} onClick={() => handleToggleDisabled(u)} disabled={u.email === 'post@wastelcompany.eu'}>
                                    {u.disabled ? 'Activeer' : 'Blokkeer'}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1 uppercase">Aanroepen</div><div className="text-2xl font-bold">{aiStats.totalCalls}</div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1 uppercase">Kosten (est.)</div><div className="text-2xl font-bold">${aiStats.estimatedCost.toFixed(2)}</div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1 uppercase">SDS Analyses</div><div className="text-2xl font-bold">{aiStats.extractionCount}</div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1 uppercase">KVK Zoeks</div><div className="text-2xl font-bold">{aiStats.kvkCount}</div></CardContent></Card>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card><CardHeader><CardTitle className="text-lg">Kosten per Maand</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Maand</TableHead><TableHead className="text-right">Kosten</TableHead></TableRow></TableHeader><TableBody>{aiStats.monthlyBreakdown.map(m => (<TableRow key={m.key}><TableCell className="capitalize">{m.display}</TableCell><TableCell className="text-right font-mono font-bold">${m.cost.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
                    <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-lg">Recent Verbruik</CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[400px]"><Table><TableHeader className="sticky top-0 bg-background z-10"><TableRow><TableHead>Tijdstip</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Kosten</TableHead></TableRow></TableHeader><TableBody>{aiLogs?.map(log => (<TableRow key={log.id}><TableCell className="text-xs">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd-MM HH:mm') : '-'}</TableCell><TableCell><Badge variant="outline" className="text-[10px]">{log.type}</Badge></TableCell><TableCell className="text-right font-mono text-xs">${log.estimatedCost?.toFixed(3)}</TableCell></TableRow>))}</TableBody></Table></ScrollArea></CardContent></Card>
                  </div>
                </div>
            </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Klant Toevoegen</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Klantnaam</Label><Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Adres</Label><Input value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} /></div>
            <div className="grid gap-2"><Label>KVK</Label><Input value={newCustomerKvk} onChange={(e) => setNewCustomerKvk(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateCustomer} disabled={isCreatingCustomer}>{isCreatingCustomer && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Opslaan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gebruiker Toevoegen</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>E-mail</Label><Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Tijdelijk Wachtwoord</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Koppelen aan Klant</Label>
              <Select value={newUserCustomerId} onValueChange={setNewUserCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecteer klant..." /></SelectTrigger>
                <SelectContent>{customers?.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddUser} disabled={isCreatingUser}>{isCreatingUser && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Aanmaken</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
