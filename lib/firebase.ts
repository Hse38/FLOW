import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, get } from 'firebase/database';

// Firebase configuration - T3 Vakfı Org Chart
const firebaseConfig = {
  apiKey: "AIzaSyCrSbdQZSFd8VYWW8a-h2ToNs6FJSHZdXc",
  authDomain: "t3-vakfi-org.firebaseapp.com",
  databaseURL: "https://t3-vakfi-org-default-rtdb.firebaseio.com",
  projectId: "t3-vakfi-org",
  storageBucket: "t3-vakfi-org.firebasestorage.app",
  messagingSenderId: "218972745568",
  appId: "1:218972745568:web:4626c4ff1e03e9da323805",
  measurementId: "G-X2TN72QCF1"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Database references
export const getProjectsRef = () => ref(database, 'projects');
export const getProjectRef = (projectId: string) => ref(database, `projects/${projectId}`);
export const getOrgDataRef = (projectId: string) => ref(database, `orgData/${projectId}`);
export const getPositionsRef = (projectId: string) => ref(database, `positions/${projectId}`);
export const getConnectionsRef = (projectId: string) => ref(database, `connections/${projectId}`);
export const getLockedRef = () => ref(database, 'settings/locked');
export const getActiveProjectRef = () => ref(database, 'settings/activeProjectId');

// Export utilities
export { database, ref, onValue, set, update, remove, get };
