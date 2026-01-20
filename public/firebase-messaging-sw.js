/* Archivo: public/firebase-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE (La misma que usaste antes)
const firebaseConfig = {
  apiKey: "AIzaSyBJ25t7cGyyMGWfAP7Wbqk8GhI5blkamBg",
  authDomain: "calendariocasa-46be7.firebaseapp.com",
  projectId: "calendariocasa-46be7",
  storageBucket: "calendariocasa-46be7.firebasestorage.app",
  messagingSenderId: "435220870770",
  appId: "1:435220870770:web:a6c632351def012ce134eb",
  measurementId: "G-4DGKJG8DPE"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Esto maneja las notificaciones cuando la app está "dormida" o en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Notificación recibida en background:', payload);
  const title = payload.notification.title;
  const options = {
    body: payload.notification.body,
    icon: '/logo192.png' // Icono de React por defecto
  };
  self.registration.showNotification(title, options);
});