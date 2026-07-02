'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/supabase/provider';
import { useTable } from '@/supabase/hooks';
import type { UserProfile, Company, Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog, Building2, Briefcase, BrainCircuit, Plus, ShieldCheck, UserPlus, FileText, Save } from "lucide-react";
import { format, startOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createCustomerRecord, toggleUserDisabledStatus, updateUserRole } from "@/lib/admin";

export default function AdminPage() {
  const router = useRouter();
  const { supabase, user, isUserLoading, userProfile } = useSupabase();
  const { toast } = useToast();

  const isAdmin = user?.email === 'post@wastelcompany.eu' || user?.email === 'admin@chemstats.nl' || user?.email === 'ai@spawnp.nl' || userProfile?.role === 'admin';

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

  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingUserCustomerId, setEditingUserCustomerId] = useState('');
  const [isUpdatingUserCustomer, setIsUpdatingUserCustomer] = useState(false);

  const { data: users, isLoading: isLoadingUsers } = useTable<UserProfile>('user_profiles', isAdmin ? {} : null);
  const { data: companies, isLoading: isLoadingCompanies } = useTable<Company>('companies', isAdmin ? {} : null);
  const { data: customers, isLoading: isLoadingCustomers } = useTable<Customer>('customers', isAdmin ? {} : null);
  const { data: aiLogs, isLoading: isLoadingAiLogs } = useTable<any>('ai_usage_logs', isAdmin ? { orderBy: 'timestamp', ascending: false, limit: 500 } : null);
  const { data: templates, isLoading: isLoadingTemplates } = useTable<any>('report_templates', isAdmin ? {} : null);

  const [isSavingTemplate, setIsSavingTemplate] = useState<string | null>(null);

  const aiStats = useMemo(() => {
    if (!aiLogs) return { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0, monthlyBreakdown: [] };

    const totals = aiLogs.reduce((acc: any, log: any) => ({
      totalCalls: acc.totalCalls + 1,
      estimatedCost: acc.estimatedCost + (log.estimated_cost || 0),
      extractionCount: acc.extractionCount + (log.type === 'SDS_EXTRACTION' ? 1 : 0),
      kvkCount: acc.kvkCount + (log.type === 'KVK_SEARCH' ? 1 : 0),
    }), { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0 });

    const monthlyGroups: Record<string, number> = {};
    aiLogs.forEach((log: any) => {
      if (!log.timestamp) return;
      const date = new Date(log.timestamp);
      const monthKey = format(startOfMonth(date), 'yyyy-MM');
      monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + (log.estimated_cost || 0);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName) return;
    setIsCreatingCustomer(true);
    try {
      await createCustomerRecord(supabase, { name: newCustomerName, address: newCustomerAddress, kvkNumber: newCustomerKvk });
      toast({ title: "Klant aangemaakt" });
      setIsCustomerDialogOpen(false);
      setNewCustomerName(''); setNewCustomerAddress(''); setNewCustomerKvk('');
    } catch (e) {
      toast({ variant: "destructive", title: "Fout bij aanmaken" });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword || !newUserCustomerId) {
      toast({ variant: "destructive", title: "Incomplete gegevens" });
      return;
    }
    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
        user_metadata: {
          customer_id: newUserCustomerId,
          role: 'user',
        }
      });
      if (error) throw error;
      const customer = customers?.find((c: any) => c.id === newUserCustomerId);
      if (data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: newUserEmail,
          customer_id: newUserCustomerId,
          customer_name: customer?.name || newUserEmail,
          disabled: false,
          role: 'user',
        }, { onConflict: 'id' });
      }
      toast({ title: "Gebruiker aangemaakt" });
      setIsUserDialogOpen(false);
      setNewUserEmail(''); setNewUserPassword(''); setNewUserCustomerId('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout bij aanmaken", description: error.message });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUserCustomer = async () => {
    if (!editingUser || !editingUserCustomerId) return;
    setIsUpdatingUserCustomer(true);
    try {
      const customer = customers?.find((c: any) => c.id === editingUserCustomerId);
      await supabase.from('user_profiles').update({
        customer_id: editingUserCustomerId,
        customer_name: customer?.name || 'Onbekend'
      }).eq('id', editingUser.id);
      toast({ title: "Klantgroep gewijzigd" });
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      setEditingUserCustomerId('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout bij wijzigen", description: error.message });
    } finally {
      setIsUpdatingUserCustomer(false);
    }
  };

  const handleUpdateTemplate = async (templateId: string, newContent: string) => {
    setIsSavingTemplate(templateId);
    try {
      const { error } = await supabase
        .from('report_templates')
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
      toast({ title: "Sjabloon opgeslagen" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Fout bij opslaan", description: error.message });
    } finally {
      setIsSavingTemplate(null);
    }
  };

  if (isUserLoading || (isAdmin && (isLoadingUsers || isLoadingCompanies || isLoadingCustomers || isLoadingTemplates))) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Beheercentrum</h1>
            <p className="text-muted-foreground">Beheer klanten, gebruikers en AI-verbruik.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline">
                <Briefcase className="mr-2 h-4 w-4" /> Naar Dashboard
              </Button>
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Uitloggen
            </Button>
          </div>
        </div>

        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-[750px]">
            <TabsTrigger value="customers"><Briefcase className="h-4 w-4 mr-2" /> Klanten</TabsTrigger>
            <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-2" /> Vestigingen</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /> Gebruikers</TabsTrigger>
            <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" /> Sjablonen</TabsTrigger>
            <TabsTrigger value="ai"><BrainCircuit className="h-4 w-4 mr-2" /> AI Verbruik</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Klanten</CardTitle>
                  <CardDescription>Facturatie-entiteiten.</CardDescription>
                </div>
                <Button onClick={() => setIsCustomerDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Klant Toevoegen
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Klantnaam</TableHead>
                        <TableHead>KVK</TableHead>
                        <TableHead>Adres</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.kvk_number || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.address || '-'}</TableCell>
                          <TableCell className="text-xs">{c.created_at ? format(new Date(c.created_at), 'dd-MM-yyyy') : '-'}</TableCell>
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
                <CardTitle>Vestigingen</CardTitle>
                <CardDescription>Alle locaties.</CardDescription>
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
                      {companies?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{customers?.find((cust: any) => cust.id === c.customer_id)?.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{c.address || '-'}</TableCell>
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
                  <CardDescription>Beheer rollen en toegang.</CardDescription>
                </div>
                <Button onClick={() => setIsUserDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Gebruiker Toevoegen
                </Button>
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
                      {users?.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{u.customer_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                              {u.role === 'admin' ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                              {u.role === 'admin' ? 'Admin' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={u.disabled ? 'destructive' : 'secondary'}>
                              {u.disabled ? 'Geblokt' : 'Actief'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(u);
                                setEditingUserCustomerId(u.customer_id || '');
                                setIsEditUserDialogOpen(true);
                              }}
                            >
                              Aanpassen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserRole(supabase, u.id, u.role === 'admin' ? 'user' : 'admin')}
                              disabled={u.email === 'post@wastelcompany.eu'}
                            >
                              {u.role === 'admin' ? 'Maak User' : 'Maak Admin'}
                            </Button>
                            <Button
                              size="sm"
                              variant={u.disabled ? 'default' : 'destructive'}
                              onClick={() => toggleUserDisabledStatus(supabase, u.id, u.disabled)}
                              disabled={u.email === 'post@wastelcompany.eu'}
                            >
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

          <TabsContent value="templates" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Volledige Rapportage</CardTitle>
                  <CardDescription>Sjablonen voor het complete Seveso/ARIE rapport.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templates?.filter((t: any) => t.report_type === 'full').map((t: any) => (
                    <div key={t.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase">{t.label}</Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2"
                          onClick={() => {
                            const val = (document.getElementById(`template-${t.id}`) as HTMLTextAreaElement).value;
                            handleUpdateTemplate(t.id, val);
                          }}
                          disabled={isSavingTemplate === t.id}
                        >
                          {isSavingTemplate === t.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          Opslaan
                        </Button>
                      </div>
                      <Textarea 
                        id={`template-${t.id}`}
                        defaultValue={t.content} 
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                  ))}
                  {(!templates || templates.filter((t: any) => t.report_type === 'full').length === 0) && (
                    <p className="text-sm text-muted-foreground italic">Geen sjablonen gevonden. Voer eerst de database setup uit.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seveso Rapport</CardTitle>
                  <CardDescription>Sjablonen voor de beknopte Seveso-only weergave.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templates?.filter((t: any) => t.report_type === 'seveso').map((t: any) => (
                    <div key={t.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase">{t.label}</Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2"
                          onClick={() => {
                            const val = (document.getElementById(`template-${t.id}`) as HTMLTextAreaElement).value;
                            handleUpdateTemplate(t.id, val);
                          }}
                          disabled={isSavingTemplate === t.id}
                        >
                          {isSavingTemplate === t.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          Opslaan
                        </Button>
                      </div>
                      <Textarea 
                        id={`template-${t.id}`}
                        defaultValue={t.content} 
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                  ))}
                  {(!templates || templates.filter((t: any) => t.report_type === 'seveso').length === 0) && (
                    <p className="text-sm text-muted-foreground italic">Geen sjablonen gevonden. Voer eerst de database setup uit.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1">TOTAAL</div><div className="text-2xl font-bold">{aiStats.totalCalls}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1">KOSTEN</div><div className="text-2xl font-bold">${aiStats.estimatedCost.toFixed(2)}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1">SDS</div><div className="text-2xl font-bold">{aiStats.extractionCount}</div></CardContent></Card>
                <Card><CardContent className="pt-6"><div className="text-sm font-medium text-muted-foreground mb-1">KVK</div><div className="text-2xl font-bold">{aiStats.kvkCount}</div></CardContent></Card>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Per Maand</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Maand</TableHead><TableHead className="text-right">Kosten</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {aiStats.monthlyBreakdown.map((m: any) => (
                          <TableRow key={m.key}>
                            <TableCell className="capitalize">{m.display}</TableCell>
                            <TableCell className="text-right font-bold">${m.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-lg">Recent Gebruik</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow><TableHead>Tijd</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Kosten</TableHead></TableRow>
                        </TableHeader>
                        <TableBody>
                          {aiLogs?.map((l: any) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs">{l.timestamp ? format(new Date(l.timestamp), 'dd-MM HH:mm') : '-'}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px]">{l.type}</Badge></TableCell>
                              <TableCell className="text-right text-xs">${l.estimated_cost?.toFixed(3)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
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
            <div className="grid gap-2"><Label>KVK-nummer</Label><Input value={newCustomerKvk} onChange={(e) => setNewCustomerKvk(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateCustomer} disabled={isCreatingCustomer}>
              {isCreatingCustomer && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gebruiker Toevoegen</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>E-mail</Label><Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Wachtwoord</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Klantgroep</Label>
              <Select value={newUserCustomerId} onValueChange={setNewUserCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddUser} disabled={isCreatingUser}>
              {isCreatingUser && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Gebruiker Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gebruiker Aanpassen</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <div className="text-sm font-medium">{editingUser?.email}</div>
            </div>
            <div className="grid gap-2">
              <Label>Klantgroep</Label>
              <Select value={editingUserCustomerId} onValueChange={setEditingUserCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditUserCustomer} disabled={isUpdatingUserCustomer}>
              {isUpdatingUserCustomer && <Loader2 className="animate-spin h-4 w-4 mr-2" />} Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
