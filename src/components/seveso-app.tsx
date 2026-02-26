
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Substance, ThresholdMode, Company, UserProfile } from '@/lib/types';
import SevesoHeader from '@/components/seveso-header';
import InventoryTable from '@/components/inventory-table';
import Dashboard from '@/components/dashboard';
import SdsUploadDialog from './sds-upload-dialog';
import ReferenceGuideDialog from './reference-guide-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CategoryExplanationDialog from './category-explanation-dialog';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateSummations, ALL_CATEGORIES, NAMED_SUBSTANCES, SEVESO_THRESHOLDS, ARIE_THRESHOLDS } from '@/lib/seveso';
import * as XLSX from 'xlsx';
import { useUser, useCollection, useMemoFirebase, useFirestore, useDoc, useAuth } from '@/firebase';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { createNewCompany, updateCompanyDetails, addSubstanceToDb, deleteSubstanceFromDb, updateSubstanceQuantityInDb, clearInventoryFromDb, deleteCompanyFromDb } from '@/lib/companies';
import { Loader2, UserX, LogOut, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import CompanySelector from './company-selector';

export default function SevesoApp() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isAuthLoading && !user) {
        router.push('/');
    }
  }, [isAuthLoading, user, router]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [user, db]);
  const { data: userProfile, isLoading: isLoadingUserProfile } = useDoc<UserProfile>(userProfileRef);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const companiesQuery = useMemoFirebase(() => {
    if (!userProfile?.customerId || userProfile?.disabled) return null;
    return query(collection(db, 'companies'), where('customerId', '==', userProfile.customerId));
  }, [userProfile, db]);

  const { data: companiesData, isLoading: isLoadingCompanies } = useCollection<Company>(companiesQuery);
  const companies = useMemo(() => companiesData?.sort((a, b) => a.name.localeCompare(b.name)) ?? [], [companiesData]);

  const inventoryQuery = useMemoFirebase(() => {
    if (!selectedCompanyId) return null;
    return collection(db, 'companies', selectedCompanyId, 'inventory');
  }, [selectedCompanyId, db]);

  const { data: firestoreInventory, isLoading: isLoadingInventory } = useCollection<Substance>(inventoryQuery);

  const [localInventory, setLocalInventory] = useState<Substance[]>([]);
  
  useEffect(() => {
    if (firestoreInventory) {
      setLocalInventory(firestoreInventory);
    } else {
      setLocalInventory([]);
    }
  }, [firestoreInventory, selectedCompanyId]);

  const [thresholdMode, setThresholdMode] = useState<ThresholdMode>('low');
  
  const [isSdsUploadOpen, setIsSdsUploadOpen] = useState(false);
  const [isReferenceGuideOpen, setIsReferenceGuideOpen] = useState(false);
  const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
  const [isDeleteCompanyAlertOpen, setIsDeleteCompanyAlertOpen] = useState(false);
  
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const { toast, dismiss } = useToast();

  const [explanationData, setExplanationData] = useState<{ substance: Substance | null; categoryId: string | null; type: 'seveso' | 'arie' | null }>({ substance: null, categoryId: null, type: null });
  
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
  };

  const handleCreateNewCompany = () => {
    if (!user || !db || !userProfile) return;
    createNewCompany(db, user.uid, userProfile.customerId).then(newCompany => {
      if (newCompany) {
        setSelectedCompanyId(newCompany.id);
      }
    });
  };

  const handleCompanyDetailsChange = (details: Partial<Company>) => {
      if (!selectedCompanyId || !db) return;
      updateCompanyDetails(db, selectedCompanyId, details);
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  const handleShowExplanation = (substanceId: string, categoryId: string, type: 'seveso' | 'arie') => {
    const substance = localInventory.find(sub => sub.id === substanceId);
    if (substance) {
      setExplanationData({ substance, categoryId, type });
    }
  };

  const generateFileName = (extension: string) => {
    const date = new Date();
    const YYYYMMDD = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const sanitizedName = (selectedCompany?.name || 'Naamloos').replace(/[^a-z0-9]/gi, '_');
    const sanitizedAddress = (selectedCompany?.address || 'Adresloos').replace(/[^a-z0-9]/gi, '_');
    return `${sanitizedName}.${sanitizedAddress}.${YYYYMMDD}.${extension}`;
  };

  const handleSaveAsPdf = async (reportType: 'full' | 'seveso_only') => {
    if (!selectedCompany) return;
    const includeArie = reportType === 'full';
    setIsSavingPdf(true);
    const toastTitle = includeArie ? "Volledig PDF rapport genereren..." : "Seveso PDF rapport genereren...";
    const { id: toastId } = toast({
        title: toastTitle,
        description: "Rapport wordt samengesteld.",
    });

    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const fullContentWidth = pageWidth - (margin * 2);
        let finalY = 18;

        const colors = {
            primary: [22, 80, 91], foreground: [58, 66, 78], destructive: [239, 68, 68], muted: [100, 116, 139], bgLight: [248, 250, 252], border: [226, 232, 240]
        };

        const addFooter = (pdfDoc: jsPDF) => {
            const totalPages = (pdfDoc as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdfDoc.setPage(i);
                pdfDoc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                pdfDoc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                pdfDoc.setFontSize(8);
                pdfDoc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                pdfDoc.text(`Pagina ${i} van ${totalPages}`, margin, pageHeight - 12);
                pdfDoc.setFont('helvetica', 'bold');
                pdfDoc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                pdfDoc.text("ChemStats", pageWidth - margin, pageHeight - 12, { align: 'right' });
                pdfDoc.setFont('helvetica', 'normal');
                pdfDoc.setFontSize(7);
                const footerText = includeArie
                  ? "Gevaarlijke Stoffen Analyse - Seveso en ARIE drempelwaarde check"
                  : "Gevaarlijke Stoffen Analyse - Seveso drempelwaarde check";
                pdfDoc.text(footerText, pageWidth - margin, pageHeight - 8, { align: 'right' });
            }
        };

        const checkPageBreak = (needed: number) => {
          if (finalY + needed > pageHeight - 25) {
            doc.addPage();
            finalY = 20;
            return true;
          }
          return false;
        };

        const addMainHeader = (text: string) => {
            checkPageBreak(15);
            doc.setFontSize(11);
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(text, margin, finalY);
            finalY += 8;
        };

        const addSubHeader = (text: string) => {
            checkPageBreak(12);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            doc.text(text, margin, finalY);
            finalY += 6;
        };

        const addBodyText = (text: string) => {
            const splitText = doc.splitTextToSize(text, fullContentWidth);
            checkPageBreak(splitText.length * 5 + 5);
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            doc.text(splitText, margin, finalY);
            finalY += (splitText.length * 5) + 6;
        };

        // Header
        doc.setFontSize(22);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(includeArie ? "Seveso en ARIE Rapportage" : "Seveso Rapportage", margin, finalY);
        finalY += 7;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
        const subTitle = includeArie
          ? "Gevaarlijke Stoffen Analyse - Seveso en ARIE drempelwaarde check"
          : "Gevaarlijke Stoffen Analyse - Seveso drempelwaarde check";
        doc.text(subTitle, margin, finalY);
        finalY += 6;
        doc.setFontSize(9);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`Gegenereerd op ${new Date().toLocaleDateString('nl-NL')}`, margin, finalY);
        finalY += 8;

        // Bedrijfsgegevens box
        if (selectedCompany.name || selectedCompany.address) {
            doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
            doc.rect(margin, finalY, fullContentWidth, 20, 'F');
            let detailsY = finalY + 6;
            doc.setFontSize(10);
            doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
            doc.setFont('helvetica', 'bold');
            doc.text("Bedrijfsgegevens", margin + 5, detailsY);
            doc.setFont('helvetica', 'normal');
            detailsY += 5;
            if (selectedCompany.name) { doc.text(selectedCompany.name, margin + 5, detailsY); detailsY += 4.5; }
            if (selectedCompany.address) { doc.text(selectedCompany.address, margin + 5, detailsY); }
            finalY += 30;
        }

        const stats = calculateSummations(localInventory, thresholdMode);

        // --- 1. Inleiding en Kaderstelling ---
        addMainHeader("1. Inleiding en Kaderstelling");
        addBodyText(`Binnen de bedrijfsvoering van ${selectedCompany.name || 'het bedrijf'} op de aangegeven locatie wordt gewerkt met diverse gevaarlijke stoffen. Om de veiligheidsrisico's voor zowel de omgeving als de eigen medewerkers te beheersen en te minimaliseren, is de inrichting onderworpen aan specifieke wettelijke kaders. Deze rapportage heeft tot doel de actuele status van de locatie te toetsen aan de hand van de volgende twee regelgevingen:`);
        
        addSubHeader("1.1 De Seveso-richtlijn (Omgevingswet / Bal)");
        addBodyText("De Seveso-III richtlijn is gericht op het voorkomen van zware ongevallen waarbij gevaarlijke stoffen betrokken zijn en het beperken van de gevolgen daarvan voor de menselijke gezondheid en het milieu. In de Nederlandse wetgeving is dit sinds de invoering van de Omgevingswet ondergebracht in het Besluit activiteiten leefomgeving (Bal). De focus ligt hierbij primair op de externe veiligheid: het risico voor de omgeving buiten de inrichtingsgrenzen.");

        addSubHeader("1.2 De ARIE-regeling (Arbo-wetgeving)");
        addBodyText("De regeling Aanvullende Risico-Inventarisatie en -Evaluatie (ARIE) is verankerd in het Arbeidsomstandighedenbesluit (Hoofdstuk 2, Afdeling 2). Waar de Seveso-richtlijn naar buiten kijkt, richt de ARIE-regeling zich op de interne veiligheid. Het doel is werknemers te beschermen tegen de gevolgen van zware ongevallen op de werkvloer. De ARIE fungeert vaak als een vangnet voor risicovolle situaties die net onder de Seveso-drempels blijven of waarbij stoffen betrokken zijn die specifiek binnen een arbeidsomgeving een groot risico vormen.");

        // --- 2. De Beoordelingssystematiek ---
        addMainHeader("2. De Beoordelingssystematiek");
        addBodyText("Om te bepalen of een inrichting onder een van deze kaders valt, wordt een vaste systematiek gevolgd waarbij de intrinsieke eigenschappen van stoffen worden vertaald naar risicocategorieën.");

        addSubHeader("2.1 Indeling op basis van H-zinnen");
        addBodyText("De basis voor de indeling zijn de gevarenaanduidingen (H-zinnen) zoals vermeld op het Veiligheidsinformatieblad (SDS) van elk product. Deze gegevens bepalen in welke 'gevarengroep' (Gezondheid, Fysisch of Milieu) een stof wordt ingedeeld.");

        addSubHeader("2.2 De Sommatieregeling");
        addBodyText("Voor de uiteindelijke statusbepaling wordt de sommatieregel toegepast. Per gevarengroep wordt de aanwezige hoeveelheid van een stof vergeleken met de wettelijke drempelwaarde voor die categorie (de zogenaamde 'fractie'). De fracties van alle stoffen binnen één categorie worden bij elkaar opgeteld. Indien de som van deze fracties de waarde 1,0 (100%) bereikt of overschrijdt, is het betreffende wettelijke regime van kracht.");

        // --- 3. Resultaten ---
        addMainHeader("3. Resultaten");
        finalY += 2;

        const isSevesoExceeded = stats.overallStatus !== 'Geen';
        
        // Status boxes
        const boxWidth = (fullContentWidth - 8) / 2;
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]); 
        doc.setFillColor(255, 255, 255); 
        doc.roundedRect(margin, finalY, boxWidth, 20, 1.5, 1.5, 'FD');
        doc.setFontSize(9); 
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]); 
        doc.text("Seveso Status", margin + 5, finalY + 7);
        doc.setFontSize(11); 
        doc.setTextColor(isSevesoExceeded ? colors.destructive[0] : colors.primary[0], isSevesoExceeded ? colors.destructive[1] : colors.primary[1], isSevesoExceeded ? colors.destructive[2] : colors.primary[2]); 
        doc.setFont('helvetica', 'bold'); 
        doc.text(stats.overallStatus === 'Geen' ? 'Geen Seveso-inrichting' : `${stats.overallStatus}-inrichting`, margin + 5, finalY + 14);

        if (includeArie) {
          doc.setFillColor(255, 255, 255); 
          doc.roundedRect(margin + boxWidth + 8, finalY, boxWidth, 20, 1.5, 1.5, 'FD');
          doc.setFontSize(9); 
          doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]); 
          doc.text("ARIE Status", margin + boxWidth + 13, finalY + 7);
          doc.setFontSize(11); 
          doc.setTextColor(stats.arieExceeded ? colors.destructive[0] : colors.foreground[0], stats.arieExceeded ? colors.destructive[1] : colors.foreground[1], stats.arieExceeded ? colors.destructive[2] : colors.foreground[2]); 
          doc.setFont('helvetica', 'bold'); 
          doc.text(stats.arieExceeded ? 'ARIE-plichtig' : 'Niet ARIE-plichtig', margin + boxWidth + 13, finalY + 14);
        }
        finalY += 28;

        const drawDashboardColumn = (title: string, groups: any[], isArie: boolean, x: number, y: number, width: number) => {
            let currentY = y; 
            doc.setFontSize(10); 
            doc.setTextColor(isArie ? colors.foreground[0] : colors.primary[0], isArie ? colors.foreground[1] : colors.primary[1], isArie ? colors.foreground[2] : colors.primary[2]); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(title, x, currentY); 
            currentY += 6;
            groups.forEach(group => {
                const ratio = group.totalRatio; 
                const percentage = Math.round(ratio * 100); 
                const isExceeded = ratio >= 1;
                doc.setFontSize(8.5); 
                doc.setTextColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]); 
                doc.setFont('helvetica', 'normal'); 
                doc.text(group.name, x, currentY);
                doc.setFont('helvetica', 'bold'); 
                doc.setTextColor(isExceeded ? colors.destructive[0] : colors.foreground[0], isExceeded ? colors.destructive[1] : colors.foreground[1], isExceeded ? colors.destructive[2] : colors.foreground[2]); 
                doc.text(`${percentage}%`, x + width, currentY, { align: 'right' });
                currentY += 2.5; 
                const barHeight = 2.2; 
                doc.setFillColor(241, 245, 249); 
                doc.roundedRect(x, currentY, width, barHeight, 0.5, 0.5, 'F');
                if (ratio > 0) {
                    const fillWidth = Math.min(ratio, 1) * width;
                    if (isExceeded) doc.setFillColor(colors.destructive[0], colors.destructive[1], colors.destructive[2]);
                    else if (isArie) doc.setFillColor(colors.foreground[0], colors.foreground[1], colors.foreground[2]);
                    else doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                    doc.roundedRect(x, currentY, fillWidth, barHeight, 0.5, 0.5, 'F');
                }
                currentY += 8.5;
            });
            return currentY;
        };

        if (includeArie) {
            const colWidth = (fullContentWidth - 15) / 2;
            const startSommatieY = finalY;
            const endSevesoY = drawDashboardColumn("Seveso Sommatie", stats.summationGroups, false, margin, startSommatieY, colWidth);
            const endArieY = drawDashboardColumn("ARIE Sommatie", stats.arieSummationGroups, true, margin + colWidth + 15, startSommatieY, colWidth);
            finalY = Math.max(endSevesoY, endArieY) + 12;
        } else {
            finalY = drawDashboardColumn("Seveso Sommatie", stats.summationGroups, false, margin, finalY, fullContentWidth) + 12;
        }

        // --- 4. Conclusie ---
        addMainHeader("4. Conclusie");

        addSubHeader("4.1 Seveso");
        const sevesoMaxRatio = Math.max(...stats.summationGroups.map(g => g.totalRatio));
        const marginValue = Math.max(0, 100 - Math.round(sevesoMaxRatio * 100));
        
        if (!isSevesoExceeded) {
            addBodyText(`Op basis van de uitgevoerde inventarisatie en sommatie kan worden geconcludeerd dat de inrichting niet gekwalificeerd wordt als een Seveso-inrichting. De maximale belasting binnen de gevarengroepen bedraagt ${Math.round(sevesoMaxRatio * 100)}%, wat betekent dat er een substantiële veiligheidsmarge van ${marginValue}% aanwezig is voordat de ondergrens van de Seveso-richtlijn in beeld komt. Vanuit het perspectief van de externe veiligheid wordt de locatie beschouwd als een reguliere inrichting. Er zijn geen aanvullende publiekrechtelijke verplichtingen van kracht met betrekking tot het voorkomen van zware ongevallen richting de omgeving.`);
        } else {
            addBodyText(`Op basis van de huidige inventarisatie wordt de inrichting aangemerkt als een ${stats.overallStatus}-inrichting onder de Seveso-richtlijn. De wettelijke drempelwaarde voor de categorie ${stats.criticalGroup} wordt overschreden met een fractie van ${(sevesoMaxRatio).toFixed(2)} (${Math.round(sevesoMaxRatio * 100)}%). Deze overschrijding brengt specifieke administratieve en organisatorische verplichtingen met zich mee om de externe veiligheid te waarborgen. De exploitant is verplicht om aan te tonen dat alle noodzakelijke maatregelen zijn getroffen om zware ongevallen te voorkomen en de gevolgen daarvan te beperken.`);
        }

        if (includeArie) {
            finalY -= 2; // Verklein witruimte tussen 4.1 en 4.2
            addSubHeader("4.2 ARIE");
            if (!stats.arieExceeded) {
                addBodyText(`De inrichting wordt op basis van de vigerende Arbo-wetgeving niet aangemerkt als ARIE-plichtig. De hoogste fractie binnen de ARIE-gevarengroepen bedraagt ${Math.round(stats.arieTotal * 100)}%. De inrichting kan voor de arbeidsveiligheid volstaan met de reguliere Risico-Inventarisatie en -Evaluatie (RI&E).`);
            } else {
                addBodyText(`De inrichting wordt op basis van de vigerende Arbo-wetgeving aangemerkt als ARIE-plichtig. Met een gecumuleerde fractie van ${(stats.arieTotal).toFixed(2)} (${Math.round(stats.arieTotal * 100)}%) in de gevarengroep ${stats.criticalArieGroup} wordt de wettelijke drempelwaarde overschreden. Deze status houdt in dat de inrichting verplicht is aanvullende maatregelen te treffen om zware ongevallen op de werkvloer te voorkomen en de gevolgen daarvan voor werknemers te beperken. De standaard Risico-Inventarisatie en -Evaluatie (RI&E) dient te worden uitgebreid met een specifieke ARIE-module.`);
            }
        }

        // --- 5. Wettelijke Vervolgstappen ---
        if (isSevesoExceeded || stats.arieExceeded) {
            addMainHeader(`5. Wettelijke Vervolgstappen`);
            addBodyText("Naar aanleiding van de bovenstaande conclusies dient de inrichting rekening te houden met de volgende juridische en organisatorische vervolgstappen.");

            let stepCounter = 1;

            if (isSevesoExceeded) {
                addSubHeader(`5.${stepCounter} Seveso: Verplichtingen bij overschrijding van de drempelwaarden`);
                const steps = [
                    "Kennisgeving: De inrichting moet onverwijld een formele kennisgeving van de Seveso-status indienen bij het bevoegd gezag (de Omgevingsdienst) via het Omgevingsloket.",
                    "Veiligheidsbeheerssysteem (VBS): De exploitant dient een integraal VBS te implementeren dat voldoet aan bijlage III van de Seveso-III richtlijn.",
                    "Dominosituatie-onderzoek: Er moet worden onderzocht of de inrichting deel uitmaakt van een dominosituatie met naburige bedrijven.",
                    stats.overallStatus === 'Hogedrempel' 
                        ? "Veiligheidsrapport (Hogedrempel): Bij overschrijding van de hogedrempelwaarde is het opstellen van een gedetailleerd Veiligheidsrapport (VR) verplicht, inclusief QRA." 
                        : "PBZO-document (Lagedrempel): Het opstellen van een document waarin het Preventiebeleid Zware Ongevallen (PBZO) is vastgelegd is verplicht."
                ];
                steps.forEach(step => {
                    const splitStep = doc.splitTextToSize(`• ${step}`, fullContentWidth - 5);
                    checkPageBreak(splitStep.length * 5 + 3);
                    doc.setFontSize(9.5);
                    doc.setFont('helvetica', 'normal');
                    doc.text(splitStep, margin + 5, finalY);
                    finalY += (splitStep.length * 5) + 3;
                });
                finalY += 6;
                stepCounter++;
            }

            if (stats.arieExceeded) {
                addSubHeader(`5.${stepCounter} ARIE-plicht: Actuele actiepunten`);
                const arieSteps = [
                    "Melding NLA: De inrichting moet de status als ARIE-bedrijf formeel en schriftelijk melden bij de Nederlandse Arbeidsinspectie (NLA).",
                    "Aanvullende RI&E (ARIE-RI&E): Er moet per direct een verdieping van de RI&E worden uitgevoerd voor specifieke scenario's.",
                    "Preventiebeleid Zware Ongevallen (PBZO): De directie moet een PBZO-document opstellen conform de ARIE-richtlijnen.",
                    "Informatie en Instructie: Werknemers moeten aantoonbaar worden getraind in de bijbehorende noodprocedures."
                ];
                arieSteps.forEach(step => {
                    const splitStep = doc.splitTextToSize(`• ${step}`, fullContentWidth - 5);
                    checkPageBreak(splitStep.length * 5 + 3);
                    doc.setFontSize(9.5);
                    doc.setFont('helvetica', 'normal');
                    doc.text(splitStep, margin + 5, finalY);
                    finalY += (splitStep.length * 5) + 3;
                });
            }
        }

        // Bijlage
        doc.addPage();
        let invY = 20; 
        doc.setFontSize(16); 
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]); 
        doc.setFont('helvetica', 'bold'); 
        doc.text("Bijlage: Volledige Inventaris", margin, invY); 
        invY += 8;
        
        const tableHead = includeArie ? [['Product / CAS', 'Seveso', 'ARIE', 'Voorraad']] : [['Product / CAS', 'Seveso', 'Voorraad']];
        const tableData = (localInventory || []).map(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            let rowData: any[] = [
                { content: sub.productName + (sub.casNumber ? `\n(${sub.casNumber})` : ''), styles: { fontStyle: 'bold' } },
                sevesoCats
            ];
            if (includeArie) {
                const arieCats = sub.arieCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
                rowData.push(arieCats);
            }
            rowData.push({ content: `${sub.quantity} ton`, styles: { halign: 'right' } });
            return rowData;
        });

        const columnStyles = includeArie 
            ? { 0: { cellWidth: 50 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 }, 3: { cellWidth: 25 } }
            : { 0: { cellWidth: 85 }, 1: { cellWidth: 85 }, 2: { cellWidth: 25 } };

        autoTable(doc, {
            startY: invY,
            head: tableHead,
            body: tableData as any,
            theme: 'striped',
            headStyles: { fillColor: colors.primary as [number, number, number], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: columnStyles,
            margin: { left: margin, right: margin }
        });

        addFooter(doc);
        const baseName = generateFileName('').slice(0, -1);
        const finalFileName = reportType === 'full' ? `${baseName}.pdf` : `${baseName}.seveso-only.pdf`;
        doc.save(finalFileName);
        dismiss(toastId);
        toast({ title: "PDF opgeslagen", description: "Het rapport is succesvol gedownload." });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        dismiss(toastId);
        toast({ variant: "destructive", title: "PDF Generatie Mislukt", description: "Fout bij PDF maken." });
    } finally {
        setIsSavingPdf(false);
    }
  };


  const handleAddSubstance = (newSubstance: Omit<Substance, 'id' | 'quantity'>) => {
    if (!selectedCompanyId || !db) return;
    const substanceWithId = {
        ...newSubstance,
        id: `sub-${Date.now()}-${Math.random()}`,
        quantity: 0
    };
    setLocalInventory(prevInventory => [...prevInventory, substanceWithId]);
    addSubstanceToDb(db, selectedCompanyId, substanceWithId);
  };
  
  const handleUpdateSubstanceQuantity = (id: string, quantity: number) => {
    if (!selectedCompanyId || !db) return;
    const newQuantity = isNaN(quantity) ? 0 : quantity;
    setLocalInventory(prev => prev.map(sub => sub.id === id ? { ...sub, quantity: newQuantity } : sub));
    updateSubstanceQuantityInDb(db, selectedCompanyId, id, newQuantity);
  };

  const handleDeleteSubstance = (id: string) => {
    if (!selectedCompanyId || !db) return;
    setLocalInventory(prev => prev.filter(sub => sub.id !== id));
    deleteSubstanceFromDb(db, selectedCompanyId, id);
  };

  const handleClearAll = () => {
    if (!selectedCompanyId || !db) return;
    setLocalInventory([]);
    clearInventoryFromDb(db, selectedCompanyId);
    setIsClearAlertOpen(false);
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId || !db) return;
    const companyNameToDelete = selectedCompany?.name;
    await deleteCompanyFromDb(db, selectedCompanyId);
    setSelectedCompanyId(null);
    setIsDeleteCompanyAlertOpen(false);
    toast({
        title: "Bedrijf Verwijderd",
        description: `Het bedrijf "${companyNameToDelete}" en de inventaris zijn succesvol verwijderd.`
    });
  };
  
  const handleExport = (type: 'json' | 'excel') => {
    if (!selectedCompany) {
      toast({ variant: 'destructive', title: 'Export Mislukt', description: 'Selecteer eerst een bedrijf.' });
      return;
    }

    if (type === 'json') {
        const exportData = { companyDetails: selectedCompany, inventory: localInventory };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = generateFileName('json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        const wsData = [
            ["Bedrijfsgegevens", ""],
            ["Bedrijfsnaam", selectedCompany.name || "-"],
            ["Adres", selectedCompany.address || "-"],
            ["Datum", new Date().toLocaleDateString('nl-NL')],
            [],
            ["Inventarisatie Gevaarlijke Stoffen", "", "", "", ""],
            ["Productnaam", "CAS Nummer", "Seveso Categorieën", "ARIE Categorieën", "Voorraad (ton)", "H-zinnen"]
        ];

        (localInventory || []).forEach(sub => {
            const sevesoCats = sub.sevesoCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            const arieCats = sub.arieCategoryIds.map(id => (ALL_CATEGORIES[id] || Object.values(NAMED_SUBSTANCES).find(ns => ns.id === id))?.displayId || id).join(", ");
            wsData.push([
                sub.productName,
                sub.casNumber || "-",
                sevesoCats,
                arieCats,
                sub.quantity.toString(),
                sub.hStatements.join(", ")
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Seveso Inventaris");
        XLSX.writeFile(wb, generateFileName('xlsx'));
    }

    toast({ title: 'Export Succesvol', description: `Bestand opgeslagen als ${type.toUpperCase()}.` });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'json' | 'excel') => {
    toast({ title: 'Import (nog) niet beschikbaar', description: 'Deze functie wordt herzien voor gebruik met meerdere bedrijven.' });
    if (event.target) event.target.value = '';
  };

  const isActionDisabled = !selectedCompanyId || isLoadingInventory || isLoadingCompanies;

  if (isAuthLoading || isLoadingUserProfile || !user) {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-medium animate-pulse text-muted-foreground">Applicatie laden...</p>
        </div>
    );
  }

  if (userProfile?.disabled) {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
            <UserX className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-3xl font-bold">Account Gedeactiveerd</h1>
            <p className="text-muted-foreground mt-2 max-w-md">Uw account is gedeactiveerd door de beheerder. U heeft geen toegang meer tot de gegevens.</p>
            <Button variant="outline" className="mt-8" onClick={() => signOut(auth)}>
                <LogOut className="mr-2 h-4 w-4" />
                Uitloggen
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
      <SevesoHeader
        onUpload={() => setIsSdsUploadOpen(true)}
        onClearAll={() => setIsClearAlertOpen(true)}
        onShowReference={() => setIsReferenceGuideOpen(true)}
        onImport={(type) => (type === 'json' ? jsonFileInputRef : excelFileInputRef).current?.click()}
        onExport={handleExport}
        onSaveAsPdf={handleSaveAsPdf}
        isSavingPdf={isSavingPdf}
        disabled={isActionDisabled}
      />
       <input
        type="file"
        ref={jsonFileInputRef}
        onChange={(e) => handleFileSelect(e, 'json')}
        className="hidden"
        accept="application/json"
        disabled 
      />
      <input
        type="file"
        ref={excelFileInputRef}
        onChange={(e) => handleFileSelect(e, 'excel')}
        className="hidden"
        accept=".xlsx, .xls"
        disabled 
      />
      
      <CompanySelector 
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={handleSelectCompany}
        onCreateNew={handleCreateNewCompany}
        onDeleteCompany={() => setIsDeleteCompanyAlertOpen(true)}
        onDetailsChange={handleCompanyDetailsChange}
        disabled={isLoadingCompanies}
      />
      
      {selectedCompanyId ? (
        <div className="mt-8 flex flex-col lg:flex-row gap-8">
            <div className="flex-grow lg:w-2/3">
            {isLoadingInventory ? (
                <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-xl bg-muted/20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 mt-4 text-muted-foreground">Inventaris voor {selectedCompany?.name} laden...</p>
                </div>
            ) : (
                <InventoryTable
                    inventory={localInventory}
                    onUpdateQuantity={handleUpdateSubstanceQuantity}
                    onDelete={handleDeleteSubstance}
                    thresholdMode={thresholdMode}
                    onUpload={() => setIsSdsUploadOpen(true)}
                    onShowExplanation={handleShowExplanation}
                />
            )}
            </div>
            <aside className="lg:w-1/3 lg:sticky lg:top-8 h-fit">
            <Dashboard
                inventory={localInventory}
                thresholdMode={thresholdMode}
                setThresholdMode={setThresholdMode}
            />
            </aside>
        </div>
      ) : (
          <div className="mt-12 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-2xl bg-muted/10">
              <div className="bg-primary/10 p-4 rounded-full mb-6">
                <Building2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welkom bij ChemStats</h2>
              <p className="text-muted-foreground mt-2 max-w-lg">
                  Selecteer een bedrijf uit het keuzemenu hierboven om de inventaris en de drempelwaarde-analyse te bekijken, of voeg een nieuw bedrijf toe.
              </p>
              <div className="mt-8 flex gap-4">
                  <Button onClick={handleCreateNewCompany} variant="secondary">
                      Nieuw bedrijf aanmaken
                  </Button>
              </div>
          </div>
      )}

      <SdsUploadDialog
        isOpen={isSdsUploadOpen}
        onOpenChange={setIsSdsUploadOpen}
        onAddSubstance={handleAddSubstance}
      />

      <ReferenceGuideDialog
        isOpen={isReferenceGuideOpen}
        onOpenChange={setIsReferenceGuideOpen}
      />
      
      <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. Dit zal de volledige inventaris voor het geselecteerde bedrijf <span className="font-bold">"{selectedCompany?.name}"</span> wissen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
              Alles Wissen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteCompanyAlertOpen} onOpenChange={setIsDeleteCompanyAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bedrijf volledig verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet u zeker dat u het bedrijf <span className="font-bold">"{selectedCompany?.name}"</span> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive hover:bg-destructive/90">
              Bedrijf Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryExplanationDialog
        isOpen={!!explanationData.substance}
        onOpenChange={(open) => !open && setExplanationData({ substance: null, categoryId: null, type: null })}
        substance={explanationData.substance}
        categoryId={explanationData.categoryId}
        categoryType={explanationData.type}
      />
    </div>
  );
}
