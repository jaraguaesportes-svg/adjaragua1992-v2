import { collection, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const COLLECTIONS = [
  "games",
  "people",
  "opponents",
  "venues",
  "cities",
  "competitions",
  "editions",
  "sources",
  "photos",
  "audits",
];

/**
 * Apaga todos os documentos de todas as coleções.
 * Usar SOMENTE antes de uma importação limpa — ação irreversível.
 */
export async function resetDatabase(
  onProgress: (msg: string) => void
): Promise<void> {
  for (const col of COLLECTIONS) {
    onProgress(`Apagando coleção: ${col}...`);
    const snapshot = await getDocs(collection(db, col));
    const deletions = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletions);
    onProgress(`✓ ${col}: ${snapshot.docs.length} documentos removidos`);
  }
  onProgress("Base de dados zerada com sucesso.");
}
