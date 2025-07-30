// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Variables Globales y Configuración de Firebase ---
// Estas variables son proporcionadas por el entorno de Canvas.
// Asegúrate de que estén disponibles en tu entorno de despliegue.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId = null; // Para almacenar el UID del usuario autenticado o un ID anónimo
let isAuthReady = false; // Bandera para indicar que la autenticación ha finalizado

// --- Referencias a elementos del DOM ---
const profileForm = document.getElementById('profile-form');
const systemMessage = document.getElementById('system-message');
const loadingOverlay = document.getElementById('loading-overlay');
const userIdDisplay = document.getElementById('user-id-display');

// --- Funciones de Utilidad ---

/**
 * Muestra un mensaje en la interfaz de usuario.
 * @param {string} message - El texto del mensaje.
 * @param {'success'|'error'|'info'} type - El tipo de mensaje para aplicar estilos.
 */
function showSystemMessage(message, type) {
    systemMessage.textContent = message;
    systemMessage.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800');
    if (type === 'success') {
        systemMessage.classList.add('bg-green-100', 'text-green-800');
    } else if (type === 'error') {
        systemMessage.classList.add('bg-red-100', 'text-red-800');
    } else { // info
        systemMessage.classList.add('bg-blue-100', 'text-blue-800');
    }
    systemMessage.classList.remove('hidden');
    setTimeout(() => {
        systemMessage.classList.add('hidden');
    }, 5000); // Ocultar después de 5 segundos
}

/**
 * Muestra u oculta el spinner de carga.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function toggleLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// --- Inicialización de Firebase ---
async function initializeFirebase() {
    try {
        toggleLoading(true);
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Escuchar cambios en el estado de autenticación
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplay.textContent = `ID de Usuario: ${userId}`;
                console.log('Usuario autenticado:', userId);
                isAuthReady = true;
                await loadUserProfile(); // Cargar el perfil una vez autenticado
            } else {
                // Si no hay usuario, intentar iniciar sesión de forma anónima
                console.log('No hay usuario autenticado, intentando inicio de sesión anónimo...');
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log('Inicio de sesión con token personalizado exitoso.');
                    } else {
                        await signInAnonymously(auth);
                        console.log('Inicio de sesión anónimo exitoso.');
                    }
                } catch (error) {
                    console.error('Error al iniciar sesión en Firebase:', error);
                    showSystemMessage('Error al iniciar sesión. Intenta recargar la página.', 'error');
                }
            }
            toggleLoading(false);
        });

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        showSystemMessage('Error al inicializar la aplicación. Por favor, revisa la consola.', 'error');
        toggleLoading(false);
    }
}

// --- Funciones de Firestore para el Perfil del Paciente ---

/**
 * Carga el perfil del usuario desde Firestore y rellena el formulario.
 */
async function loadUserProfile() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles, o autenticación no lista para cargar el perfil.');
        return;
    }

    toggleLoading(true);
    try {
        // Ruta para datos privados del usuario
        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'patientProfile');
        const docSnap = await getDoc(userProfileDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Perfil cargado:", data);
            // Rellenar el formulario con los datos cargados
            document.getElementById('name').value = data.name || '';
            document.getElementById('dob').value = data.dob || '';
            document.getElementById('dialysisType').value = data.dialysisType || '';
            document.getElementById('dialysisStartDate').value = data.dialysisStartDate || '';
            document.getElementById('emergencyContact').value = data.emergencyContact || '';
            document.getElementById('liquidLimit').value = data.liquidLimit || '';
            document.getElementById('potassiumLimit').value = data.potassiumLimit || '';
            document.getElementById('phosphorusLimit').value = data.phosphorusLimit || '';
            document.getElementById('sodiumLimit').value = data.sodiumLimit || '';
            document.getElementById('proteinLimit').value = data.proteinLimit || '';
            showSystemMessage('Perfil cargado exitosamente.', 'success');
        } else {
            console.log("No se encontró un perfil existente para este usuario.");
            showSystemMessage('Bienvenido/a. Por favor, completa tu perfil.', 'info');
        }
    } catch (e) {
        console.error("Error al cargar el perfil del paciente:", e);
        showSystemMessage('Error al cargar el perfil. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Guarda el perfil del usuario en Firestore.
 * @param {Event} event - El evento de envío del formulario.
 */
async function saveUserProfile(event) {
    event.preventDefault(); // Prevenir el envío por defecto del formulario

    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista. Por favor, espera o recarga la página.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const formData = new FormData(profileForm);
        const profileData = {};
        for (let [key, value] of formData.entries()) {
            // Convertir valores numéricos a número si es posible
            profileData[key] = (key.includes('Limit') && value !== '') ? parseFloat(value) : value;
        }

        // Ruta para datos privados del usuario
        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'patientProfile');
        await setDoc(userProfileDocRef, profileData, { merge: true }); // Usar merge para actualizar campos existentes sin sobrescribir todo

        console.log("Perfil guardado exitosamente:", profileData);
        showSystemMessage('¡Perfil guardado exitosamente!', 'success');
    } catch (e) {
        console.error("Error al guardar el perfil del paciente:", e);
        showSystemMessage('Error al guardar el perfil. Por favor, intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// --- Registro del Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Fallo el registro del Service Worker:', error);
            });
    });
}

// --- Event Listeners ---
window.addEventListener('load', initializeFirebase); // Inicializar Firebase cuando la página cargue
profileForm.addEventListener('submit', saveUserProfile); // Escuchar el envío del formulario de perfil
