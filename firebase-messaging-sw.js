importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

// Your real config from Firebase console (same as script.js)
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
  console.log('Payload details:', payload.notification);  // Log title/body for debug
  if (payload.notification.title && payload.notification.body) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/icon-192x192.png',  // Optional icon (404 is fine if missing)
      badge: '/icon-192x192.png',  // Badge for mobile
      vibrate: [200, 100, 200],  // Vibration pattern (buzz-buzz-buzz)
      sound: 'default',  // Default system sound
      tag: 'todo-reminder'  // Groups notifications
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
    console.log('showNotification called successfully!');  // Confirm execution
  } else {
    console.error('Missing title/body in payload');
  }
});