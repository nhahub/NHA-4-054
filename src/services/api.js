import { collection, doc, getDocs, getDoc, updateDoc, setDoc, deleteDoc, writeBatch, onSnapshot, query, where, serverTimestamp, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase/config";

import initialOrders from "../data/orders";
import initialNotifications from "../data/notifications";
import initialChatData from "../data/chatData";

// Helper to check if Firebase is configured
const isFirebaseConfigured = true;

// ==============================
// Fallback Local Storage Logic 
// (Used until you add Firebase keys to .env)
// ==============================
const getStoredData = (key, initialData) => {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(initialData));
  return initialData;
};
const setStoredData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const simulateDelay = (data, delay = 800) => new Promise((resolve) => setTimeout(() => resolve(data), delay));

// ==============================
// Development Tools
// ==============================
export const wipeTestData = async () => {
  if (!isFirebaseConfigured) return;
  const collectionsToWipe = ["requests", "offers", "orders", "chats", "notifications", "reviews"];
  try {
    for (const collName of collectionsToWipe) {
      const querySnapshot = await getDocs(collection(db, collName));
      const deletePromises = [];
      querySnapshot.forEach((d) => {
        deletePromises.push(deleteDoc(doc(db, collName, d.id)));
      });
      await Promise.all(deletePromises);
      console.log(`Cleared collection: ${collName}`);
    }
    alert("Test data wiped successfully! Please refresh the page.");
  } catch (error) {
    console.error("Error wiping data:", error);
    alert("Failed to wipe data. Check console.");
  }
};
window.wipeTestData = wipeTestData;

// ==============================
// Orders API
// ==============================
export const getOrders = async () => {
  if (!isFirebaseConfigured) {
    return simulateDelay(getStoredData("fixora_orders", initialOrders));
  }
  
  if (!auth.currentUser) return [];

  const q = query(
    collection(db, "orders"),
    where("homeownerId", "==", auth.currentUser.uid)
  );
  
  const querySnapshot = await getDocs(q);
  const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Dynamically fetch the latest professional details for all orders
  await Promise.all(orders.map(async (orderData) => {
    if (orderData.professionalId) {
      try {
        const proDoc = await getDoc(doc(db, "users", orderData.professionalId));
        if (proDoc.exists()) {
          const proData = proDoc.data();
          orderData.provider = {
            ...orderData.provider,
            avatar: proData.profileImage || orderData.provider?.avatar || "https://i.pravatar.cc/150?img=11",
            name: proData.fullName || orderData.provider?.name || "Professional",
            rating: proData.rating ?? orderData.provider?.rating ?? 0,
            reviews: proData.reviewsCount ?? proData.reviewCount ?? orderData.provider?.reviews ?? 0
          };
        }
      } catch (e) {
        console.error("Failed to fetch dynamic pro info for order " + orderData.id, e);
      }
    }
  }));

  return orders;
};

export const getOrderById = async (id) => {
  if (!isFirebaseConfigured) {
    const data = getStoredData("fixora_orders", initialOrders);
    return simulateDelay(data.find((o) => String(o.id) === String(id)));
  }

  // Look for document by ID
  try {
    const docRef = doc(db, "orders", String(id));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const orderData = { id: docSnap.id, ...docSnap.data() };
      
      // Dynamically fetch the latest professional details
      if (orderData.professionalId) {
        try {
          const proDoc = await getDoc(doc(db, "users", orderData.professionalId));
          if (proDoc.exists()) {
            const proData = proDoc.data();
            orderData.provider = {
              ...orderData.provider,
              avatar: proData.profileImage || orderData.provider?.avatar || "https://i.pravatar.cc/150?img=11",
              name: proData.fullName || orderData.provider?.name || "Professional",
              rating: proData.rating ?? orderData.provider?.rating ?? 0,
              reviews: proData.reviewsCount ?? proData.reviewCount ?? orderData.provider?.reviews ?? 0
            };
          }
        } catch (e) {
          console.error("Failed to fetch dynamic pro info", e);
        }
      }
      
      return orderData;
    }
  } catch (error) {
    console.error("Error fetching order by ID", error);
  }
  
  // Fallback: search all to find matching originalId if document ID changed
  const querySnapshot = await getDocs(collection(db, "orders"));
  const all = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return all.find(o => String(o.id) === String(id) || String(o.originalId) === String(id));
};

export const updateOrderStatus = async (id, newStatus) => {
  if (!isFirebaseConfigured) {
    const data = getStoredData("fixora_orders", initialOrders);
    const updatedData = data.map((order) => String(order.id) === String(id) ? { ...order, status: newStatus } : order);
    setStoredData("fixora_orders", updatedData);
    return simulateDelay(updatedData);
  }

  // Find the exact document to update
  const querySnapshot = await getDocs(collection(db, "orders"));
  const docToUpdate = querySnapshot.docs.find(d => String(d.id) === String(id) || String(d.data().originalId) === String(id));
  
  if (docToUpdate) {
    const docRef = doc(db, "orders", docToUpdate.id);
    await updateDoc(docRef, { status: newStatus });
    
    // Also update request status if newStatus is 'completed'
    if (newStatus === "completed" && docToUpdate.data().requestId) {
       await updateDoc(doc(db, "requests", docToUpdate.data().requestId), { status: "completed" });
    }
  }
  return getOrderById(id);
};

// ==============================
// Notifications API
// ==============================
export const getNotifications = async () => {
  if (!isFirebaseConfigured) {
    return simulateDelay(getStoredData("fixora_notifications", initialNotifications));
  }

  if (!auth.currentUser) return [];

  const q = query(
    collection(db, "notifications"), 
    where("targetUserId", "==", auth.currentUser.uid)
  );
  
  const querySnapshot = await getDocs(q);
  const notifs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Sort descending by time if possible
  return notifs.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
};

export const markNotificationAsRead = async (id) => {
  if (!isFirebaseConfigured) return [];
  
  try {
    const docRef = doc(db, "notifications", String(id));
    await updateDoc(docRef, { isRead: true });
  } catch (err) {
    console.error("Error marking notification read:", err);
    throw err;
  }
  return [];
};

export const markAllNotificationsAsRead = async () => {
  if (!isFirebaseConfigured) return [];

  try {
    const q = query(
      collection(db, "notifications"),
      where("targetUserId", "==", auth.currentUser.uid),
      where("isRead", "==", false)
    );
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(document => {
      batch.update(document.ref, { isRead: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error marking all read:", err);
    throw err;
  }
  return [];
};

export const deleteNotification = async (id) => {
  if (!isFirebaseConfigured) return [];

  try {
    const docRef = doc(db, "notifications", String(id));
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Error deleting notification:", err);
    throw err;
  }
  return [];
};

// ==============================
// Chat API
// ==============================
export const getChatMessages = async (orderId) => {
  if (!isFirebaseConfigured) {
    const data = getStoredData("fixora_chats", initialChatData);
    return simulateDelay(data[orderId] || []);
  }

  // Chats are stored in a collection "chats" where document ID is the orderId
  // Document contains an array of "messages"
  const docRef = doc(db, "chats", String(orderId));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().messages || [];
  }
  return [];
};

export const subscribeToChat = (order, callback) => {
  if (!isFirebaseConfigured || !order) return () => {};

  const chatId = `${order.requestId}_${order.professionalId}`;
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef);

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort ascending by time
    msgs.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return timeA - timeB;
    });

    // Map senderId to "customer" or "provider" for the Drawer UI
    const formattedMsgs = msgs.map(m => ({
      ...m,
      sender: m.senderId === order.homeownerId ? "customer" : "provider",
      // Keep old timestamp string logic if needed by UI, or map Date
      timeString: m.timestamp?.toDate ? m.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""
    }));

    callback(formattedMsgs);
  });
  
  return unsubscribe;
};

export const sendChatMessage = async (order, messageText) => {
  if (!isFirebaseConfigured || !order || !auth.currentUser) return [];

  const phoneRegex = /(?:\+?20\s*[-.]?\s*0?|0)?1[0125]\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d|\d{10,}/g;
  const filteredText = messageText.replace(phoneRegex, '[تم إخفاء الرقم لحماية الخصوصية]');

  const chatId = `${order.requestId}_${order.professionalId}`;
  const messagesRef = collection(db, "chats", chatId, "messages");
  
  await addDoc(messagesRef, {
    senderId: auth.currentUser.uid,
    text: filteredText,
    timestamp: serverTimestamp()
  });

  // Update last message in the parent chat document
  const chatDocRef = doc(db, 'chats', chatId);
  const chatDocSnap = await getDoc(chatDocRef);
  let participantDetails = {};

  if (chatDocSnap.exists() && chatDocSnap.data().participantDetails) {
    participantDetails = chatDocSnap.data().participantDetails;
  } else {
    // Fetch details
    const homeownerDocSnap = await getDoc(doc(db, "users", order.homeownerId));
    const proDocSnap = await getDoc(doc(db, "users", order.professionalId));
    
    participantDetails = {
      [order.homeownerId]: {
        name: homeownerDocSnap.exists() ? homeownerDocSnap.data().fullName : "Homeowner",
        avatar: homeownerDocSnap.exists() ? homeownerDocSnap.data().profileImage : null
      },
      [order.professionalId]: {
        name: proDocSnap.exists() ? proDocSnap.data().fullName : "Professional",
        avatar: proDocSnap.exists() ? proDocSnap.data().profileImage : null
      }
    };
  }

  await setDoc(chatDocRef, {
    lastMessage: filteredText,
    lastMessageTime: serverTimestamp(),
    participants: [order.homeownerId, order.professionalId],
    participantDetails
  }, { merge: true });
  
  return []; // onSnapshot will update the UI
};

// ==============================
// Reviews API
// ==============================
export const submitReview = async (orderId, professionalId, homeownerId, rating, reviewText) => {
  if (!isFirebaseConfigured || !auth.currentUser) return { success: false };

  try {
    // Fetch the real homeowner data from Firestore
    let realName = auth.currentUser.displayName || "Homeowner";
    let realAvatar = auth.currentUser.photoURL || null;
    
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      if (userData.fullName) realName = userData.fullName;
      if (userData.profileImage) realAvatar = userData.profileImage;
    }
    
    if (!realAvatar) {
      realAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=1f3b6c&color=fff&size=150`;
    }

    // Fetch the order to get the service name
    let serviceName = "Service";
    const orderDocSnap = await getDoc(doc(db, "orders", orderId));
    if (orderDocSnap.exists()) {
      const orderData = orderDocSnap.data();
      if (orderData.serviceType) serviceName = orderData.serviceType;
      else if (orderData.service && orderData.service.name) serviceName = orderData.service.name;
    }

    // Add review to reviews collection
    await addDoc(collection(db, "reviews"), {
      orderId,
      professionalId,
      homeownerId,
      homeownerName: realName,
      homeownerAvatar: realAvatar,
      serviceName,
      rating,
      reviewText: reviewText || '',
      createdAt: serverTimestamp()
    });

    // Update Professional's average rating
    const proDocRef = doc(db, "users", professionalId);
    const proDocSnap = await getDoc(proDocRef);
    if (proDocSnap.exists()) {
      const proData = proDocSnap.data();
      const currentReviewsCount = parseInt(proData.reviewsCount || proData.reviewCount) || 0;
      const currentRating = proData.rating || 0;
      
      const newReviewsCount = currentReviewsCount + 1;
      const newRating = ((currentRating * currentReviewsCount) + rating) / newReviewsCount;
      
      await updateDoc(proDocRef, {
        rating: Number(newRating.toFixed(1)),
        reviewsCount: newReviewsCount
      });
    }

    // Mark order as rated
    await updateDoc(doc(db, "orders", orderId), { isRated: true });

    // Notify Professional
    await addDoc(collection(db, "notifications"), {
      targetUserId: professionalId,
      type: "system",
      title: "New Review Received ⭐",
      description: `${realName} has left a ${rating}-star review on your recent job.`,
      orderId,
      isRead: false,
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};

// ==============================
// Utility: Seed Database
// ==============================
export const seedFirebaseDatabase = async () => {
  if (!isFirebaseConfigured) return { success: false, message: "Firebase not configured" };
  
  try {
    const { setDoc } = await import("firebase/firestore");
    
    // 1. Seed Orders
    for (const order of initialOrders) {
      const orderRef = doc(db, "orders", String(order.id));
      await setDoc(orderRef, { ...order, originalId: order.id });
    }
    
    // 2. Seed Notifications
    for (const notification of initialNotifications) {
      const notifRef = doc(db, "notifications", String(notification.id));
      await setDoc(notifRef, { ...notification, originalId: notification.id });
    }
    
    // 3. Seed Chats
    for (const [orderId, messages] of Object.entries(initialChatData)) {
      const chatRef = doc(db, "chats", String(orderId));
      await setDoc(chatRef, { messages });
    }
    
    return { success: true, message: "Database seeded successfully!" };
  } catch (error) {
    console.error("Error seeding DB", error);
    return { success: false, message: error.message };
  }
};

export const resetDatabase = () => {
  localStorage.removeItem("fixora_orders");
  localStorage.removeItem("fixora_notifications");
  localStorage.removeItem("fixora_chats");
  window.location.reload();
};
