import type { Firestore, UserProfile, Company } from '@/lib/types';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch, deleteDoc, Timestamp, addDoc } from 'firebase/firestore';

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
 * This now fetches all companies in the old customer group and filters client-side to avoid restrictive query rules.
 * @param db The Firestore instance.
 * @param userToUpdate The full UserProfile object of the user being updated.
 * @param newCustomerName The new customer name for the group.
 */
export const updateUserGroup = async (db: Firestore, userToUpdate: UserProfile, newCustomerName: string): Promise<void> => {
    const usersRef = collection(db, 'users');
    const companiesRef = collection(db, 'companies');
    
    // 1. Determine the target customerId.
    let targetCustomerId: string;
    const q = query(usersRef, where('customerName', '==', newCustomerName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        // An existing group with this name is found, use its customerId.
        targetCustomerId = querySnapshot.docs[0].data().customerId;
    } else {
        // This is a new group name. The user being moved will define the new group, using their own UID as the group's ID.
        targetCustomerId = userToUpdate.uid;
    }

    const batch = writeBatch(db);

    // 2. Update the user's profile with the new customerId and customerName.
    const userDocRef = doc(db, 'users', userToUpdate.uid);
    batch.update(userDocRef, {
        customerId: targetCustomerId,
        customerName: newCustomerName,
    });

    // 3. Find all companies owned by this user and update their customerId.
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
    
    // 4. Commit all changes in the batch.
    await batch.commit();
};


/**
 * Deletes a user's profile and all associated data (companies and their inventories).
 * Note: This does not delete the Firebase Auth user, only their data within Firestore.
 * @param db The Firestore instance.
 * @param userToDelete The user profile of the user to delete.
 */
export const deleteUserAndData = async (db: Firestore, userToDelete: UserProfile): Promise<void> => {
    const batch = writeBatch(db);
    const companiesRef = collection(db, 'companies');

    // 1. Find all companies owned by the user.
    const companiesQuery = query(companiesRef, where('userId', '==', userToDelete.uid));
    const companiesSnapshot = await getDocs(companiesQuery);

    // 2. For each company, delete its inventory subcollection, then delete the company itself.
    for (const companyDoc of companiesSnapshot.docs) {
        const inventoryRef = collection(db, 'companies', companyDoc.id, 'inventory');
        const inventorySnapshot = await getDocs(inventoryRef);
        inventorySnapshot.forEach(inventoryDoc => {
            batch.delete(inventoryDoc.ref);
        });
        batch.delete(companyDoc.ref);
    }
    
    // 3. Delete the user's profile document.
    const userDocRef = doc(db, 'users', userToDelete.uid);
    batch.delete(userDocRef);
    
    // 4. Commit all deletions.
    await batch.commit();
};

/**
 * Creates a new company record from an Admin context (e.g. via KVK search).
 */
export const createCompanyFromKvk = async (db: Firestore, adminUid: string, customerId: string, companyInfo: { name: string, address: string }): Promise<void> => {
    const companiesColRef = collection(db, 'companies');
    await addDoc(companiesColRef, {
        userId: adminUid, // Admin is the creator/owner initially
        customerId: customerId,
        name: companyInfo.name,
        address: companyInfo.address,
        createdAt: Timestamp.now(),
    });
};

/**
 * Renames a customer group for all entities associated with it.
 */
export const renameCustomerGroup = async (db: Firestore, customerId: string, newName: string): Promise<void> => {
    const batch = writeBatch(db);
    
    // 1. Update all users in this customer group
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('customerId', '==', customerId));
    const usersSnapshot = await getDocs(usersQuery);
    usersSnapshot.forEach(userDoc => {
        batch.update(userDoc.ref, { customerName: newName });
    });
    
    // 2. Commit the changes
    await batch.commit();
};
