'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase, useFirestore, useAuth } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { UserProfile, Company, Customer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Users, UserCog, Building2, Briefcase, BrainCircuit, BarChart3 } from "lucide-react";
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const isAdmin = user?.email === 'post@wastelcompany.eu';

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
    return query(collection(db, 'ai_usage_logs'), orderBy('timestamp', 'desc'), limit(100));
  }, [user, isAdmin, db]);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersQuery);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const { data: customers, isLoading: isLoadingCustomers } = useCollection<Customer>(customersQuery);
  const { data: aiLogs, isLoading: isLoadingAiLogs } = useCollection<any>(aiLogsQuery);

  const aiStats = useMemo(() => {
    if (!aiLogs) return { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0 };
    return aiLogs.reduce((acc, log) => ({
      totalCalls: acc.totalCalls + 1,
      estimatedCost: acc.estimatedCost + (log.estimatedCost || 0),
      extractionCount: acc.extractionCount + (log.type === 'SDS_EXTRACTION' ? 1 : 0),
      kvkCount: acc.kvkCount + (log.type === 'KVK_SEARCH' ? 1 : 0),
    }), { totalCalls: 0, estimatedCost: 0, extractionCount: 0, kvkCount: 0 });
  }, [aiLogs]);

  const handleLogout = () => {
    signOut(auth).then(() => {
        router.push('/');
    });
  };

  const renderAiUsageTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Totale Aanroepen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Geschatte Kosten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${aiStats.estimatedCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">SDS Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.extractionCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">KVK Zoekopdrachten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiStats.kvkCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Recent Verbruik
          </CardTitle>
          <CardDescription>Overzicht van de laatste 100 AI-interacties.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tijdstip</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Kosten (est.)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'dd-MM-yyyy HH:mm:ss') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {log.type === 'SDS_EXTRACTION' ? 'SDS Extractie' : 'KVK Zoek'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground font-mono">{log.model}</TableCell>
                    <TableCell className="text-right font-mono text-xs">${log.estimatedCost?.toFixed(3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  if (isUserLoading || (isAdmin && (isLoadingUsers || isLoadingCompanies || isLoadingCustomers))) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                <p className="text-muted-foreground">Klanten, Vestigingen en AI-verbruik.</p>
            </div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Uitloggen</Button>
        </div>

        <Tabs defaultValue="customers" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
                <TabsTrigger value="customers" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Klanten
                </TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Vestigingen
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Gebruikers
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" /> AI Verbruik
                </TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Klanten (Facturatie-entiteiten)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Klantnaam</TableHead>
                            <TableHead>KVK</TableHead>
                            <TableHead>Adres</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers?.map((customer) => (
                            <TableRow key={customer.id}>
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell>{customer.kvkNumber || '-'}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{customer.address || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="companies" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Vestigingen / Bedrijven</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
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
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Gebruikersbeheer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Klantgroep</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users?.map((u) => (
                            <TableRow key={u.uid}>
                              <TableCell className="font-medium">{u.email}</TableCell>
                              <TableCell>{u.customerName || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={u.disabled ? 'destructive' : 'default'}>
                                  {u.disabled ? 'Gedeactiveerd' : 'Actief'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
                {renderAiUsageTab()}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
