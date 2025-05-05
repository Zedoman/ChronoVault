import { LocalStorage } from 'node-localstorage';

class LocalStorageManager {
    private static readonly USER_PREFIX = 'chronovault_user_';
    private static storage: typeof LocalStorage;

    private static initStorage() {
        if (!this.storage) {
            this.storage = new LocalStorage('./scratch'); // This directory will store the data
        }
    }

    static saveUserData(userAddress: string, key: string, data: any): void {
        this.initStorage();
        const storageKey = `${this.USER_PREFIX}${userAddress}_${key}`;
        this.storage.setItem(storageKey, JSON.stringify(data));
    }

    static getUserData(userAddress: string, key: string): any {
        this.initStorage();
        const storageKey = `${this.USER_PREFIX}${userAddress}_${key}`;
        const data = this.storage.getItem(storageKey);
        return data ? JSON.parse(data) : null;
    }

    static clearUserData(userAddress: string): void {
        this.initStorage();
        Object.keys(this.storage).forEach(key => {
            if (key.startsWith(`${this.USER_PREFIX}${userAddress}`)) {
                this.storage.removeItem(key);
            }
        });
    }
}

export default LocalStorageManager;