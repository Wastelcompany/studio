import type { Firestore, UserProfile } from '@/lib/types';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';

/**
 * Toggles the disabled status of a user in Firestore.
 * @param db The Firestore instance.
 * @param uid The UID of the user to update.
 * @param currentStatus The current disabled status of the user.
 */
export const toggleUserDisabledStatus = async (db: Firestore, uid: string, currentStatus: boolean): Promise<void> => {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
        disabled: !currentStatus
    });
};

/**
 * Updates a user's customer group and migrates their existing companies to the new group.
 * @param db The Firestore instance.
 * @param userToUpdate The full UserProfile object of the user being updated.
 * @param newCustomerName The new customer name for the group.
 */
export const updateUserGroup = async (db: Firestore, userToUpdate: UserProfile, newCustomerName: string): Promise<void> => {
    const usersRef = collection(db, 'users');
    const companiesRef = collection(db, 'companies');
    
    // 1. Determine the target customerId.
    let targetCustomerId: string;
    const q = query(usersRef, where('customerName', '==', newCustomerName), where('uid', '!=', userToUpdate.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // An existing group with this name is found, use its customerId.
        targetCustomerId = querySnapshot.docs[0].data().customerId;
    } else {
        // This is a new group name, or the user is being moved to their own new group.
        // We generate a new unique ID for the customer group.
        // Using a new doc ID from a collection is a simple way to get a unique ID.
        targetCustomerId = doc(collection(db, 'customers')).id;
    }

    // Start a batch to perform atomic updates.
    const batch = writeBatch(db);

    // 2. Update the user's profile with the new customerId and customerName.
    const userDocRef = doc(db, 'users', userToUpdate.uid);
    batch.update(userDocRef, {
        customerId: targetCustomerId,
        customerName: newCustomerName,
    });

    // 3. Find all companies owned by this user and update their customerId.
    const userCompaniesQuery = query(companiesRef, where('userId', '==', userToUpdate.uid));
    const companiesSnapshot = await getDocs(userCompaniesQuery);
    
    if (!companiesSnapshot.empty) {
        companiesSnapshot.forEach(companyDoc => {
            batch.update(companyDoc.ref, { customerId: targetCustomerId });
        });
    }
    
    // 4. Commit all changes in the batch.
    await batch.commit();
};
