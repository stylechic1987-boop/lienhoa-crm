import { Account, Client, ID, Query, TablesDB } from "appwrite";

export const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
export const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "";
export const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || "6aad4a8f000133bdd644";

export const tableIds = {
  profiles: import.meta.env.VITE_APPWRITE_PROFILES_TABLE_ID || "6aad4c04002b2fdd8382",
  leads: import.meta.env.VITE_APPWRITE_LEADS_TABLE_ID || "",
  followUps: import.meta.env.VITE_APPWRITE_FOLLOWUPS_TABLE_ID || "",
  activities: import.meta.env.VITE_APPWRITE_ACTIVITIES_TABLE_ID || "",
};

export const appwriteConfigured = Boolean(projectId && databaseId);
export const crmDataConfigured = Boolean(tableIds.profiles && tableIds.leads && tableIds.followUps && tableIds.activities);

const client = new Client().setEndpoint(endpoint).setProject(projectId || "unconfigured");
export const account = new Account(client);
export const tablesDB = new TablesDB(client);

export type Row = Record<string, any> & { $id?: string; $createdAt?: string; $updatedAt?: string };

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string) {
  return account.createEmailPasswordSession({ email, password });
}

export async function signOut() {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch {
    // Already signed out.
  }
}

export async function requestRecovery(email: string) {
  const url = window.location.origin + window.location.pathname;
  return account.createRecovery({ email, url });
}

function tableId(name: keyof typeof tableIds) {
  const id = tableIds[name];
  if (!id) throw new Error(`Appwrite table ID chưa được cấu hình: ${name}`);
  return id;
}

export async function listRows(name: keyof typeof tableIds, queries: string[] = []) {
  const all: Row[] = [];
  let offset = 0;
  while (true) {
    const result = await tablesDB.listRows({
      databaseId,
      tableId: tableId(name),
      queries: [...queries, Query.limit(100), Query.offset(offset)],
    });
    all.push(...(result.rows as Row[]));
    if (result.rows.length < 100) break;
    offset += 100;
  }
  return all;
}

export async function getRow(name: keyof typeof tableIds, rowId: string) {
  return tablesDB.getRow<Row>({ databaseId, tableId: tableId(name), rowId });
}

export async function createRow(name: keyof typeof tableIds, data: Row) {
  return tablesDB.createRow<Row>({
    databaseId,
    tableId: tableId(name),
    rowId: ID.unique(),
    data,
  });
}

export async function updateRow(name: keyof typeof tableIds, rowId: string, data: Row) {
  return tablesDB.updateRow<Row>({
    databaseId,
    tableId: tableId(name),
    rowId,
    data,
  });
}

export function qEqual(field: string, value: string | number | boolean) {
  return Query.equal(field, value);
}

export function qOrderDesc(field: string) {
  return Query.orderDesc(field);
}
