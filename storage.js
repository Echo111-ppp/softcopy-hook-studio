export const CLOUD_CONFIG_KEY = "softcopy-studio-cloud-config";
export const LEGACY_ARTICLES_KEY = "softcopy-studio-articles-v1";
const DB_NAME = "softcopy-studio";
const DB_VERSION = 1;
const STORE_NAME = "articles";
const SUPABASE_MODULE_URL =
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const DEFAULT_CLOUD_CONFIG = Object.freeze({
  url: "https://dbznlhinhoqmjfmrknuk.supabase.co",
  anonKey: "sb_publishable_lqqOyPJmfvTBtwqO61wPYA_Z15nBJWc",
});

let dbPromise;
let cloudClientPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function transaction(mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const LocalStore = {
  mode: "local",
  label: "本机保存",

  async listArticles() {
    const articles = await transaction("readonly", (store) =>
      requestToPromise(store.getAll()),
    );
    return articles.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  },

  async getArticle(id) {
    return transaction("readonly", (store) =>
      requestToPromise(store.get(id)),
    );
  },

  async saveArticle(article) {
    await transaction("readwrite", (store) => store.put(article));
    return article;
  },

  async deleteArticle(id) {
    await transaction("readwrite", (store) => store.delete(id));
  },

  async exportData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      mode: "local",
      articles: await this.listArticles(),
    };
  },

  async importData(data) {
    if (!Array.isArray(data?.articles)) {
      throw new Error("备份文件格式不正确。");
    }
    for (const article of data.articles) {
      if (!article?.id) continue;
      await transaction("readwrite", (store) => store.put(article));
    }
    return data.articles.length;
  },
};

export function getCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CLOUD_CONFIG };
    const config = JSON.parse(raw);
    if (!config?.url || !config?.anonKey) {
      return { ...DEFAULT_CLOUD_CONFIG };
    }
    return config;
  } catch {
    return { ...DEFAULT_CLOUD_CONFIG };
  }
}

export function saveCloudConfig(config) {
  const normalized = {
    url: String(config.url || "").trim().replace(/\/$/, ""),
    anonKey: String(config.anonKey || "").trim(),
  };
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(normalized));
  cloudClientPromise = null;
  return normalized;
}

export function clearCloudConfig() {
  localStorage.removeItem(CLOUD_CONFIG_KEY);
  cloudClientPromise = null;
}

async function getCloudClient() {
  const config = getCloudConfig();
  if (!config) throw new Error("还没有配置云端连接。");
  if (!cloudClientPromise) {
    cloudClientPromise = import(SUPABASE_MODULE_URL).then(({ createClient }) =>
      createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }
  return cloudClientPromise;
}

function fromRemote(row) {
  return {
    id: row.id,
    title: row.title || "",
    body: row.body || "",
    product: row.product || "",
    status: row.status || "草稿",
    sourceNotes: row.source_notes || "",
    notes: row.notes || "",
    tags: row.tags || [],
    hookAnalysis: row.hook_analysis || null,
    riskAnalysis: row.risk_analysis || null,
    structureAnalysis: row.structure_analysis || null,
    versions: row.versions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRemote(article) {
  return {
    id: article.id,
    title: article.title,
    body: article.body,
    product: article.product || "",
    status: article.status || "草稿",
    source_notes: article.sourceNotes || "",
    notes: article.notes || "",
    tags: article.tags || [],
    hook_analysis: article.hookAnalysis || {},
    risk_analysis: article.riskAnalysis || {},
    structure_analysis: article.structureAnalysis || {},
    versions: article.versions || [],
    created_at: article.createdAt,
    updated_at: article.updatedAt,
  };
}

export class CloudStore {
  mode = "cloud";
  label = "云端同步";

  async getSession() {
    const client = await getCloudClient();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async signIn(email, password) {
    const client = await getCloudClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.session;
  }

  async signUp(email, password) {
    const client = await getCloudClient();
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const client = await getCloudClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async listArticles() {
    const client = await getCloudClient();
    const { data, error } = await client
      .from("soft_articles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromRemote);
  }

  async getArticle(id) {
    const client = await getCloudClient();
    const { data, error } = await client
      .from("soft_articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRemote(data) : null;
  }

  async saveArticle(article) {
    const client = await getCloudClient();
    const { data, error } = await client
      .from("soft_articles")
      .upsert(toRemote(article), { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return fromRemote(data);
  }

  async deleteArticle(id) {
    const client = await getCloudClient();
    const { error } = await client.from("soft_articles").delete().eq("id", id);
    if (error) throw error;
  }

  async exportData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      mode: "cloud",
      articles: await this.listArticles(),
    };
  }

  async importData(data) {
    if (!Array.isArray(data?.articles)) {
      throw new Error("备份文件格式不正确。");
    }
    let imported = 0;
    for (const article of data.articles) {
      if (!article?.id) continue;
      await this.saveArticle(article);
      imported += 1;
    }
    return imported;
  }
}

export async function getActiveStore() {
  if (!getCloudConfig()) return LocalStore;
  const cloudStore = new CloudStore();
  try {
    const session = await cloudStore.getSession();
    return session ? cloudStore : LocalStore;
  } catch {
    return LocalStore;
  }
}

export async function testCloudConnection(url, anonKey) {
  const normalizedUrl = String(url || "").trim().replace(/\/$/, "");
  if (!normalizedUrl || !anonKey) {
    throw new Error("请填写 Supabase URL 和 anon key。");
  }
  const response = await fetch(`${normalizedUrl}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  });
  if (!response.ok) {
    throw new Error(`连接失败：HTTP ${response.status}`);
  }
  return response.json();
}

