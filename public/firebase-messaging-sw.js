/* Archivo: public/firebase-messaging-sw.js */

// Importamos los scripts de compatibilidad de Firebase (necesarios para el Service Worker)
importScripts('https://www.gstatic.com/firebasejs/compat/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/compat/9.23.0/firebase-messaging-compat.js');

// TU CONFIGURACIÓN EXACTA (Ya la puse aquí)
const firebaseConfig = {
  apiKey: "AIzaSyBJ25t7cGyyMGWfAP7Wbqk8GhI5blkamBg",
  authDomain: "calendariocasa-46be7.firebaseapp.com",
  projectId: "calendariocasa-46be7",
  storageBucket: "calendariocasa-46be7.firebasestorage.app",
  messagingSenderId: "435220870770",
  appId: "1:435220870770:web:a6c632351def012ce134eb",
  measurementId: "G-4DGKJG8DPE"
};

// Inicializamos Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtenemos la instancia de mensajería
const messaging = firebase.messaging();

// Este bloque maneja las notificaciones cuando la app está CERRADA o en SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación en background recibida:', payload);
  
  // Personalizamos cómo se ve la alerta en el celular
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Asegúrate de tener este logo en tu carpeta public
    badge: '/logo192.png', // Icono pequeño en la barra de estado (Android)
    vibrate: [200, 100, 200] // Patrón de vibración
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});