import { addDoc, collection, doc, getDocs, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function listCollection<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db, collectionName), orderBy("createdAt", "desc")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function createDocument(collectionName: string, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  return addDoc(collection(db, collectionName), { ...data, status: "active", createdAt: now, updatedAt: now, version: 1 });
}

export async function upsertDocument(collectionName: string, id: string, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  return setDoc(doc(db, collectionName, id), { id, ...data, updatedAt: now }, { merge: true });
}

export async function archiveDocument(collectionName: string, id: string) {
  return updateDoc(doc(db, collectionName, id), { status: "archived", updatedAt: new Date().toISOString() });
}
