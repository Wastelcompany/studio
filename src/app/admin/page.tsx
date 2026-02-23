import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Adminpaneel</CardTitle>
          <CardDescription>
            Deze pagina is bedoeld voor het beheer van gebruikersrechten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>De functionaliteit om rechten van verschillende gebruikers in te stellen is momenteel in ontwikkeling en nog niet beschikbaar.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
