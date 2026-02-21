"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import type { Company } from "@/lib/types";

interface CompanySelectorProps {
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
  onCreateNew: () => void;
  onDetailsChange: (details: Partial<Company>) => void;
  disabled: boolean;
}

export default function CompanySelector({
  companies,
  selectedCompanyId,
  onSelectCompany,
  onCreateNew,
  onDetailsChange,
  disabled
}: CompanySelectorProps) {
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;
  
  // Local state to manage input fields for immediate feedback
  const [name, setName] = useState(selectedCompany?.name || "");
  const [address, setAddress] = useState(selectedCompany?.address || "");

  useEffect(() => {
    setName(selectedCompany?.name || "");
    setAddress(selectedCompany?.address || "");
  }, [selectedCompany]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    onDetailsChange({ name: newName });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    onDetailsChange({ address: newAddress });
  };

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="company-select">Geselecteerd Bedrijf</Label>
            <Select
              value={selectedCompanyId || ""}
              onValueChange={(value) => {
                if (value === "new") {
                  onCreateNew();
                } else {
                  onSelectCompany(value);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger id="company-select">
                <SelectValue placeholder="Selecteer een bedrijf..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
                <SelectItem value="new" className="text-primary font-semibold">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>Nieuw bedrijf toevoegen...</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {selectedCompany && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
                <Label htmlFor="company-name">Naam bedrijf</Label>
                <Input
                id="company-name"
                placeholder="Voer de bedrijfsnaam in"
                value={name}
                onChange={handleNameChange}
                disabled={!selectedCompanyId || disabled}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="company-address">Adres</Label>
                <Input
                id="company-address"
                placeholder="Voer het adres in"
                value={address}
                onChange={handleAddressChange}
                disabled={!selectedCompanyId || disabled}
                />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
