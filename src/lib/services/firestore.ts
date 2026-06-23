import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

function currentUser() {
  const user = auth.currentUser;
  return { userId: user?.uid ?? "desconhecido", userName: user?.displayName ?? user?.email ?? "Desconhecido" };
}

/** Remove chaves com valor undefined, recursivamente — o Firestore rejeita undefined em qualquer campo. */
function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = sanitize(val);
      }
    }
    return result as T;
  }
  return value;
}

/**
 * Grava um registro permanente na coleção `audits`, conforme Volume V cap. 11.
 * Auditoria é obrigatória para toda criação, edição, arquivamento, restauração e mesclagem (Volume I 3.6 / Volume IV 9).
 */
async function writeAudit(params: {
  action: "create" | "update" | "archive" | "restore" | "merge" | "delete" | "import" | "upload" | "login" | "logout";
  entityType: string;
  entityId: string;
  entityName?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
  severity?: "low" | "medium" | "high" | "critical";
}) {
  const { userId, userName } = currentUser();
  await addDoc(collection(db, "audits"), sanitize({
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName ?? "",
    source: "manual",
    before: params.before ?? {},
    after: params.after ?? {},
    changedFields: params.changedFields ?? [],
    reversible: params.action !== "delete",
    severity: params.severity ?? "low",
    retentionLevel: "permanent",
  }));
}

export async function listCollection<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db, collectionName), orderBy("createdAt", "desc")));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export async function createDocument(collectionName: string, data: Record<string, unknown>, entityName?: string) {
  const now = new Date().toISOString();
  const { userId } = currentUser();
  const cleanData = sanitize(data);
  const ref = await addDoc(collection(db, collectionName), {
    ...cleanData,
    status: "active",
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
    version: 1,
  });
  await writeAudit({
    action: "create",
    entityType: collectionName,
    entityId: ref.id,
    entityName,
    after: cleanData,
    severity: "low",
  });
  return ref;
}

export async function upsertDocument(
  collectionName: string,
  id: string,
  data: Record<string, unknown>,
  options?: { entityName?: string; before?: Record<string, unknown> }
) {
  const now = new Date().toISOString();
  const { userId } = currentUser();
  const cleanData = sanitize(data);
  const result = await setDoc(
    doc(db, collectionName, id),
    { id, ...cleanData, updatedAt: now, updatedBy: userId },
    { merge: true }
  );
  await writeAudit({
    action: "update",
    entityType: collectionName,
    entityId: id,
    entityName: options?.entityName,
    before: options?.before,
    after: cleanData,
    changedFields: Object.keys(cleanData),
    severity: "medium",
  });
  return result;
}

export async function archiveDocument(collectionName: string, id: string, entityName?: string) {
  const result = await updateDoc(doc(db, collectionName, id), {
    status: "archived",
    updatedAt: new Date().toISOString(),
  });
  await writeAudit({
    action: "archive",
    entityType: collectionName,
    entityId: id,
    entityName,
    severity: "medium",
  });
  return result;
}

export async function restoreDocument(collectionName: string, id: string, entityName?: string) {
  const result = await updateDoc(doc(db, collectionName, id), {
    status: "active",
    updatedAt: new Date().toISOString(),
  });
  await writeAudit({
    action: "restore",
    entityType: collectionName,
    entityId: id,
    entityName,
    severity: "medium",
  });
  return result;
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}
