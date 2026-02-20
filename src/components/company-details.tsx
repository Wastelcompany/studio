"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CompanyDetailsProps {
  details: { name: string; address: string };
  onDetailsChange: (details: { name: string; address: string }) => void;
}

export default function CompanyDetails({ details, onDetailsChange }: CompanyDetailsProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Bedrijfsgegevens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Naam bedrijf</Label>
            <Input
              id="company-name"
              placeholder="Voer de bedrijfsnaam in"
              value={details.name}
              onChange={(e) => onDetailsChange({ ...details, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Adres</Label>
            <Input
              id="company-address"
              placeholder="Voer het adres in"
              value={details.address}
              onChange={(e) => onDetailsChange({ ...details, address: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
