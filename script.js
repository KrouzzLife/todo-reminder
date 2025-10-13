import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js';

// Your real config from Firebase console (MUST replace placeholders!)
const firebaseConfig = {
    apiKey: "AIzaSyD0EIiHJSkgxdAzlFtBNLpb__TEE0KkqpQ",  // Get from Console > Project settings > General
    authDomain: "todo-list-vanila.firebaseapp.com",
    projectId: "todo-list-vanila",
    storageBucket: "todo-list-vanila.firebasestorage.app",
    messagingSenderId: "1052270332497",
    appId: "1:1052270332497:web:ce4976efeddda476dc4670"
  };

let app, db, messaging; // Declare globally for error handling
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  messaging = getMessaging(app);
  console.log('Firebase initialized successfully!');
} catch (error) {
  console.error('Firebase init error:', error);
  alert('Firebase setup issue—check config in script.js');
}

// DOM elements (wait for load to ensure they exist)
document.addEventListener('DOMContentLoaded', () => {
  const taskForm = document.getElementById("task-form");
  const confirmCloseDialog = document.getElementById("confirm-close-dialog");
  const openTaskFormBtn = document.getElementById("open-task-form-btn");
  const closeTaskFormBtn = document.getElementById("close-task-form-btn");
  const addOrUpdateTaskBtn = document.getElementById("add-or-update-task-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const discardBtn = document.getElementById("discard-btn");
  const tasksContainer = document.getElementById("tasks-container");
  const titleInput = document.getElementById("title-input");
  const dueDateInput = document.getElementById("due-date-input");
  const priorityInput = document.getElementById("priority-input");
  const descriptionInput = document.getElementById("description-input");
  const progressFill = document.getElementById("progress-fill");

  let taskData = JSON.parse(localStorage.getItem("data")) || [];
  let currentTask = {};

  const removeSpecialChars = (val) => val.trim().replace(/[^A-Za-z0-9\-\s]/g, '');

  const generateUniqueId = (title, priority) => `${removeSpecialChars(title).toLowerCase().split(" ").join("-")}-${priority[0]}-${Date.now()}`;

  const addOrUpdateTask = async () => {
    console.log('Add/Update triggered!'); // Debug log
    if (!titleInput.value.trim()) {
      alert("Please provide a title");
      return;
    }
    const dataArrIndex = taskData.findIndex((item) => item.id === currentTask.id);
    const taskObj = {
      id: dataArrIndex === -1 ? generateUniqueId(titleInput.value, priorityInput.value) : currentTask.id, // Keep ID on update
      title: titleInput.value,
      dueDate: dueDateInput.value,
      priority: priorityInput.value,
      description: descriptionInput.value,
      completed: false // Reset on new/edit
    };

    if (dataArrIndex === -1) {
      taskData.unshift(taskObj);
      console.log('New task added:', taskObj.id); // Debug
    } else {
      taskData[dataArrIndex] = taskObj;
      console.log('Task updated:', taskObj.id); // Debug
    }

    localStorage.setItem("data", JSON.stringify(taskData));
    updateTaskContainer();
    if (dueDateInput.value && db) {
      await scheduleReminder(taskObj).catch(err => console.error('Reminder schedule error:', err));
    }
    reset(); // This now properly closes the form
  };

  const scheduleReminder = async (task) => {
    if (!messaging) return;
    const token = await getFCMToken();
    if (token) {
      console.log('Scheduling reminder with token:', token);
      const localDue = task.dueDate;  // Keep as local string
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;  // Get client's zone (e.g., "America/New_York")
      await addDoc(collection(db, 'reminders'), {
        token,
        text: `${task.title} (${task.priority})`,
        dueDate: localDue,  // Store local string
        timeZone: userTimeZone,  // Store zone for server adjustment
        sent: false,
        createdAt: serverTimestamp()
      }).then(() => console.log('Reminder doc added to Firestore!'));
    }
  };

  const updateTaskContainer = () => {
    tasksContainer.innerHTML = "";
    taskData.forEach(({ id, title, dueDate, priority, description, completed }) => {
      const taskEl = document.createElement('div');
      taskEl.className = `task ${completed ? 'completed' : ''}`;
      taskEl.id = id;
      taskEl.role = 'listitem';
      taskEl.innerHTML = `
        <div class="task-header">
          <input type="checkbox" class="task-checkbox" ${completed ? 'checked' : ''}>
          <span class="task-title">${title}</span>
          <span class="priority-badge priority-${priority}">${priority.toUpperCase()}</span>
        </div>
        ${dueDate ? `<p class="task-due">Due: ${new Date(dueDate).toLocaleString()}</p>` : ''}
        <p class="task-desc">${description}</p>
        <div class="task-actions">
          <button class="btn edit-btn" data-action="edit" data-id="${id}" type="button">Edit</button>
          <button class="btn delete-btn" data-action="delete" data-id="${id}" type="button">Delete</button>
        </div>
      `;
      tasksContainer.appendChild(taskEl);
    });
    updateProgressBar();
  };

  const updateProgressBar = () => {
    const completed = taskData.filter(t => t.completed).length;
    const percent = taskData.length ? (completed / taskData.length) * 100 : 0;
    progressFill.style.width = `${percent}%`;
  };

  // Event delegation for checkboxes, edit, delete (fixes onclick scope issue)
  tasksContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-checkbox')) {
      const taskEl = e.target.closest('.task');
      const id = taskEl.id;
      const checked = e.target.checked;
      const index = taskData.findIndex(item => item.id === id);
      if (index !== -1) {
        taskData[index].completed = checked;
        localStorage.setItem("data", JSON.stringify(taskData));
        updateTaskContainer();
      }
    }
  });

  tasksContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.dataset.id;
      const dataArrIndex = taskData.findIndex(item => item.id === id);
      currentTask = taskData[dataArrIndex];
      titleInput.value = currentTask.title;
      dueDateInput.value = currentTask.dueDate || '';
      priorityInput.value = currentTask.priority;
      descriptionInput.value = currentTask.description;
      addOrUpdateTaskBtn.innerText = "Update Task";
      taskForm.classList.remove("hidden");
      titleInput.focus(); // UX: Focus on title for edits
      console.log('Edit clicked for:', id); // Debug
    } else if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      const taskEl = document.getElementById(id);
      taskEl.style.transition = 'transform 0.3s ease';
      taskEl.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        const dataArrIndex = taskData.findIndex(item => item.id === id);
        taskData.splice(dataArrIndex, 1);
        localStorage.setItem("data", JSON.stringify(taskData));
        updateTaskContainer();
      }, 300);
      console.log('Delete clicked for:', id); // Debug
    }
  });

  const reset = () => {
    addOrUpdateTaskBtn.innerText = "Add Task";
    titleInput.value = "";
    dueDateInput.value = "";
    priorityInput.value = "medium";
    descriptionInput.value = "";
    taskForm.classList.add("hidden"); // Explicitly add hidden to close modal
    currentTask = {};
  };

  const getFCMToken = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return getToken(messaging, { vapidKey: 'BLviM87bx44w96JmnuNzvDOrrpuK058wmtW7nCNn3SOfb4zLdSKzg5qX9ho-LJEcuFFpDIN5lTO9bh4O4Ex-q70' }); // Replace with real VAPID!
      }
    } catch (error) {
      console.error('FCM Error:', error);
    }
    return null;
  };

  onMessage(messaging, (payload) => {
    console.log('Foreground message:', payload);
    new Notification('Todo Reminder!', { body: payload.notification.body, icon: '/icon-192x192.png' });
  });

  // Event listeners
  if (taskData.length) updateTaskContainer();

  openTaskFormBtn.addEventListener("click", () => taskForm.classList.remove("hidden"));

  closeTaskFormBtn.addEventListener("click", () => {
    const hasChanges = titleInput.value !== currentTask.title || dueDateInput.value !== (currentTask.dueDate || '') || priorityInput.value !== currentTask.priority || descriptionInput.value !== currentTask.description;
    if (hasChanges && Object.keys(currentTask).length) {
      confirmCloseDialog.showModal();
    } else {
      reset();
    }
  });

  cancelBtn.addEventListener("click", () => confirmCloseDialog.close());

  discardBtn.addEventListener("click", () => {
    confirmCloseDialog.close();
    reset();
  });

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log('Form submitted!'); // Debug log
    addOrUpdateTask();
  });
});