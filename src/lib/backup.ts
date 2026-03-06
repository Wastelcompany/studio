import { collection, doc, getDocs, setDoc, addDoc, Timestamp, type Firestore } from 'firebase/firestore';
import type { Company, Substance } from './types';

/**
 * Exports a complete company including its inventory to a JSON object.
 */
export const exportCompanyData = async (db: Firestore, company: Company): Promise<string> => {
  const inventoryRef = collection(db, 'companies', company.id, 'inventory');
  const inventorySnap = await getDocs(inventoryRef);
  
  const inventory: any[] = [];
  inventorySnap.forEach(doc => {
    inventory.push({ id: doc.id, ...doc.data() });
  });

  const backupData = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    company: {
      name: company.name,
      address: company.address,
    },
    inventory: inventory
  };

  return JSON.stringify(backupData, null, 2);
};

/**
 * Imports a company and its inventory from a JSON string.
 * Creates a new company record to avoid overwriting existing data.
 */
export const importCompanyData = async (db: Firestore, userId: string, customerId: string, jsonString: string): Promise<string | null> => {
  try {
    const data = JSON.parse(jsonString);
    
    // Basic validation
    if (!data.company || !Array.isArray(data.inventory)) {
      throw new Error("Ongeldig back-up bestand.");
    }

    // 1. Create new company
    const companiesColRef = collection(db, 'companies');
    const newCompanyRef = await addDoc(companiesColRef, {
      userId,
      customerId,
      name: `${data.company.name} (Hersteld)`,
      address: data.company.address || "",
      createdAt: Timestamp.now(),
    });

    // 2. Import inventory
    const inventoryColRef = collection(db, 'companies', newCompanyRef.id, 'inventory');
    for (const item of data.inventory) {
      const { id, ...itemData } = item;
      const itemRef = doc(inventoryColRef, id || `sub-${Math.random().toString(36).substr(2, 9)}`);
      await setDoc(itemRef, itemData);
    }

    return newCompanyRef.id;
  } catch (e) {
    console.error("Import error:", e);
    return null;
  }
};
