
import type { Firestore } from 'firebase/firestore';
import { collection, query, where, getDocs, doc, setDoc, addDoc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Substance, Company } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

// Debounce mechanism
let debounceTimer: NodeJS.Timeout;

export const createNewCompany = async (db: Firestore, userId: string, customerId: string): Promise<Company | null> => {
    const companyData = {
        userId: userId,
        customerId: customerId,
        name: 'Nieuw Bedrijf',
        address: '',
        createdAt: Timestamp.now(),
    };
    const companiesColRef = collection(db, 'companies');
    try {
        const newCompanyRef = await addDoc(companiesColRef, companyData);
        return {
            id: newCompanyRef.id,
            userId,
            customerId,
            name: 'Nieuw Bedrijf',
            address: '',
        };
    } catch(e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: companiesColRef.path,
            operation: 'create',
            requestResourceData: companyData
        }));
        return null;
    }
};

export const updateCompanyDetails = (db: Firestore, companyId: string, details: Partial<Company>) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const companyDocRef = doc(db, 'companies', companyId);
        setDoc(companyDocRef, details, { merge: true }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: companyDocRef.path,
                operation: 'update',
                requestResourceData: details,
            }));
        });
    }, 500);
};

export const deleteCompanyFromDb = async (db: Firestore, companyId: string): Promise<void> => {
    const batch = writeBatch(db);
    const companyRef = doc(db, 'companies', companyId);
    
    // 1. Delete all items in the inventory subcollection
    const inventoryRef = collection(db, 'companies', companyId, 'inventory');
    const inventorySnapshot = await getDocs(inventoryRef);
    
    for (const inventoryDoc of inventorySnapshot.docs) {
        // Also delete history subcollection for each substance
        const historyRef = collection(db, 'companies', companyId, 'inventory', inventoryDoc.id, 'history');
        const historySnapshot = await getDocs(historyRef);
        historySnapshot.forEach(hDoc => {
            batch.delete(hDoc.ref);
        });
        batch.delete(inventoryDoc.ref);
    }
    
    // 2. Delete the company document itself
    batch.delete(companyRef);
    
    try {
        await batch.commit();
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: companyRef.path,
            operation: 'delete'
        }));
    }
};


export const addSubstanceToDb = (db: Firestore, companyId: string, substance: Substance) => {
    const newDocRef = doc(collection(db, 'companies', companyId, 'inventory'), substance.id);
    const { id, ...substanceData } = substance;
    
    setDoc(newDocRef, substanceData).then(() => {
        // Create initial history log
        const dateKey = format(new Date(), 'yyyy-MM-dd');
        const historyRef = doc(db, 'companies', companyId, 'inventory', substance.id, 'history', dateKey);
        setDoc(historyRef, {
            date: dateKey,
            quantity: substance.quantity,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: newDocRef.path,
            operation: 'create',
            requestResourceData: substanceData
        }));
    });
};

export const deleteSubstanceFromDb = (db: Firestore, companyId: string, substanceId: string) => {
    const docRef = doc(db, 'companies', companyId, 'inventory', substanceId);
    
    const batch = writeBatch(db);
    batch.delete(docRef);
    
    batch.commit().catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        }));
    });
};

export const updateSubstanceQuantityInDb = (db: Firestore, companyId: string, substanceId: string, quantity: number) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const docRef = doc(db, 'companies', companyId, 'inventory', substanceId);
        const data = { quantity };
        
        setDoc(docRef, data, { merge: true }).catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: data,
            }));
        });

        const dateKey = format(new Date(), 'yyyy-MM-dd');
        const historyRef = doc(db, 'companies', companyId, 'inventory', substanceId, 'history', dateKey);
        setDoc(historyRef, {
            date: dateKey,
            quantity: quantity,
            updatedAt: serverTimestamp()
        }, { merge: true }).catch(() => {});
    }, 300);
};

export const clearInventoryFromDb = (db: Firestore, companyId: string) => {
    const inventoryColRef = collection(db, 'companies', companyId, 'inventory');
    
    getDocs(inventoryColRef).then(inventorySnap => {
        if (inventorySnap.empty) return;
        const batch = writeBatch(db);
        inventorySnap.forEach(doc => batch.delete(doc.ref));
        batch.commit().catch(error => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: inventoryColRef.path,
                operation: 'delete'
            }));
        });
    }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: inventoryColRef.path,
            operation: 'list'
        }));
    });
};
