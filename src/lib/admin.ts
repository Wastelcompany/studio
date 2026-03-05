
import { collection, doc, getDocs, query, updateDoc, where, writeBatch, deleteDoc, Timestamp, addDoc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { UserProfile, Company, Customer } from '@/lib/types';

/**
 * Toggles the disabled status of a user in Firestore.
 */
export const toggleUserDisabledStatus = async (db: Firestore, uid: string, currentStatus: boolean): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
        disabled: !currentStatus
    });
};

/**
 * Updates a user's role (admin/user).
 */
export const updateUserRole = async (db: Firestore, uid: string, newRole: 'admin' | 'user'): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
        role: newRole
    });
};

/**
 * Updates a user's customer group and migrates their existing companies to the new group.
 */
export const updateUserGroup = async (db: Firestore, userToUpdate: UserProfile, newCustomerName: string): Promise<void> => {
    const usersRef = collection(db, 'users');
    const companiesRef = collection(db, 'companies');
    
    let targetCustomerId: string;
    const q = query(usersRef, where('customerName', '==', newCustomerName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        targetCustomerId = querySnapshot.docs[0].data().customerId;
    } else {
        targetCustomerId = userToUpdate.uid;
    }

    const batch = writeBatch(db);

    const userDocRef = doc(db, 'users', userToUpdate.uid);
    batch.update(userDocRef, {
        customerId: targetCustomerId,
        customerName: newCustomerName,
    });

    if (userToUpdate.customerId) {
        const userCompaniesQuery = query(companiesRef, where('customerId', '==', userToUpdate.customerId));
        const companiesSnapshot = await getDocs(userCompaniesQuery);
        const companiesToUpdate = companiesSnapshot.docs.filter(doc => doc.data().userId === userToUpdate.uid);

        if (companiesToUpdate.length > 0) {
            companiesToUpdate.forEach(companyDoc => {
                batch.update(companyDoc.ref, { customerId: targetCustomerId });
            });
        }
    }
    
    await batch.commit();
};

/**
 * Creates a new Customer record manually or from KVK data.
 */
export const createCustomerRecord = async (db: Firestore, customerInfo: { name: string, address: string, kvkNumber: string }): Promise<string> => {
    const customersColRef = collection(db, 'customers');
    const newCustomerDoc = doc(customersColRef);
    await setDoc(newCustomerDoc, {
        id: newCustomerDoc.id,
        name: customerInfo.name,
        address: customerInfo.address,
        kvkNumber: customerInfo.kvkNumber,
        createdAt: serverTimestamp(),
    });
    return newCustomerDoc.id;
};

/**
 * Logs AI usage for analytics.
 */
export const logAiUsage = async (db: Firestore, userId: string, type: 'SDS_EXTRACTION' | 'KVK_SEARCH'): Promise<void> => {
  const logsRef = collection(db, 'ai_usage_logs');
  const estimatedCost = type === 'SDS_EXTRACTION' ? 0.015 : 0.002;
  await addDoc(logsRef, {
    userId,
    type,
    model: 'gemini-2.5-flash-lite',
    timestamp: serverTimestamp(),
    estimatedCost
  });
};
