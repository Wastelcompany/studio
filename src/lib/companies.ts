import type { Firestore } from 'firebase/firestore';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, onSnapshot, writeBatch, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Substance, Company } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Debounce mechanism
let debounceTimer: NodeJS.Timeout;

export const createNewCompany = async (db: Firestore, userId: string): Promise<Company | null> => {
    const companyData = {
        userId: userId,
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


export const addSubstanceToDb = (db: Firestore, companyId: string, substance: Substance) => {
    const newDocRef = doc(collection(db, 'companies', companyId, 'inventory'), substance.id);
    const { id, ...substanceData } = substance;
    setDoc(newDocRef, substanceData).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: newDocRef.path,
            operation: 'create',
            requestResourceData: substanceData
        }));
    });
};

export const deleteSubstanceFromDb = (db: Firestore, companyId: string, substanceId: string) => {
    const docRef = doc(db, 'companies', companyId, 'inventory', substanceId);
    deleteDoc(docRef).catch(error => {
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
    }, 300);
};

export const clearInventoryFromDb = (db: Firestore, companyId: string) => {
    const inventoryColRef = collection(db, 'companies', companyId, 'inventory');
    
    getDocs(inventoryColRef).then(inventorySnap => {
        if (inventorySnap.empty) {
            return;
        }
    
        const batch = writeBatch(db);
        inventorySnap.forEach(doc => {
            batch.delete(doc.ref);
        });
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
