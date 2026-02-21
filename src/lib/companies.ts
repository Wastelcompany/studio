import { db, auth } from './firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import type { Substance, Company } from './types';

// Debounce mechanism
let debounceTimer: NodeJS.Timeout;

export const getCompanies = (userId: string, setCompanies: (companies: Company[]) => void) => {
  const q = query(collection(db, 'companies'), where('userId', '==', userId));
  return onSnapshot(q, (querySnapshot) => {
    const companies: Company[] = [];
    querySnapshot.forEach((doc) => {
      companies.push({ id: doc.id, ...doc.data() } as Company);
    });
    setCompanies(companies.sort((a, b) => a.name.localeCompare(b.name)));
  });
};

export const getCompanyData = async (companyId: string): Promise<{ details: Company, inventory: Substance[] } | null> => {
    const companyDocRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyDocRef);

    if (!companySnap.exists()) {
        return null;
    }

    const inventoryColRef = collection(db, 'companies', companyId, 'inventory');
    const inventorySnap = await getDocs(inventoryColRef);

    const inventory = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Substance));
    
    return {
        details: { id: companySnap.id, ...companySnap.data() } as Company,
        inventory
    };
};

export const createNewCompany = async (userId: string): Promise<Company> => {
    const newCompanyRef = await addDoc(collection(db, 'companies'), {
        userId: userId,
        name: 'Nieuw Bedrijf',
        address: '',
        createdAt: new Date(),
    });
    return {
        id: newCompanyRef.id,
        userId,
        name: 'Nieuw Bedrijf',
        address: '',
    };
};

export const updateCompanyDetails = (companyId: string, details: Partial<Company>) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const companyDocRef = doc(db, 'companies', companyId);
        setDoc(companyDocRef, details, { merge: true });
    }, 500); // 500ms delay
};


export const updateInventoryInDb = async (companyId: string, inventory: Substance[]) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        const batch = writeBatch(db);
        const inventoryColRef = collection(db, 'companies', companyId, 'inventory');
        
        // First, delete all existing documents in the inventory for simplicity
        const existingInventorySnap = await getDocs(inventoryColRef);
        existingInventorySnap.forEach(doc => batch.delete(doc.ref));

        // Now, add the new inventory state
        inventory.forEach(substance => {
            const { id, ...substanceData } = substance;
            const docRef = doc(inventoryColRef, id); // Use existing ID
            batch.set(docRef, substanceData);
        });

        await batch.commit();
    }, 1000); // 1-second debounce
}

export const addSubstanceToDb = async (companyId: string, substance: Substance) => {
    const newDocRef = doc(collection(db, 'companies', companyId, 'inventory'), substance.id);
    await setDoc(newDocRef, {
        productName: substance.productName,
        casNumber: substance.casNumber,
        hStatements: substance.hStatements,
        sevesoCategoryIds: substance.sevesoCategoryIds,
        arieCategoryIds: substance.arieCategoryIds,
        isNamedSubstance: substance.isNamedSubstance,
        namedSubstanceName: substance.namedSubstanceName,
        quantity: substance.quantity,
    });
};

export const deleteSubstanceFromDb = async (companyId: string, substanceId: string) => {
    const docRef = doc(db, 'companies', companyId, 'inventory', substanceId);
    await deleteDoc(docRef);
};

export const updateSubstanceQuantityInDb = (companyId: string, substanceId: string, quantity: number) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const docRef = doc(db, 'companies', companyId, 'inventory', substanceId);
        setDoc(docRef, { quantity }, { merge: true });
    }, 300); // 300ms debounce for quantity updates
};

export const clearInventoryFromDb = async (companyId: string) => {
    const inventoryColRef = collection(db, 'companies', companyId, 'inventory');
    const inventorySnap = await getDocs(inventoryColRef);

    if (inventorySnap.empty) {
        return;
    }

    const batch = writeBatch(db);
    inventorySnap.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};
