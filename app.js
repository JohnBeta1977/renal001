// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, orderBy, where, onSnapshot, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


// --- Credenciales de Firebase ---
const firebaseConfig = {
    apiKey: "AIzaSyCt-gYdvPvUId9Uv7_LlzMDRNozuQre6aU",
    authDomain: "rnl01-8d925.firebaseapp.com",
    projectId: "rnl01-8d925",
    storageBucket: "rnl01-8d925.firebaseapp.com",
    messagingSenderId: "176287262226",
    appId: "1:176287262226:web:a3a62140b8a974a3031acb",
    measurementId: "G-8F1ZZP1007"
};

// --- Variables Globales ---
const appId = firebaseConfig.projectId; // Usamos el projectId como ID de la aplicación en Firestore

let app;
let db;
let auth;
let analytics;
let storage;
let userId = null;
let isAuthReady = false;
let dailyLiquidLimit = 0; // Límite de líquidos del perfil del usuario
let userName = "Paciente"; // Nombre del usuario para la pantalla de inicio

// Variables para el flujo de registro guiado
let currentGuidedFlowType = null; // 'hemodialysis', 'cardiology', 'autism', 'none'
let currentGuidedFlowIndex = -1; // -1: profile, 0: first section in flow, etc.
let isRegistrationComplete = false; // True if the guided flow has been completed
let userProfileLoaded = false; // Para asegurar que el perfil se ha cargado antes de iniciar el flujo guiado

// Define las secciones para cada tipo de flujo guiado (excluyendo 'profile-section' ya que es el inicio)
// Las secciones se listan en el orden en que aparecerán en el flujo guiado.
const guidedFlowSections = {
    'hemodialysis': ['liquids-section', 'meds-section', 'labs-section', 'agenda-section', 'wellness-section'],
    'peritoneal': ['liquids-section', 'meds-section', 'labs-section', 'agenda-section', 'wellness-section'],
    'cardiology': ['meds-section', 'labs-section', 'agenda-section', 'cardiology-section', 'wellness-section'],
    'autism': ['meds-section', 'labs-section', 'agenda-section', 'autism-section', 'wellness-section'],
    'none': ['meds-section', 'labs-section', 'agenda-section', 'wellness-section']
};
let currentGuidedFlow = []; // Array que contendrá el flujo de secciones para el tipo de usuario actual


// --- Referencias a elementos del DOM ---
const mainHeader = document.getElementById('main-header');
const profileSection = document.getElementById('profile-section');
const liquidsSection = document.getElementById('liquids-section');
const medsSection = document.getElementById('meds-section');
const labsSection = document.getElementById('labs-section');
const agendaSection = document.getElementById('agenda-section');
const cardiologySection = document.getElementById('cardiology-section');
const autismSection = document.getElementById('autism-section'); // Ahora ATM Leve
const wellnessSection = document.getElementById('wellness-section');

const profileForm = document.getElementById('profile-form');
const systemMessage = document.getElementById('system-message');
const loadingOverlay = document.getElementById('loading-overlay');
const profilePictureInput = document.getElementById('profilePicture');
const profilePicturePreview = document.getElementById('profile-picture-preview');
const selectedFileNameDisplay = document.getElementById('selected-file-name'); // Nuevo: para mostrar el nombre del archivo
const dialysisTypeSelect = document.getElementById('dialysisType'); // Referencia al select de tipo de diálisis/condición

const profileSaveButton = document.getElementById('profile-save-button'); // Botón de guardar perfil
const guidedActionButton = document.getElementById('guided-action-button'); // Nuevo botón de acción flotante

// Elementos de la sección de líquidos
const dailyLimitDisplay = document.getElementById('daily-limit');
const consumedTodayDisplay = document.getElementById('consumed-today');
const remainingLiquidDisplay = document.getElementById('remaining-liquid');
const liquidAmountInput = document.getElementById('liquid-amount-input');
const addLiquidButton = document.getElementById('add-liquid-button');
const liquidHistoryList = document.getElementById('liquid-history-list');
const noLiquidEntriesMessage = document.getElementById('no-liquid-entries');
const settingsButton = document.getElementById('settings-button');

// Elementos de la sección de medicamentos
const newMedFrequencySelect = document.getElementById('new-med-frequency');
const medTimesContainer = document.getElementById('med-times-container');
const addNewMedButton = document.getElementById('add-new-med-button');
const medsList = document.getElementById('meds-list');
const noMedsEntriesMessage = document.getElementById('no-meds-entries');

// Elementos de la sección de agenda
const newContactNameInput = document.getElementById('new-contact-name');
const newContactPhoneInput = document.getElementById('new-contact-phone');
const newContactProfessionInput = document.getElementById('new-contact-profession');
const addNewContactButton = document.getElementById('add-new-contact-button');
const contactsList = document.getElementById('contacts-list');
const noContactsEntriesMessage = document.getElementById('no-contacts-entries');

// Elementos de la sección de cardiología
const bpSystolicInput = document.getElementById('bp-systolic');
const bpDiastolicInput = document.getElementById('bp-diastolic');
const heartRateInput = document.getElementById('heart-rate');
const addBpReadingButton = document.getElementById('add-bp-reading-button');
const bpHistoryList = document.getElementById('bp-history-list');
const noBpEntriesMessage = document.getElementById('no-bp-entries');
const cardiacSymptomInput = document.getElementById('cardiac-symptom');
const symptomIntensitySelect = document.getElementById('symptom-intensity');
const symptomDurationInput = document.getElementById('symptom-duration');
const addCardiacSymptomButton = document.getElementById('add-cardiac-symptom-button');
const cardiacSymptomHistoryList = document.getElementById('cardiac-symptom-history-list');
const noCardiacSymptomsMessage = document.getElementById('no-cardiac-symptoms');

// Elementos de la sección de autismo (ahora ATM)
const routineTaskNameInput = document.getElementById('routine-task-name');
const routineTaskIconInput = document.getElementById('routine-task-icon');
const addRoutineTaskButton = document.getElementById('add-routine-task-button');
const routineTasksList = document.getElementById('routine-tasks-list');
const noRoutineTasksMessage = document.getElementById('no-routine-tasks');
const behaviorEmotionInput = document.getElementById('behavior-emotion');
const behaviorNotesInput = document.getElementById('behavior-notes');
const addBehaviorButton = document.getElementById('add-behavior-button');
const behaviorHistoryList = document.getElementById('behavior-history-list');
const noBehaviorEntriesMessage = document.getElementById('no-behavior-entries');

// Elementos de la sección de bienestar general
const weightInput = document.getElementById('weight-input');
const glucoseInput = document.getElementById('glucose-input');
const addWellnessMetricButton = document.getElementById('add-wellness-metric-button');
const wellnessMetricsList = document.getElementById('wellness-metrics-list');
const noWellnessMetricsMessage = document.getElementById('no-wellness-metrics');
const sleepHoursInput = document.getElementById('sleep-hours');
const sleepQualitySelect = document.getElementById('sleep-quality');
const sleepNotesInput = document.getElementById('sleep-notes');
const addSleepRecordButton = document.getElementById('add-sleep-record-button');
const sleepHistoryList = document.getElementById('sleep-history-list');
const noSleepEntriesMessage = document.getElementById('no-sleep-entries');


// Elementos de navegación inferior
const navProfileButton = document.getElementById('nav-profile');
const navLiquidsButton = document.getElementById('nav-liquids');
const navMedsButton = document.getElementById('nav-meds');
const navLabsButton = document.getElementById('nav-labs');
const navMoreButton = document.getElementById('nav-more'); // Nuevo botón "Más"
const moreOptionsDropdown = document.getElementById('more-options-dropdown'); // Contenedor del menú desplegable

// Botones dentro del menú desplegable (también referenciados para gestión de visibilidad)
const navAgendaButton = document.getElementById('nav-agenda');
const navCardiologyButton = document.getElementById('nav-cardiology');
const navAutismButton = document.getElementById('nav-autism');
const navWellnessButton = document.getElementById('nav-wellness');


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

/**
 * Cambia la sección visible de la aplicación.
 * @param {string} sectionId - El ID de la sección a mostrar ('profile-section', 'liquids-section', etc.).
 */
function showSection(sectionId) {
    console.log(`Attempting to show section: ${sectionId}`);
    const sections = [profileSection, liquidsSection, medsSection, labsSection, agendaSection, cardiologySection, autismSection, wellnessSection];
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
            console.log(`Section ${sectionId} is now visible.`);
        } else {
            section.classList.add('hidden');
        }
    });

    // Actualizar el estado activo de los botones de navegación principales
    const mainNavButtons = [navProfileButton, navLiquidsButton, navMedsButton, navLabsButton, navMoreButton];
    mainNavButtons.forEach(button => {
        button.classList.remove('active');
        if (button.id === `nav-${sectionId.replace('-section', '')}`) {
            button.classList.add('active');
        }
    });

    // Actualizar el estado activo de los botones dentro del menú desplegable
    const dropdownNavButtons = [navAgendaButton, navCardiologyButton, navAutismButton, navWellnessButton];
    dropdownNavButtons.forEach(button => {
        button.classList.remove('active');
        if (button.id === `nav-${sectionId.replace('-section', '')}`) {
            button.classList.add('active');
            // Si una sección del dropdown está activa, el botón "Más" también debe estarlo
            navMoreButton.classList.add('active');
        }
    });

    // Ocultar el menú desplegable si se navega a una sección
    moreOptionsDropdown.classList.add('hidden');
}

/**
 * Controla la visibilidad de las secciones de Cardiología y ATM (Autismo)
 * basándose en el tipo de diálisis/condición seleccionado en el perfil.
 */
function updateConditionalSectionsVisibility() {
    const selectedType = dialysisTypeSelect.value;

    // Ocultar todas las secciones condicionales y sus botones por defecto
    cardiologySection.classList.add('hidden');
    navCardiologyButton.classList.add('hidden');
    autismSection.classList.add('hidden');
    navAutismButton.classList.add('hidden');

    // Mostrar solo la sección y el botón de navegación si el tipo de diálisis/condición coincide
    if (selectedType === 'cardiology') {
        cardiologySection.classList.remove('hidden');
        navCardiologyButton.classList.remove('hidden');
    } else if (selectedType === 'autism') { // 'autism' es el valor en el select para 'ATM Leve'
        autismSection.classList.remove('hidden');
        navAutismButton.classList.remove('hidden');
    }
}

/**
 * Actualiza el estado del botón de acción flotante (Iniciar Registro Guiado / Siguiente / Finalizar Registro).
 */
function updateGuidedFlowState() {
    if (!userProfileLoaded || isRegistrationComplete) {
        guidedActionButton.classList.add('hidden');
        return;
    }

    guidedActionButton.classList.remove('hidden');
    if (currentGuidedFlowIndex === -1) {
        guidedActionButton.textContent = 'Iniciar Registro Guiado';
    } else if (currentGuidedFlowIndex < currentGuidedFlow.length - 1) {
        guidedActionButton.textContent = 'Siguiente';
    } else {
        guidedActionButton.textContent = 'Finalizar Registro';
    }
}

/**
 * Actualiza el estado de los botones de navegación inferior (habilitar/deshabilitar, mostrar/ocultar).
 */
function updateNavigationButtonsState() {
    const mainNavButtons = [navProfileButton, navLiquidsButton, navMedsButton, navLabsButton, navMoreButton];
    const dropdownNavButtons = [navAgendaButton, navCardiologyButton, navAutismButton, navWellnessButton];

    mainNavButtons.forEach(button => {
        if (isRegistrationComplete) {
            button.removeAttribute('disabled');
            button.classList.remove('opacity-50', 'cursor-not-allowed');
            button.classList.remove('hidden'); // Asegurar que los botones principales estén visibles
        } else {
            // Durante el registro, solo Perfil y el botón "Más" (si se necesita para el flujo) están activos.
            // Los demás están deshabilitados y ocultos si no son parte del flujo actual.
            button.setAttribute('disabled', 'true');
            button.classList.add('opacity-50', 'cursor-not-allowed');
            if (button.id === 'nav-profile' || button.id === 'nav-more') { // Siempre habilitar Perfil y Más
                button.removeAttribute('disabled');
                button.classList.remove('opacity-50', 'cursor-not-allowed');
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden'); // Ocultar los demás botones principales
            }
        }
    });

    dropdownNavButtons.forEach(button => {
        if (isRegistrationComplete) {
            button.removeAttribute('disabled');
            button.classList.remove('opacity-50', 'cursor-not-allowed');
            // La visibilidad de Cardiología y ATM se maneja por updateConditionalSectionsVisibility
            if (button.id === 'nav-cardiology' || button.id === 'nav-autism') {
                // Su visibilidad real se establecerá por updateConditionalSectionsVisibility
                // No la ocultamos aquí para que updateConditionalSectionsVisibility tenga control
            } else {
                button.classList.remove('hidden'); // Mostrar Agenda y Bienestar
            }
        } else {
            button.setAttribute('disabled', 'true');
            button.classList.add('opacity-50', 'cursor-not-allowed');
            button.classList.add('hidden'); // Ocultar todos los botones del dropdown durante el registro
        }
    });

    // Asegurar que la visibilidad condicional se aplique también a los botones del dropdown
    updateConditionalSectionsVisibility();
}


// --- Inicialización de Firebase ---
async function initializeFirebase() {
    console.log('Initializing Firebase...');
    try {
        toggleLoading(true);
        app = initializeApp(firebaseConfig);
        analytics = getAnalytics(app);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed. User:', user ? user.uid : 'none');
            if (user) {
                userId = user.uid;
                console.log('Usuario autenticado:', userId);
                isAuthReady = true;
                await loadUserProfile(); // Cargar el perfil para obtener el liquidLimit, etc.
                setupLiquidTrackerListener(); // Configurar el listener de líquidos
                setupMedsListener(); // Configurar el listener de medicamentos
                setupLabsListener(); // Configurar el listener de citas/laboratorios
                setupContactsListener(); // Configurar el listener de contactos
                setupCardiologyListeners(); // Configurar listeners de cardiología
                setupAutismListeners(); // Configurar listeners de autismo
                setupWellnessListeners(); // Configurar listeners de bienestar
                
                // Actualizar el estado de la UI después de cargar el perfil
                updateGuidedFlowState();
                updateNavigationButtonsState();
                showSection('profile-section'); // Siempre iniciar en la sección de perfil

            } else {
                console.log('No hay usuario autenticado, intentando inicio de sesión anónimo...');
                try {
                    await signInAnonymously(auth);
                    console.log('Inicio de sesión anónimo exitoso.');
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

// --- Funciones de Firebase Storage ---

/**
 * Sube la foto de perfil del usuario a Firebase Storage.
 * @param {File} file - El archivo de imagen a subir.
 * @returns {Promise<string|null>} La URL de descarga de la imagen o null si hay un error.
 */
async function uploadProfilePicture(file) {
    if (!storage || !userId) {
        console.error("Firebase Storage o userId no disponibles para la subida.");
        showSystemMessage('Error: No se pudo subir la imagen. Firebase Storage no está listo.', 'error');
        return null;
    }

    // Ruta de almacenamiento corregida a '/image/profile_pictures/'
    const storageRef = ref(storage, `image/profile_pictures/${userId}/${file.name}`);
    try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('Imagen subida exitosamente:', downloadURL);
        return downloadURL;
    } catch (error) {
        console.error("Error al subir la imagen de perfil:", error);
        showSystemMessage('Error al subir la foto de perfil. Intenta de nuevo.', 'error');
        return null;
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

    try {
        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'patientProfile');
        const docSnap = await getDoc(userProfileDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Perfil cargado:", data);

            document.getElementById('name').value = data.name || '';
            document.getElementById('bloodType').value = data.bloodType || '';
            document.getElementById('ipsName').value = data.ipsName || '';
            document.getElementById('dialysisClinicName').value = data.dialysisClinicName || '';
            document.getElementById('clinicPhone').value = data.clinicPhone || '';
            dialysisTypeSelect.value = data.dialysisType || ''; 
            document.getElementById('hemodialysisTime').value = data.hemodialysisTime || '';

            const hemodialysisDaysCheckboxes = document.querySelectorAll('input[name="hemodialysisDays"]');
            hemodialysisDaysCheckboxes.forEach(checkbox => {
                checkbox.checked = data.hemodialysisDays && data.hemodialysisDays.includes(checkbox.value);
            });

            document.getElementById('emergencyContactName').value = data.emergencyContactName || '';
            document.getElementById('emergencyContactPhone').value = data.emergencyContactPhone || '';
            
            if (data.profilePictureUrl) {
                profilePicturePreview.src = data.profilePictureUrl;
                // Mostrar el nombre del archivo si hay una URL de imagen
                const fileName = data.profilePictureUrl.substring(data.profilePictureUrl.lastIndexOf('/') + 1).split('?')[0];
                selectedFileNameDisplay.textContent = fileName;
            } else {
                profilePicturePreview.src = "https://placehold.co/80x80/cccccc/333333?text=Foto";
                selectedFileNameDisplay.textContent = 'Ningún archivo seleccionado';
            }

            dailyLiquidLimit = data.liquidLimit || 2000;
            dailyLimitDisplay.textContent = `${dailyLiquidLimit} ml`;
            userName = data.name || "Paciente";

            isRegistrationComplete = data.isRegistrationComplete || false;
            currentGuidedFlowType = data.dialysisType || null; // Cargar el tipo de flujo guardado
            currentGuidedFlow = guidedFlowSections[currentGuidedFlowType] || guidedFlowSections['none']; // Set the flow based on loaded type

            showSystemMessage('Perfil cargado exitosamente.', 'success');
        } else {
            console.log("No se encontró un perfil existente para este usuario.");
            showSystemMessage('Bienvenido/a. Por favor, completa tu perfil.', 'info');
            dailyLiquidLimit = 2000;
            dailyLimitDisplay.textContent = `${dailyLiquidLimit} ml`;
            isRegistrationComplete = false;
            selectedFileNameDisplay.textContent = 'Ningún archivo seleccionado'; // Resetear al cargar un perfil nuevo
        }
    } catch (e) {
        console.error("Error al cargar el perfil del paciente:", e);
        showSystemMessage('Error al cargar el perfil. Intenta de nuevo.', 'error');
    } finally {
        userProfileLoaded = true; // El perfil ya fue cargado, se puede iniciar el flujo guiado si aplica
    }
}

/**
 * Guarda el perfil del usuario en Firestore.
 * @param {Event} event - El evento de envío del formulario.
 */
async function saveUserProfile(event) {
    event.preventDefault();

    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista. Por favor, espera o recarga la página.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const formData = new FormData(profileForm);
        const profileData = {};
        let profilePictureUrl = profilePicturePreview.src;

        for (let [key, value] of formData.entries()) {
            if (key === 'hemodialysisDays') {
                if (!profileData.hemodialysisDays) {
                    profileData.hemodialysisDays = [];
                }
                profileData.hemodialysisDays.push(value);
            } else if (key !== 'profilePicture') {
                profileData[key] = value;
            }
        }

        const profilePictureFile = profilePictureInput.files[0];
        if (profilePictureFile) {
            showSystemMessage('Subiendo foto de perfil...', 'info');
            const uploadedUrl = await uploadProfilePicture(profilePictureFile);
            if (uploadedUrl) {
                profilePictureUrl = uploadedUrl;
                profilePicturePreview.src = uploadedUrl;
                selectedFileNameDisplay.textContent = profilePictureFile.name;
            } else {
                showSystemMessage('Fallo al subir la foto de perfil. Se guardará el perfil sin la nueva imagen.', 'error');
            }
        }
        
        profileData.profilePictureUrl = profilePictureUrl;
        profileData.liquidLimit = dailyLiquidLimit;
        profileData.isRegistrationComplete = isRegistrationComplete; // Guardar el estado de registro
        profileData.dialysisType = dialysisTypeSelect.value; // Asegurarse de guardar el tipo de diálisis/condición

        const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'patientProfile');
        await setDoc(userProfileDocRef, profileData, { merge: true });

        console.log("Perfil guardado exitosamente:", profileData);
        showSystemMessage('¡Perfil guardado exitosamente!', 'success');

        userName = profileData.name || "Paciente";
        currentGuidedFlowType = profileData.dialysisType; // Actualizar el tipo de flujo
        currentGuidedFlow = guidedFlowSections[currentGuidedFlowType] || guidedFlowSections['none']; // Reset the flow based on new type

        // Actualizar la visibilidad de las secciones condicionales y el botón guiado
        updateConditionalSectionsVisibility();
        updateGuidedFlowState();
        updateNavigationButtonsState(); // Actualizar el estado de los botones de navegación

    } catch (e) {
        console.error("Error al guardar el perfil del paciente:", e);
        showSystemMessage('Error al guardar el perfil. Por favor, intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Maneja el clic en el botón de acción flotante para el flujo guiado.
 */
async function handleGuidedActionClick() {
    if (!db || !userId || !isAuthReady || !userProfileLoaded) {
        showSystemMessage('La aplicación no está lista. Por favor, espera o recarga la página.', 'error');
        return;
    }

    if (isRegistrationComplete) {
        // Si el registro ya está completo, el botón debería estar oculto.
        return; 
    }

    toggleLoading(true);
    try {
        if (currentGuidedFlowIndex === -1) { // Iniciar el registro guiado
            if (!currentGuidedFlowType || currentGuidedFlowType === "") {
                showSystemMessage('Por favor, selecciona tu "Tipo de Diálisis / Condición" en el perfil y guarda antes de iniciar el registro guiado.', 'info');
                toggleLoading(false);
                return;
            }
            currentGuidedFlow = guidedFlowSections[currentGuidedFlowType] || guidedFlowSections['none'];
            currentGuidedFlowIndex = 0;
            showSection(currentGuidedFlow[currentGuidedFlowIndex]);
            showSystemMessage('Iniciando el registro guiado...', 'info');
        } else if (currentGuidedFlowIndex < currentGuidedFlow.length - 1) { // Siguiente paso
            currentGuidedFlowIndex++;
            showSection(currentGuidedFlow[currentGuidedFlowIndex]);
            showSystemMessage('Avanzando al siguiente paso.', 'info');
        } else { // Finalizar registro
            isRegistrationComplete = true;
            // Guardar el estado de registro completo en Firestore
            const userProfileDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, 'patientProfile');
            await setDoc(userProfileDocRef, { isRegistrationComplete: true }, { merge: true });

            showSystemMessage('Registro completado. ¡Bienvenido/a a RenalCare!', 'success');
            showSection('profile-section'); // Redirigir al perfil después de completar
        }
    } catch (e) {
        console.error("Error en el flujo guiado:", e);
        showSystemMessage('Ocurrió un error en el flujo de registro. Intenta de nuevo.', 'error');
    } finally {
        updateGuidedFlowState(); // Actualizar el estado del botón flotante
        updateNavigationButtonsState(); // Actualizar el estado de los botones de navegación
        toggleLoading(false);
    }
}


// --- Funciones de Seguimiento de Líquidos ---

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 * @returns {string} Fecha actual.
 */
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Configura el listener en tiempo real para la ingesta de líquidos de hoy.
 */
function setupLiquidTrackerListener() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para el listener de líquidos.');
        return;
    }

    const todayDate = getTodayDateString();
    const liquidCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/dailyLiquidIntake`);
    
    const q = query(
        liquidCollectionRef,
        where("date", "==", todayDate)
        // orderBy("timestamp", "asc") // Requiere índice compuesto si se usa con where en otro campo
    );

    onSnapshot(q, (snapshot) => {
        let totalConsumed = 0;
        liquidHistoryList.innerHTML = '';
        const entries = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            totalConsumed += data.amount;
            entries.push({ id: doc.id, ...data });
        });

        entries.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.toDate() : new Date(0);
            const timeB = b.timestamp ? b.timestamp.toDate() : new Date(0);
            return timeA - timeB;
        });


        if (entries.length === 0) {
            noLiquidEntriesMessage.classList.remove('hidden');
        } else {
            noLiquidEntriesMessage.classList.add('hidden');
            entries.forEach(entry => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center bg-gray-50 p-3 rounded-md shadow-sm';
                const time = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                li.innerHTML = `
                    <span>${entry.amount} ml - ${time}</span>
                    <button data-id="${entry.id}" class="delete-liquid-entry text-red-500 hover:text-red-700 focus:outline-none">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                liquidHistoryList.appendChild(li);
            });
            document.querySelectorAll('.delete-liquid-entry').forEach(button => {
                button.addEventListener('click', deleteLiquidEntry);
            });
        }

        consumedTodayDisplay.textContent = totalConsumed;
        const remaining = dailyLiquidLimit - totalConsumed;
        remainingLiquidDisplay.textContent = remaining;

        if (remaining < 0) {
            remainingLiquidDisplay.classList.remove('text-blue-600');
            remainingLiquidDisplay.classList.add('text-red-600');
        } else {
            remainingLiquidDisplay.classList.remove('text-red-600');
            remainingLiquidDisplay.classList.add('text-blue-600');
        }

    }, (error) => {
        console.error("Error al obtener datos de líquidos en tiempo real:", error);
        showSystemMessage('Error al cargar el historial de líquidos.', 'error');
    });
}

/**
 * Añade una nueva entrada de líquido.
 */
async function addLiquidEntry() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir líquidos.', 'error');
        return;
    }

    const amount = parseFloat(liquidAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showSystemMessage('Por favor, ingresa una cantidad válida de líquido (mayor que 0).', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const liquidCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/dailyLiquidIntake`);
        await addDoc(liquidCollectionRef, {
            amount: amount,
            date: getTodayDateString(),
            timestamp: serverTimestamp()
        });
        liquidAmountInput.value = '';
        showSystemMessage('Líquido registrado exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir entrada de líquido:", e);
        showSystemMessage('Error al registrar el líquido. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de líquido.
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteLiquidEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar líquidos.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    if (!entryId) {
        console.error("ID de entrada de líquido no encontrado.");
        showSystemMessage('Error: No se pudo identificar el registro a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/dailyLiquidIntake`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Registro de líquido eliminado.', 'success');
    } catch (e) {
        console.error("Error al eliminar entrada de líquido:", e);
        showSystemMessage('Error al eliminar el registro. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// --- Funciones de Medicamentos ---

/**
 * Configura el listener en tiempo real para los medicamentos.
 */
function setupMedsListener() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para el listener de medicamentos.');
        return;
    }

    const medsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/medications`);
    const q = query(medsCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        medsList.innerHTML = '';
        const meds = [];
        snapshot.forEach((doc) => {
            meds.push({ id: doc.id, ...doc.data() });
        });

        if (meds.length === 0) {
            noMedsEntriesMessage.classList.remove('hidden');
        } else {
            noMedsEntriesMessage.classList.add('hidden');
            meds.forEach(med => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${med.name} - ${med.dose}</p>
                        <p class="text-sm text-gray-600">Frecuencia: ${med.frequency} - Hora(s): ${med.times.join(', ')}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-md text-sm">Tomado</button>
                        <button data-id="${med.id}" class="edit-med-entry bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md text-sm">Editar</button>
                        <button data-id="${med.id}" class="delete-med-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                medsList.appendChild(li);
            });
            document.querySelectorAll('.delete-med-entry').forEach(button => {
                button.addEventListener('click', deleteMedEntry);
            });
            document.querySelectorAll('.edit-med-entry').forEach(button => {
                button.addEventListener('click', () => showSystemMessage('Funcionalidad de edición de medicamentos se implementará aquí.', 'info'));
            });
        }
    }, (error) => {
        console.error("Error al obtener datos de medicamentos en tiempo real:", error);
        showSystemMessage('Error al cargar la lista de medicamentos.', 'error');
    });
}

/**
 * Genera los campos de entrada de hora dinámicamente según la frecuencia seleccionada.
 */
function generateMedTimeInputs() {
    const frequency = newMedFrequencySelect.value;
    medTimesContainer.innerHTML = ''; // Limpiar campos existentes

    let numberOfInputs = 0;
    if (frequency === 'daily' || frequency === 'weekly' || frequency === 'as-needed' || frequency === '') {
        numberOfInputs = 1; // Un campo por defecto si no se selecciona nada o es diario/semanal/según necesidad
    } else if (frequency === 'twice-daily') {
        numberOfInputs = 2;
    } else if (frequency === 'three-times-daily') {
        numberOfInputs = 3;
    }

    if (numberOfInputs > 0) {
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-gray-700 mb-1';
        label.textContent = 'Hora(s)';
        medTimesContainer.appendChild(label);

        for (let i = 0; i < numberOfInputs; i++) {
            const input = document.createElement('input');
            input.type = 'time';
            input.name = `medTime${i}`; // Usar nombres únicos para cada campo de hora
            input.className = 'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2';
            medTimesContainer.appendChild(input);
        }
    }
}

/**
 * Añade un nuevo medicamento a Firestore.
 */
async function addNewMed() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir medicamentos.', 'error');
        return;
    }

    const name = document.getElementById('new-med-name').value.trim();
    const dose = document.getElementById('new-med-dose').value.trim();
    const frequency = newMedFrequencySelect.value;
    
    // Recolectar todas las horas dinámicamente
    const times = Array.from(medTimesContainer.querySelectorAll('input[type="time"]')).map(input => input.value).filter(time => time);

    if (!name || !dose || !frequency || (times.length === 0 && frequency !== 'as-needed')) {
        showSystemMessage('Por favor, completa todos los campos del medicamento, incluyendo al menos una hora si aplica.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const medsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/medications`);
        await addDoc(medsCollectionRef, {
            name: name,
            dose: dose,
            frequency: frequency,
            times: times,
            timestamp: serverTimestamp()
        });
        
        // Limpiar campos
        document.getElementById('new-med-name').value = '';
        document.getElementById('new-med-dose').value = '';
        newMedFrequencySelect.value = '';
        generateMedTimeInputs(); // Volver a generar los campos de hora (probablemente ninguno o uno vacío)

        showSystemMessage('Medicamento añadido exitosamente.', 'success');
    }
    catch (e) {
        console.error("Error al añadir medicamento:", e);
        showSystemMessage('Error al añadir el medicamento. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de medicamento.
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteMedEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar medicamentos.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    if (!entryId) {
        console.error("ID de medicamento no encontrado.");
        showSystemMessage('Error: No se pudo identificar el medicamento a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/medications`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Medicamento eliminado.', 'success');
    } catch (e) {
        console.error("Error al eliminar medicamento:", e);
        showSystemMessage('Error al eliminar el medicamento. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// --- Funciones de Citas/Laboratorios ---

/**
 * Configura el listener en tiempo real para las citas y laboratorios.
 */
function setupLabsListener() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para el listener de citas/labs.');
        return;
    }

    // Listener para citas
    const appointmentsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/appointments`);
    const appointmentsQuery = query(appointmentsCollectionRef, orderBy("date", "asc"), orderBy("time", "asc"));

    onSnapshot(appointmentsQuery, (snapshot) => {
        appointmentsList.innerHTML = '';
        const appointments = [];
        snapshot.forEach((doc) => {
            appointments.push({ id: doc.id, ...doc.data() });
        });

        if (appointments.length === 0) {
            noAppointmentsEntriesMessage.classList.remove('hidden');
        } else {
            noAppointmentsEntriesMessage.classList.add('hidden');
            appointments.forEach(appointment => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${appointment.name}</p>
                        <p class="text-sm text-gray-600">Fecha: ${appointment.date} - Hora: ${appointment.time} - Lugar: ${appointment.place}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${appointment.id}" data-collection="appointments" class="edit-labs-entry bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md text-sm">Editar</button>
                        <button data-id="${appointment.id}" data-collection="appointments" class="delete-labs-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                appointmentsList.appendChild(li);
            });
            document.querySelectorAll('.delete-labs-entry[data-collection="appointments"]').forEach(button => {
                button.addEventListener('click', deleteLabsEntry);
            });
            document.querySelectorAll('.edit-labs-entry[data-collection="appointments"]').forEach(button => {
                button.addEventListener('click', () => showSystemMessage('Funcionalidad de edición de citas se implementará aquí.', 'info'));
            });
        }
    }, (error) => {
        console.error("Error al obtener citas en tiempo real:", error);
        showSystemMessage('Error al cargar la lista de citas.', 'error');
    });

    // Listener para resultados de laboratorio
    const labResultsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/labResults`);
    const labResultsQuery = query(labResultsCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(labResultsQuery, (snapshot) => {
        labResultsList.innerHTML = '';
        const labResults = [];
        snapshot.forEach((doc) => {
            labResults.push({ id: doc.id, ...doc.data() });
        });

        if (labResults.length === 0) {
            noLabResultsEntriesMessage.classList.remove('hidden');
        } else {
            noLabResultsEntriesMessage.classList.add('hidden');
            labResults.forEach(result => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${result.testName}: ${result.value}</p>
                        <p class="text-sm text-gray-600">Fecha: ${result.date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${result.id}" data-collection="labResults" class="edit-labs-entry bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md text-sm">Editar</button>
                        <button data-id="${result.id}" data-collection="labResults" class="delete-labs-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                labResultsList.appendChild(li);
            });
            document.querySelectorAll('.delete-labs-entry[data-collection="labResults"]').forEach(button => {
                button.addEventListener('click', deleteLabsEntry);
            });
            document.querySelectorAll('.edit-labs-entry[data-collection="labResults"]').forEach(button => {
                button.addEventListener('click', () => showSystemMessage('Funcionalidad de edición de resultados de laboratorio se implementará aquí.', 'info'));
            });
        }
    }, (error) => {
        console.error("Error al obtener resultados de laboratorio en tiempo real:", error);
        showSystemMessage('Error al cargar el historial de laboratorios.', 'error');
    });
}

/**
 * Añade una nueva cita a Firestore.
 */
async function addNewAppointment() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir citas.', 'error');
        return;
    }

    const name = document.getElementById('new-appointment-name').value.trim();
    const date = document.getElementById('new-appointment-date').value;
    const time = document.getElementById('new-appointment-time').value;
    const place = document.getElementById('new-appointment-place').value.trim();

    if (!name || !date || !time || !place) {
        showSystemMessage('Por favor, completa todos los campos de la cita.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const appointmentsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/appointments`);
        await addDoc(appointmentsCollectionRef, {
            name: name,
            date: date,
            time: time,
            place: place,
            timestamp: serverTimestamp() // Para ordenar si es necesario
        });
        
        // Limpiar campos
        document.getElementById('new-appointment-name').value = '';
        document.getElementById('new-appointment-date').value = '';
        document.getElementById('new-appointment-time').value = '';
        document.getElementById('new-appointment-place').value = '';

        showSystemMessage('Cita añadida exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir cita:", e);
        showSystemMessage('Error al añadir la cita. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Añade un nuevo resultado de laboratorio a Firestore.
 */
async function addNewLabResult() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir resultados de laboratorio.', 'error');
        return;
    }

    const testName = document.getElementById('new-lab-test-name').value.trim();
    const value = document.getElementById('new-lab-result-value').value.trim();
    const date = document.getElementById('new-lab-result-date').value;

    if (!testName || !value || !date) {
        showSystemMessage('Por favor, completa todos los campos del resultado de laboratorio.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const labResultsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/labResults`);
        await addDoc(labResultsCollectionRef, {
            testName: testName,
            value: value,
            date: date,
            timestamp: serverTimestamp() // Para ordenar si es necesario
        });
        
        // Limpiar campos
        document.getElementById('new-lab-test-name').value = '';
        document.getElementById('new-lab-result-value').value = '';
        document.getElementById('new-lab-result-date').value = '';

        showSystemMessage('Resultado de laboratorio añadido exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir resultado de laboratorio:", e);
        showSystemMessage('Error al añadir el resultado de laboratorio. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de citas o laboratorios.
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteLabsEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar registros.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    const collectionName = event.currentTarget.dataset.collection;
    if (!entryId || !collectionName) {
        console.error("ID de entrada o nombre de colección no encontrado.");
        showSystemMessage('Error: No se pudo identificar el registro a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Registro eliminado.', 'success');
    } catch (e) {
        console.error(`Error al eliminar entrada de ${collectionName}:`, e);
        showSystemMessage(`Error al eliminar el registro de ${collectionName}. Intenta de nuevo.`, 'error');
    } finally {
        toggleLoading(false);
    }
}


// --- Funciones de Agenda / Contactos ---

/**
 * Configura el listener en tiempo real para los contactos.
 */
function setupContactsListener() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para el listener de contactos.');
        return;
    }

    const contactsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/contacts`);
    
    // Ordenar por nombre para una mejor visualización
    const q = query(contactsCollectionRef, orderBy("name", "asc"));

    onSnapshot(q, (snapshot) => {
        contactsList.innerHTML = ''; // Limpiar lista actual
        const contacts = [];

        snapshot.forEach((doc) => {
            contacts.push({ id: doc.id, ...doc.data() });
        });

        if (contacts.length === 0) {
            noContactsEntriesMessage.classList.remove('hidden');
        } else {
            noContactsEntriesMessage.classList.add('hidden');
            contacts.forEach(contact => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${contact.name}</p>
                        <p class="text-sm text-gray-600">Teléfono: ${contact.phone} - Cargo/Profesión: ${contact.profession}</p>
                    </div>
                    <div class="flex space-x-2">
                        <a href="tel:${contact.phone}" class="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm flex items-center">
                            <i class="fas fa-phone mr-1"></i> Llamar
                        </a>
                        <button data-id="${contact.id}" class="edit-contact-entry bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md text-sm">
                            Editar
                        </button>
                        <button data-id="${contact.id}" class="delete-contact-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">
                            Eliminar
                        </button>
                    </div>
                `;
                contactsList.appendChild(li);
            });
            // Añadir event listeners a los nuevos botones de eliminar
            document.querySelectorAll('.delete-contact-entry').forEach(button => {
                button.addEventListener('click', deleteContactEntry);
            });
            // Aquí se añadirían listeners para editar si se implementa esa funcionalidad
            document.querySelectorAll('.edit-contact-entry').forEach(button => {
                button.addEventListener('click', (event) => {
                    showSystemMessage('Funcionalidad de edición de contactos se implementará aquí.', 'info');
                    // Lógica para editar contacto
                });
            });
        }
    }, (error) => {
        console.error("Error al obtener datos de contactos en tiempo real:", error);
        showSystemMessage('Error al cargar la agenda de contactos.', 'error');
    });
}

/**
 * Añade un nuevo contacto a Firestore.
 */
async function addNewContact() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir contactos.', 'error');
        return;
    }

    const name = newContactNameInput.value.trim();
    const phone = newContactPhoneInput.value.trim();
    const profession = newContactProfessionInput.value.trim();

    if (!name || !phone || !profession) {
        showSystemMessage('Por favor, completa todos los campos del contacto.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const contactsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/contacts`);
        await addDoc(contactsCollectionRef, {
            name: name,
            phone: phone,
            profession: profession,
            timestamp: serverTimestamp() // Para ordenar si es necesario
        });
        
        // Limpiar campos después de guardar
        newContactNameInput.value = '';
        newContactPhoneInput.value = '';
        newContactProfessionInput.value = '';

        showSystemMessage('Contacto añadido exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir contacto:", e);
        showSystemMessage('Error al añadir el contacto. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de contacto.
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteContactEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar contactos.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    if (!entryId) {
        console.error("ID de contacto no encontrado.");
        showSystemMessage('Error: No se pudo identificar el contacto a eliminar.', 'error');
        return;
    }

    // Aquí podrías añadir una confirmación visual antes de eliminar
    const confirmDelete = true; // Por ahora, asumimos que siempre se confirma
    if (!confirmDelete) return;

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/contacts`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Contacto eliminado.', 'success');
    } catch (e) {
        console.error("Error al eliminar contacto:", e);
        showSystemMessage('Error al eliminar el contacto. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// --- Funciones para la sección de Cardiología (Hipertensión) ---

/**
 * Configura los listeners en tiempo real para la sección de cardiología.
 */
function setupCardiologyListeners() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para los listeners de cardiología.');
        return;
    }

    // Listener para lecturas de presión arterial
    const bpCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bloodPressureReadings`);
    const bpQuery = query(bpCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(bpQuery, (snapshot) => {
        bpHistoryList.innerHTML = '';
        const readings = [];
        snapshot.forEach((doc) => {
            readings.push({ id: doc.id, ...doc.data() });
        });

        if (readings.length === 0) {
            noBpEntriesMessage.classList.remove('hidden');
        } else {
            noBpEntriesMessage.classList.add('hidden');
            readings.forEach(reading => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const date = reading.timestamp ? new Date(reading.timestamp.toDate()).toLocaleDateString() : 'N/A';
                const time = reading.timestamp ? new Date(reading.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">PA: ${reading.systolic}/${reading.diastolic} mmHg - FC: ${reading.heartRate} bpm</p>
                        <p class="text-sm text-gray-600">Fecha: ${date} - Hora: ${time}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${reading.id}" data-collection="bloodPressureReadings" class="delete-cardiology-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                bpHistoryList.appendChild(li);
            });
            document.querySelectorAll('.delete-cardiology-entry[data-collection="bloodPressureReadings"]').forEach(button => {
                button.addEventListener('click', deleteCardiologyEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener lecturas de PA en tiempo real:", error);
        showSystemMessage('Error al cargar historial de presión arterial.', 'error');
    });

    // Listener para síntomas cardiovasculares
    const symptomCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/cardiacSymptoms`);
    const symptomQuery = query(symptomCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(symptomQuery, (snapshot) => {
        cardiacSymptomHistoryList.innerHTML = '';
        const symptoms = [];
        snapshot.forEach((doc) => {
            symptoms.push({ id: doc.id, ...doc.data() });
        });

        if (symptoms.length === 0) {
            noCardiacSymptomsMessage.classList.remove('hidden');
        } else {
            noCardiacSymptomsMessage.classList.add('hidden');
            symptoms.forEach(symptom => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const date = symptom.timestamp ? new Date(symptom.timestamp.toDate()).toLocaleDateString() : 'N/A';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${symptom.symptom} (${symptom.intensity})</p>
                        <p class="text-sm text-gray-600">Duración: ${symptom.duration} min - Fecha: ${date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${symptom.id}" data-collection="cardiacSymptoms" class="delete-cardiology-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                cardiacSymptomHistoryList.appendChild(li);
            });
            document.querySelectorAll('.delete-cardiology-entry[data-collection="cardiacSymptoms"]').forEach(button => {
                button.addEventListener('click', deleteCardiologyEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener síntomas cardíacos en tiempo real:", error);
        showSystemMessage('Error al cargar historial de síntomas cardíacos.', 'error');
    });
}

/**
 * Añade una nueva lectura de presión arterial a Firestore.
 */
async function addBpReading() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir lecturas de PA.', 'error');
        return;
    }

    const systolic = parseInt(bpSystolicInput.value.trim());
    const diastolic = parseInt(bpDiastolicInput.value.trim());
    const heartRate = parseInt(heartRateInput.value.trim());

    if (isNaN(systolic) || isNaN(diastolic) || isNaN(heartRate) || systolic <= 0 || diastolic <= 0 || heartRate <= 0) {
        showSystemMessage('Por favor, ingresa valores numéricos válidos para presión arterial y frecuencia cardíaca.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const bpCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/bloodPressureReadings`);
        await addDoc(bpCollectionRef, {
            systolic: systolic,
            diastolic: diastolic,
            heartRate: heartRate,
            timestamp: serverTimestamp()
        });
        bpSystolicInput.value = '';
        bpDiastolicInput.value = '';
        heartRateInput.value = '';
        showSystemMessage('Lectura de presión arterial añadida exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir lectura de PA:", e);
        showSystemMessage('Error al registrar la lectura de presión arterial. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Añade un nuevo síntoma cardiovascular a Firestore.
 */
async function addCardiacSymptom() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir síntomas cardiovasculares.', 'error');
        return;
    }

    const symptom = cardiacSymptomInput.value.trim();
    const intensity = symptomIntensitySelect.value;
    const duration = parseInt(symptomDurationInput.value.trim());

    if (!symptom || !intensity || isNaN(duration) || duration < 0) {
        showSystemMessage('Por favor, completa todos los campos del síntoma cardiovascular.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const symptomCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/cardiacSymptoms`);
        await addDoc(symptomCollectionRef, {
            symptom: symptom,
            intensity: intensity,
            duration: duration,
            timestamp: serverTimestamp()
        });
        cardiacSymptomInput.value = '';
        symptomIntensitySelect.value = '';
        symptomDurationInput.value = '';
        showSystemMessage('Síntoma cardiovascular añadido exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir síntoma cardíaco:", e);
        showSystemMessage('Error al registrar el síntoma cardiovascular. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de cardiología (PA o síntoma).
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteCardiologyEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar registros.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    const collectionName = event.currentTarget.dataset.collection;
    if (!entryId || !collectionName) {
        console.error("ID de entrada o nombre de colección no encontrado.");
        showSystemMessage('Error: No se pudo identificar el registro a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Registro eliminado.', 'success');
    } catch (e) {
        console.error(`Error al eliminar entrada de ${collectionName}:`, e);
        showSystemMessage(`Error al eliminar el registro de ${collectionName}. Intenta de nuevo.`, 'error');
    } finally {
        toggleLoading(false);
    }
}


// --- Funciones para la sección de ATM Leve ---

/**
 * Configura los listeners en tiempo real para la sección de ATM (Autismo).
 */
function setupAutismListeners() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para los listeners de ATM.');
        return;
    }

    // Listener para rutinas diarias
    const routineCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/routineTasks`);
    const routineQuery = query(routineCollectionRef, orderBy("timestamp", "asc")); // Ordenar por creación

    onSnapshot(routineQuery, (snapshot) => {
        routineTasksList.innerHTML = '';
        const tasks = [];
        snapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });

        if (tasks.length === 0) {
            noRoutineTasksMessage.classList.remove('hidden');
        } else {
            noRoutineTasksMessage.classList.add('hidden');
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const iconHtml = task.icon ? `<i class="${task.icon} mr-2"></i>` : '';
                li.innerHTML = `
                    <div class="flex items-center">
                        ${iconHtml}
                        <p class="font-semibold text-gray-800">${task.name}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-md text-sm">Hecho</button>
                        <button data-id="${task.id}" data-collection="routineTasks" class="delete-autism-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                routineTasksList.appendChild(li);
            });
            document.querySelectorAll('.delete-autism-entry[data-collection="routineTasks"]').forEach(button => {
                button.addEventListener('click', deleteAutismEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener rutinas en tiempo real:", error);
        showSystemMessage('Error al cargar rutinas diarias.', 'error');
    });

    // Listener para registros de comportamiento/emoción
    const behaviorCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/behaviorRecords`);
    const behaviorQuery = query(behaviorCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(behaviorQuery, (snapshot) => {
        behaviorHistoryList.innerHTML = '';
        const behaviors = [];
        snapshot.forEach((doc) => {
            behaviors.push({ id: doc.id, ...doc.data() });
        });

        if (behaviors.length === 0) {
            noBehaviorEntriesMessage.classList.remove('hidden');
        } else {
            noBehaviorEntriesMessage.classList.add('hidden');
            behaviors.forEach(behavior => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const date = behavior.timestamp ? new Date(behavior.timestamp.toDate()).toLocaleDateString() : 'N/A';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${behavior.emotion}</p>
                        <p class="text-sm text-gray-600">Notas: ${behavior.notes || 'N/A'} - Fecha: ${date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${behavior.id}" data-collection="behaviorRecords" class="delete-autism-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                behaviorHistoryList.appendChild(li);
            });
            document.querySelectorAll('.delete-autism-entry[data-collection="behaviorRecords"]').forEach(button => {
                button.addEventListener('click', deleteAutismEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener registros de comportamiento en tiempo real:", error);
        showSystemMessage('Error al cargar historial de comportamientos.', 'error');
    });
}

/**
 * Añade una nueva tarea de rutina a Firestore.
 */
async function addRoutineTask() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir tareas de rutina.', 'error');
        return;
    }

    const taskName = routineTaskNameInput.value.trim();
    const taskIcon = routineTaskIconInput.value.trim();

    if (!taskName) {
        showSystemMessage('Por favor, ingresa el nombre de la tarea.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const routineCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/routineTasks`);
        await addDoc(routineCollectionRef, {
            name: taskName,
            icon: taskIcon,
            timestamp: serverTimestamp()
        });
        routineTaskNameInput.value = '';
        routineTaskIconInput.value = '';
        showSystemMessage('Tarea de rutina añadida exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir tarea de rutina:", e);
        showSystemMessage('Error al añadir la tarea de rutina. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Añade un nuevo registro de comportamiento/emoción a Firestore.
 */
async function addBehaviorRecord() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir registros de comportamiento.', 'error');
        return;
    }

    const emotion = behaviorEmotionInput.value.trim();
    const notes = behaviorNotesInput.value.trim();

    if (!emotion) {
        showSystemMessage('Por favor, ingresa el comportamiento o emoción.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const behaviorCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/behaviorRecords`);
        await addDoc(behaviorCollectionRef, {
            emotion: emotion,
            notes: notes,
            timestamp: serverTimestamp()
        });
        behaviorEmotionInput.value = '';
        behaviorNotesInput.value = '';
        showSystemMessage('Registro de comportamiento/emoción añadido exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir registro de comportamiento:", e);
        showSystemMessage('Error al añadir el registro de comportamiento. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de ATM (rutina o comportamiento).
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteAutismEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar registros.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    const collectionName = event.currentTarget.dataset.collection;
    if (!entryId || !collectionName) {
        console.error("ID de entrada o nombre de colección no encontrado.");
        showSystemMessage('Error: No se pudo identificar el registro a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Registro eliminado.', 'success');
    } catch (e) {
        console.error(`Error al eliminar entrada de ${collectionName}:`, e);
        showSystemMessage(`Error al eliminar el registro de ${collectionName}. Intenta de nuevo.`, 'error');
    } finally {
        toggleLoading(false);
    }
}


// --- Funciones para la sección de Bienestar General ---

/**
 * Configura los listeners en tiempo real para la sección de bienestar general.
 */
function setupWellnessListeners() {
    if (!db || !userId || !isAuthReady) {
        console.log('Firestore o userId no disponibles para los listeners de bienestar.');
        return;
    }

    // Listener para métricas de peso y glucosa
    const wellnessCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/wellnessMetrics`);
    const wellnessQuery = query(wellnessCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(wellnessQuery, (snapshot) => {
        wellnessMetricsList.innerHTML = '';
        const metrics = [];
        snapshot.forEach((doc) => {
            metrics.push({ id: doc.id, ...doc.data() });
        });

        if (metrics.length === 0) {
            noWellnessMetricsMessage.classList.remove('hidden');
        } else {
            noWellnessMetricsMessage.classList.add('hidden');
            metrics.forEach(metric => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const date = metric.timestamp ? new Date(metric.timestamp.toDate()).toLocaleDateString() : 'N/A';
                let displayText = '';
                if (metric.weight) displayText += `Peso: ${metric.weight} kg`;
                if (metric.glucose) displayText += (metric.weight ? ' - ' : '') + `Glucosa: ${metric.glucose} mg/dL`;
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${displayText}</p>
                        <p class="text-sm text-gray-600">Fecha: ${date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${metric.id}" data-collection="wellnessMetrics" class="delete-wellness-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                wellnessMetricsList.appendChild(li);
            });
            document.querySelectorAll('.delete-wellness-entry[data-collection="wellnessMetrics"]').forEach(button => {
                button.addEventListener('click', deleteWellnessEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener métricas de bienestar en tiempo real:", error);
        showSystemMessage('Error al cargar historial de métricas de bienestar.', 'error');
    });

    // Listener para registros de sueño
    const sleepCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sleepRecords`);
    const sleepQuery = query(sleepCollectionRef, orderBy("timestamp", "desc"));

    onSnapshot(sleepQuery, (snapshot) => {
        sleepHistoryList.innerHTML = '';
        const sleepRecords = [];
        snapshot.forEach((doc) => {
            sleepRecords.push({ id: doc.id, ...doc.data() });
        });

        if (sleepRecords.length === 0) {
            noSleepEntriesMessage.classList.remove('hidden');
        } else {
            noSleepEntriesMessage.classList.add('hidden');
            sleepRecords.forEach(record => {
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-4 rounded-md shadow-sm flex items-center justify-between';
                const date = record.timestamp ? new Date(record.timestamp.toDate()).toLocaleDateString() : 'N/A';
                li.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">Horas: ${record.hours} - Calidad: ${record.quality}</p>
                        <p class="text-sm text-gray-600">Notas: ${record.notes || 'N/A'} - Fecha: ${date}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button data-id="${record.id}" data-collection="sleepRecords" class="delete-wellness-entry bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md text-sm">Eliminar</button>
                    </div>
                `;
                sleepHistoryList.appendChild(li);
            });
            document.querySelectorAll('.delete-wellness-entry[data-collection="sleepRecords"]').forEach(button => {
                button.addEventListener('click', deleteWellnessEntry);
            });
        }
    }, (error) => {
        console.error("Error al obtener registros de sueño en tiempo real:", error);
        showSystemMessage('Error al cargar historial de sueño.', 'error');
    });
}

/**
 * Añade un nuevo registro de peso o glucosa a Firestore.
 */
async function addWellnessMetric() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir métricas de bienestar.', 'error');
        return;
    }

    const weight = parseFloat(weightInput.value.trim());
    const glucose = parseFloat(glucoseInput.value.trim());

    if (isNaN(weight) && isNaN(glucose)) {
        showSystemMessage('Por favor, ingresa al menos el peso o la glucosa.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const wellnessCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/wellnessMetrics`);
        await addDoc(wellnessCollectionRef, {
            weight: isNaN(weight) ? null : weight,
            glucose: isNaN(glucose) ? null : glucose,
            timestamp: serverTimestamp()
        });
        weightInput.value = '';
        glucoseInput.value = '';
        showSystemMessage('Métrica de bienestar añadida exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir métrica de bienestar:", e);
        showSystemMessage('Error al añadir la métrica de bienestar. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Añade un nuevo registro de sueño a Firestore.
 */
async function addSleepRecord() {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para añadir registros de sueño.', 'error');
        return;
    }

    const hours = parseFloat(sleepHoursInput.value.trim());
    const quality = sleepQualitySelect.value;
    const notes = sleepNotesInput.value.trim();

    if (isNaN(hours) || hours <= 0 || !quality) {
        showSystemMessage('Por favor, ingresa las horas de sueño válidas y selecciona la calidad.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const sleepCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sleepRecords`);
        await addDoc(sleepCollectionRef, {
            hours: hours,
            quality: quality,
            notes: notes,
            timestamp: serverTimestamp()
        });
        sleepHoursInput.value = '';
        sleepQualitySelect.value = '';
        sleepNotesInput.value = '';
        showSystemMessage('Registro de sueño añadido exitosamente.', 'success');
    } catch (e) {
        console.error("Error al añadir registro de sueño:", e);
        showSystemMessage('Error al añadir el registro de sueño. Intenta de nuevo.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina una entrada de bienestar (métrica o sueño).
 * @param {Event} event - El evento de click del botón de eliminar.
 */
async function deleteWellnessEntry(event) {
    if (!db || !userId || !isAuthReady) {
        showSystemMessage('La aplicación no está lista para eliminar registros.', 'error');
        return;
    }

    const entryId = event.currentTarget.dataset.id;
    const collectionName = event.currentTarget.dataset.collection;
    if (!entryId || !collectionName) {
        console.error("ID de entrada o nombre de colección no encontrado.");
        showSystemMessage('Error: No se pudo identificar el registro a eliminar.', 'error');
        return;
    }

    toggleLoading(true);
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, entryId);
        await deleteDoc(docRef);
        showSystemMessage('Registro eliminado.', 'success');
    } catch (e) {
        console.error(`Error al eliminar entrada de ${collectionName}:`, e);
        showSystemMessage(`Error al eliminar el registro de ${collectionName}. Intenta de nuevo.`, 'error');
    } finally {
        toggleLoading(false);
    }
}


// --- Lógica de previsualización de imagen de perfil ---
profilePictureInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profilePicturePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
        selectedFileNameDisplay.textContent = file.name; // Mostrar el nombre del archivo
    } else {
        profilePicturePreview.src = "https://placehold.co/80x80/cccccc/333333?text=Foto";
        selectedFileNameDisplay.textContent = 'Ningún archivo seleccionado'; // Restablecer el texto
    }
});

// --- Lógica de encogimiento del header al hacer scroll ---
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const header = mainHeader;
    const initialHeight = 48; // 3rem en px (16px * 3 = 48px)
    const targetHeight = initialHeight * 0.50; // 50% de la altura inicial

    if (scrollY > 50) { // Umbral de scroll para activar el encogimiento
        header.classList.add('header-shrink');
        // Ajustar el padding-top del main para compensar el header encogido
        document.querySelector('main').style.paddingTop = `${targetHeight + 16}px`; // +1rem de padding base
    } else {
        header.classList.remove('header-shrink');
        // Restaurar el padding-top original del main
        document.querySelector('main').style.paddingTop = `${initialHeight + 16}px`;
    }
});


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
window.addEventListener('load', initializeFirebase);
profileSaveButton.addEventListener('click', saveUserProfile); // Botón de guardar perfil
guidedActionButton.addEventListener('click', handleGuidedActionClick); // Botón de acción flotante

addLiquidButton.addEventListener('click', addLiquidEntry);
settingsButton.addEventListener('click', () => showSystemMessage('Funcionalidad de ajustes de líquidos (cambiar límite) se implementará aquí.', 'info'));

// Event listener para la frecuencia de medicamentos
newMedFrequencySelect.addEventListener('change', generateMedTimeInputs);
// Event listener para añadir nuevo medicamento
addNewMedButton.addEventListener('click', addNewMed);

// Event listener para añadir nueva cita
document.getElementById('add-new-appointment-button').addEventListener('click', addNewAppointment);
// Event listener para añadir nuevo resultado de laboratorio
document.getElementById('add-new-lab-result-button').addEventListener('click', addNewLabResult);


// Event listener para añadir nuevo contacto
addNewContactButton.addEventListener('click', addNewContact);

// Event listeners para la sección de Cardiología
addBpReadingButton.addEventListener('click', addBpReading);
addCardiacSymptomButton.addEventListener('click', addCardiacSymptom);

// Event listeners para la sección de ATM
addRoutineTaskButton.addEventListener('click', addRoutineTask);
addBehaviorButton.addEventListener('click', addBehaviorRecord);

// Event listeners para la sección de Bienestar General
addWellnessMetricButton.addEventListener('click', addWellnessMetric);
addSleepRecordButton.addEventListener('click', addSleepRecord);

// Event listener para el cambio en el tipo de diálisis/condición
dialysisTypeSelect.addEventListener('change', () => {
    updateConditionalSectionsVisibility();
    // Cuando el tipo de diálisis cambia, el flujo guiado debe reiniciarse o ajustarse
    // Si el usuario cambia el tipo de diálisis DESPUÉS de haber completado el registro,
    // el botón guiado debe ocultarse y la navegación completa debe permanecer.
    // Si lo cambia DURANTE el registro, el flujo debe adaptarse.
    if (!isRegistrationComplete) {
        currentGuidedFlowType = dialysisTypeSelect.value;
        currentGuidedFlow = guidedFlowSections[currentGuidedFlowType] || guidedFlowSections['none'];
        currentGuidedFlowIndex = -1; // Resetear el índice para que el botón muestre "Iniciar Registro Guiado"
        showSection('profile-section'); // Volver al perfil
    }
    updateGuidedFlowState(); // Actualizar el estado del botón flotante
    updateNavigationButtonsState(); // Actualizar el estado de los botones de navegación
});


// Navegación inferior
navProfileButton.addEventListener('click', () => {
    if (navProfileButton.disabled) return;
    showSection('profile-section');
});
navLiquidsButton.addEventListener('click', () => {
    if (navLiquidsButton.disabled) return;
    showSection('liquids-section');
});
navMedsButton.addEventListener('click', () => {
    if (navMedsButton.disabled) return;
    showSection('meds-section');
});
navLabsButton.addEventListener('click', () => {
    if (navLabsButton.disabled) return;
    showSection('labs-section');
});

// Listener para el botón "Más"
navMoreButton.addEventListener('click', (event) => {
    if (navMoreButton.disabled) return;
    // Detener la propagación para que no se cierre inmediatamente si hay un click fuera
    event.stopPropagation(); 
    moreOptionsDropdown.classList.toggle('hidden');
});

// Cerrar el menú desplegable si se hace clic fuera de él
document.addEventListener('click', (event) => {
    if (!moreOptionsDropdown.contains(event.target) && !navMoreButton.contains(event.target)) {
        moreOptionsDropdown.classList.add('hidden');
    }
});

// Listeners para los elementos dentro del menú desplegable
navAgendaButton.addEventListener('click', () => {
    if (navAgendaButton.disabled) return;
    showSection('agenda-section');
});
navCardiologyButton.addEventListener('click', () => {
    if (navCardiologyButton.disabled) return;
    showSection('cardiology-section');
});
navAutismButton.addEventListener('click', () => {
    if (navAutismButton.disabled) return;
    showSection('autism-section');
});
navWellnessButton.addEventListener('click', () => {
    if (navWellnessButton.disabled) return;
    showSection('wellness-section');
});


// Inicializar los campos de hora al cargar la página si ya hay una frecuencia preseleccionada
window.addEventListener('DOMContentLoaded', generateMedTimeInputs);
