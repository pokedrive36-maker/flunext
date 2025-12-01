
import { Order, FixedExpense } from '../types';

const DB_NAME = 'FlunextDB';
const DB_VERSION = 1;

// Stores
const STORE_ORDERS = 'orders';
const STORE_FIXED_EXPENSES = 'fixed_expenses';
const STORE_SETTINGS = 'settings'; // Para stages e bankBalance

// Chaves do Settings
const KEY_STAGES = 'stages_config';
const KEY_BANK_BALANCE = 'bank_balance';

// Dados Padrão (Seed) - Usados apenas se for instalação limpa E sem localStorage
const DEFAULT_STAGES = [
  'Pendente',
  'Arte/Design',
  'Impressão',
  'Corte/Laser',
  'Montagem',
  'Embalagem',
  'Aguardando Retirada',
  'Entregue',
  'Cancelado'
];

// --- API IndexedDB Wrapper ---

// Abre o banco de dados
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Erro ao abrir banco de dados", event);
      reject("Erro ao abrir DB");
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Criação das tabelas (Object Stores)
      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        db.createObjectStore(STORE_ORDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FIXED_EXPENSES)) {
        db.createObjectStore(STORE_FIXED_EXPENSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS); // Key-value store simples
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
  });
};

// --- Funções de Migração (LocalStorage -> IndexedDB) ---

const STORAGE_KEY_OLD = 'flunext_orders_v3';
const FIXED_EXPENSES_KEY_OLD = 'flunext_fixed_expenses_v1';
const STAGES_KEY_OLD = 'flunext_stages_v1';
const BANK_BALANCE_KEY_OLD = 'flunext_bank_balance_v1';

export const initAndMigrateData = async (): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    // Verifica se já migramos (podemos checar se existem stages salvos, por exemplo)
    const transaction = db.transaction([STORE_ORDERS, STORE_FIXED_EXPENSES, STORE_SETTINGS], 'readwrite');
    const settingsStore = transaction.objectStore(STORE_SETTINGS);
    const ordersStore = transaction.objectStore(STORE_ORDERS);
    const fixedStore = transaction.objectStore(STORE_FIXED_EXPENSES);

    const checkRequest = settingsStore.get('migration_complete_v1');

    checkRequest.onsuccess = () => {
      if (checkRequest.result) {
        // Já migrado, não faz nada
        resolve();
      } else {
        console.log("Iniciando migração do LocalStorage para IndexedDB...");
        
        // 1. Migrar Pedidos
        const oldOrdersStr = localStorage.getItem(STORAGE_KEY_OLD);
        if (oldOrdersStr) {
          try {
            const oldOrders = JSON.parse(oldOrdersStr);
            oldOrders.forEach((o: any) => ordersStore.put(o));
          } catch (e) { console.error("Erro migrando orders", e); }
        }

        // 2. Migrar Despesas Fixas
        const oldFixedStr = localStorage.getItem(FIXED_EXPENSES_KEY_OLD);
        if (oldFixedStr) {
          try {
            const oldFixed = JSON.parse(oldFixedStr);
            oldFixed.forEach((f: any) => fixedStore.put(f));
          } catch (e) { console.error("Erro migrando fixed", e); }
        }

        // 3. Migrar Stages
        const oldStagesStr = localStorage.getItem(STAGES_KEY_OLD);
        if (oldStagesStr) {
          try {
            const oldStages = JSON.parse(oldStagesStr);
            settingsStore.put(oldStages, KEY_STAGES);
          } catch (e) { console.error("Erro migrando stages", e); }
        } else {
          // Se não tem antigo, salva o default
          settingsStore.put(DEFAULT_STAGES, KEY_STAGES);
        }

        // 4. Migrar Saldo
        const oldBalanceStr = localStorage.getItem(BANK_BALANCE_KEY_OLD);
        if (oldBalanceStr) {
           settingsStore.put(parseFloat(oldBalanceStr), KEY_BANK_BALANCE);
        } else {
           settingsStore.put(0, KEY_BANK_BALANCE);
        }

        // Marca como migrado
        settingsStore.put(true, 'migration_complete_v1');
        
        console.log("Migração concluída com sucesso.");
        resolve();
      }
    };

    transaction.onerror = (e) => reject(e);
  });
};

// --- Métodos CRUD ---

// Pedidos
export const getAllOrders = async (): Promise<Order[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ORDERS, 'readonly');
    const store = transaction.objectStore(STORE_ORDERS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveAllOrders = async (orders: Order[]) => {
  // Nota: Em um app maior, salvaríamos um por um. Aqui, para manter compatibilidade
  // com a lógica do App.tsx que envia o array todo, vamos fazer um "sync" brute force
  // deletando e inserindo (ou put um por um).
  // Para ser mais seguro e performático no React, o ideal é salvar apenas o alterado.
  // Vamos adaptar: o App.tsx vai continuar chamando isso, então vamos iterar e salvar todos (Upsert).
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_ORDERS, 'readwrite');
    const store = transaction.objectStore(STORE_ORDERS);
    
    // Opcional: Limpar antes se quiser garantir exclusões? 
    // Não, pois o App.tsx filtra na memória. Mas se deletarmos lá, precisamos deletar aqui.
    // Estratégia Segura: App.tsx deve chamar deleteOrder explicitamente. 
    // Por enquanto, faremos PUT em todos.
    
    orders.forEach(order => store.put(order));
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const deleteOrderById = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_ORDERS, 'readwrite');
    const store = transaction.objectStore(STORE_ORDERS);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Despesas Fixas
export const getAllFixedExpenses = async (): Promise<FixedExpense[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_FIXED_EXPENSES, 'readonly');
    const store = transaction.objectStore(STORE_FIXED_EXPENSES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveFixedExpenseItem = async (expense: FixedExpense) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_FIXED_EXPENSES, 'readwrite');
    const store = transaction.objectStore(STORE_FIXED_EXPENSES);
    store.put(expense);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const deleteFixedExpenseById = async (id: string) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_FIXED_EXPENSES, 'readwrite');
    const store = transaction.objectStore(STORE_FIXED_EXPENSES);
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Stages
export const getStages = async (): Promise<string[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(KEY_STAGES);
    request.onsuccess = () => resolve(request.result || DEFAULT_STAGES);
    request.onerror = () => reject(request.error);
  });
};

export const saveStages = async (stages: string[]) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    store.put(stages, KEY_STAGES);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Saldo
export const getBankBalance = async (): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(KEY_BANK_BALANCE);
    request.onsuccess = () => resolve(request.result ?? 0);
    request.onerror = () => reject(request.error);
  });
};

export const saveBankBalance = async (balance: number) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    store.put(balance, KEY_BANK_BALANCE);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
