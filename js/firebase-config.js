// Configuración centralizada de Firebase para SingLing
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBMFxBxA6kfsbHylw3m0_QCl5fhJGAMJZ0",
  authDomain: "paapre-8c81a.firebaseapp.com",
  projectId: "paapre-8c81a",
  storageBucket: "paapre-8c81a.firebasestorage.app",
  messagingSenderId: "662329592959",
  appId: "1:662329592959:web:c960ab79783d7f9346034a"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  serverTimestamp
};

// Grados oficiales de Educación General Básica
export const gradesData = [
  { id: "1", name: "1ero de Básica", desc: "Preparatoria" },
  { id: "2", name: "2do de Básica", desc: "Básica Elemental" },
  { id: "3", name: "3ero de Básica", desc: "Básica Elemental" },
  { id: "4", name: "4to de Básica", desc: "Básica Elemental" },
  { id: "5", name: "5to de Básica", desc: "Básica Media" },
  { id: "6", name: "6to de Básica", desc: "Básica Media" },
  { id: "7", name: "7mo de Básica", desc: "Básica Media" }
];

// Helper para convertir links compartibles de Google Drive a links directos embebibles
export function cleanDriveLink(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("drive.google.com")) {
    const parts = trimmed.split('/');
    const fileId = trimmed.includes('id=') ? trimmed.split('id=')[1] : parts[parts.indexOf('d') + 1];
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId.split(/[?&]/)[0]}`;
    }
  }
  return trimmed;
}
