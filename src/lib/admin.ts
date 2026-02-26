
import type { Firestore, UserProfile, Company, Customer } from '@/lib/types';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch, deleteDoc, Timestamp, addDoc, setDoc } from 'firebase/firestore';

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
 * Deletes a user's profile and all associated data.
 */
export const deleteUserAndData = async (db: Firestore, userToDelete: UserProfile): Promise<void> => {
    const batch = writeBatch(db);
    const companiesRef = collection(db, 'companies');

    const companiesQuery = query(companiesRef, where('userId', '==', userToDelete.uid));
    const companiesSnapshot = await getDocs(companiesQuery);

    for (const companyDoc of companiesSnapshot.docs) {
        const inventoryRef = collection(db, 'companies', companyDoc.id, 'inventory');
        const inventorySnapshot = await getDocs(inventoryRef);
        inventorySnapshot.forEach(inventoryDoc => {
            batch.delete(inventoryDoc.ref);
        });
        batch.delete(companyDoc.ref);
    }
    
    const userDocRef = doc(db, 'users', userToDelete.uid);
    batch.delete(userDocRef);
    
    await batch.commit();
};

/**
 * Creates a new Customer record from KVK data.
 */
export const createCustomerFromKvk = async (db: Firestore, customerInfo: { name: string, address: string, kvkNumber: string }): Promise<string> => {
    const customersColRef = collection(db, 'customers');
    const newCustomerDoc = doc(customersColRef);
    await setDoc(newCustomerDoc, {
        id: newCustomerDoc.id,
        name: customerInfo.name,
        address: customerInfo.address,
        kvkNumber: customerInfo.kvkNumber,
        createdAt: Timestamp.now(),
    });
    return newCustomerDoc.id;
};

/**
 * Creates a new company record associated with a customer.
 */
export const createCompanyForCustomer = async (db: Firestore, adminUid: string, customerId: string, companyInfo: { name: string, address: string }): Promise<void> => {
    const companiesColRef = collection(db, 'companies');
    await addDoc(companiesColRef, {
        userId: adminUid,
        customerId: customerId,
        name: companyInfo.name,
        address: companyInfo.address,
        createdAt: Timestamp.now(),
    });
};

/**
 * Renames a customer group globally.
 */
export const renameCustomerGroup = async (db: Firestore, customerId: string, newName: string): Promise<void> => {
    const batch = writeBatch(db);
    
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('customerId', '==', customerId));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(userDoc => {
        batch.update(userDoc.ref, { customerName: newName });
    });

    const customersRef = collection(db, 'customers');
    const customerDocRef = doc(customersRef, customerId);
    batch.set(customerDocRef, { name: newName }, { merge: true });
    
    await batch.commit();
};
