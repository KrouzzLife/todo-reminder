importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// Your real config from Firebase console (paste the full object here—same as script.js)
const firebaseConfig = {
  apiKey: "AIzaSyD0EIiHJSkgxdAzlFtBNLpb__TEE0KkqpQ",
  authDomain: "todo-list-vanila.firebaseapp.com",
  projectId: "todo-list-vanila",
  storageBucket: "todo-list-vanila.firebasestorage.app",
  messagingSenderId: "1052270332497",
  appId: "1:1052270332497:web:ce4976efeddda476dc4670"
};


firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png' // Optional: Add a 192x192 PNG icon file in your root
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});