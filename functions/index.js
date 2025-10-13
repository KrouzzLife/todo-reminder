const functions = require('firebase-functions/v1');  // v1 for pubsub schedule
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { DateTime } = require('luxon');  // For timezone parsing

// Initialize Firebase Admin
admin.initializeApp();
const db = getFirestore();

// Scheduled function: Runs every minute, checks due reminders, sends FCM, deletes
exports.scheduledReminderCheck = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  const cutoff = DateTime.fromJSDate(now.toDate(), { zone: 'UTC' });  // UTC now

  // Query unsent reminders (no dueDate filter—check in loop for timezone accuracy)
  const remindersRef = db.collection('reminders');
  const query = remindersRef.where('sent', '==', false);

  try {
    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log('No due reminders found.');
      return null;
    }

    const batch = db.batch();
    const sentReminders = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const token = data.token;

      // Parse local due date with client's zone to UTC for comparison
      const localDue = data.dueDate;  // Local string, e.g., "2025-10-13T14:30"
      const userZone = data.timeZone;  // e.g., "America/New_York"
      const dueUTC = DateTime.fromISO(localDue, { zone: userZone }).toUTC();  // Convert to UTC
      if (dueUTC <= cutoff) {  // Check if due in UTC
        // Send FCM push
        const message = {
          notification: {
            title: 'Todo Reminder',
            body: `Time's up: ${data.text}`,
          },
          token: token,
        };

        admin.messaging().send(message)
          .then((response) => {
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });

        // Mark as sent and delete
        batch.update(doc.ref, { sent: true });
        sentReminders.push(doc.id);
      }
    });

    // Commit batch and delete sent ones after send (for cleanup)
    await batch.commit();
    await Promise.all(sentReminders.map(id => remindersRef.doc(id).delete()));

    console.log(`Processed ${sentReminders.length} reminders.`);
    return null;
  } catch (error) {
    console.error('Error in scheduledReminderCheck:', error);
    return null;
  }
});