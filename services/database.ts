
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";

const getCollectionPath = (uid: string, sub: string) => `users/${uid}/${sub}`;

export const syncData = (
  uid: string, 
  sub: string, 
  callback: (data: any[]) => void, 
  errorCallback?: (error: any) => void
) => {
  if (!uid) return () => {};

  try {
    const colRef = collection(db, getCollectionPath(uid, sub));
    const q = query(colRef);
    
    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedData = [...data].sort((a: any, b: any) => 
          (a.name || a.firstName || '').localeCompare(b.name || b.firstName || '')
        );
        callback(sortedData);
      }, 
      (error) => {
        console.error(`Firestore Sync Error [${sub}]:`, error.message);
        if (errorCallback) errorCallback({ ...error, collection: sub });
      }
    );
  } catch (err) {
    console.error(`Failed to initialize sync for ${sub}:`, err);
    return () => {};
  }
};

export const saveData = async (uid: string, sub: string, item: any): Promise<string> => {
  if (!uid) throw new Error("User UID is required to save data");

  try {
    const { id, ...data } = item;
    if (id && id.length > 15) { 
      const docRef = doc(db, getCollectionPath(uid, sub), id);
      await updateDoc(docRef, data);
      return id;
    } else {
      const docRef = await addDoc(collection(db, getCollectionPath(uid, sub)), data);
      return docRef.id;
    }
  } catch (error) {
    console.error(`Firestore Save Error [${sub}]:`, error);
    throw error;
  }
};

export const deleteData = async (uid: string, sub: string, id: string): Promise<void> => {
  if (!uid || !id) return;
  try {
    const docRef = doc(db, getCollectionPath(uid, sub), id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Firestore Delete Error [${sub}]:`, error);
    throw error;
  }
};
