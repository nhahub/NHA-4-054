import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, ChevronLeft, Send, Paperclip, CheckCheck, Loader2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfessionalBottomNav from '../../../components/professional/ProfessionalBottomNav';
import { auth, db } from '../../../firebase/config';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ChatAvatar = ({ src, name, className }) => {
  const [error, setError] = useState(false);
  const isInvalid = !src || error || typeof src !== 'string' || src.trim() === '' || src.includes('via.placeholder');
  
  if (isInvalid) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center text-[#1f3b6c] font-bold`} style={{border: 'none'}}>
        {name ? name.charAt(0).toUpperCase() : 'U'}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={name} 
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default function ProfessionalChat() {
  const [activeChat, setActiveChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filterPhoneNumber = (text) => {
    // Matches 11-digit numbers, numbers starting with +20, or just sequences of 10+ digits
    const phoneRegex = /(?:\+?20\s*[-.]?\s*0?|0)?1[0125]\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d\s*[-.]?\s*\d|\d{10,}/g;
    return text.replace(phoneRegex, '[Phone number hidden for privacy]');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Chats
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatsPromises = snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const otherParticipantId = data.participants.find(id => id !== currentUser.uid);
          let otherName = data.participantDetails?.[otherParticipantId]?.name || 'Homeowner';
          let otherAvatar = data.participantDetails?.[otherParticipantId]?.avatar || 'https://via.placeholder.com/150';
          
          // Dynamically fetch latest user info
          if (otherParticipantId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.fullName) otherName = userData.fullName;
                if (userData.profileImage) otherAvatar = userData.profileImage;
              }
            } catch(e) {}
          }
          
          return {
            id: docSnap.id,
            name: otherName,
            avatar: otherAvatar,
            lastMessage: data.lastMessage || '',
            time: data.lastMessageTime ? new Date(data.lastMessageTime.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
            lastMessageTimeData: data.lastMessageTime ? data.lastMessageTime.toMillis() : 0,
            unread: 0,
            online: true,
            otherParticipantId
          };
        });

        const chatsList = await Promise.all(chatsPromises);
        
        // Sort by last message time descending (newest first)
        chatsList.sort((a, b) => b.lastMessageTimeData - a.lastMessageTimeData);
        setChats(chatsList);
      } catch (error) {
        console.error("Error processing chats:", error);
      } finally {
        setIsLoadingChats(false);
      }
    }, (error) => {
      console.error("Error fetching chats:", error);
      setIsLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Messages
  useEffect(() => {
    if (!activeChat || !currentUser) return;
    
    setIsLoadingMessages(true);
    const messagesRef = collection(db, 'chats', activeChat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          sender: data.senderId === currentUser.uid ? 'me' : 'them',
          text: data.text,
          time: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'
        });
      });
      setMessages(msgs);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeChat, currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const originalMessage = newMessage;
    setNewMessage('');
    
    // فلترة الأرقام قبل الإرسال
    const messageText = filterPhoneNumber(originalMessage);

    try {
      const messagesRef = collection(db, 'chats', activeChat.id, 'messages');
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: messageText,
        timestamp: serverTimestamp()
      });

      const chatDocRef = doc(db, 'chats', activeChat.id);
      await updateDoc(chatDocRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (activeChat) {
    return (
      <div className="h-[100dvh] bg-[#F7F5F2] flex flex-col font-sans overflow-hidden">
        {/* Chat Header */}
        <div className="bg-[#1f3b6c] text-white px-4 py-4 flex items-center justify-between shadow-md relative z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveChat(null)} className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="relative">
              <ChatAvatar src={activeChat.avatar} name={activeChat.name} className="w-10 h-10 rounded-full border-2 border-white object-cover bg-white" />
              {activeChat.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f3b6c]"></div>}
            </div>
            <div>
              <h2 className="font-bold text-[15px]">{activeChat.name}</h2>
              <p className="text-blue-200 text-xs">{activeChat.online ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-white/10 rounded-xl transition"><Phone className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-white/10 rounded-xl transition"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#c9a765] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p>No messages yet. Send a message to start!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.sender === 'me' 
                  ? 'bg-[#1f3b6c] text-white rounded-br-sm shadow-sm' 
                  : 'bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender === 'me' ? 'text-blue-200' : 'text-slate-400'}`}>
                    <span className="text-[10px]">{msg.time}</span>
                    {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-[#c9a765]" />}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-100 p-4 w-full shrink-0 z-20">
          <div className="max-w-md mx-auto flex items-end gap-2">
            <button type="button" className="p-3 text-slate-400 hover:bg-slate-50 rounded-full transition shrink-0">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center pr-2 transition-all focus-within:border-[#1f3b6c] focus-within:ring-2 focus-within:ring-[#1f3b6c]/10">
              <textarea 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                className="w-full bg-transparent px-4 py-3 outline-none text-sm resize-none max-h-32 text-slate-800 placeholder-slate-400"
                rows="1"
              ></textarea>
            </div>
            <button type="submit" className={`p-3 rounded-full shrink-0 transition-colors shadow-sm ${
              newMessage.trim() ? 'bg-[#1f3b6c] text-white' : 'bg-slate-100 text-slate-400 pointer-events-none'
            }`}>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans pb-32">
      {/* Inbox Header */}
      <div className="bg-[#1f3b6c] pt-8 pb-6 px-6 relative overflow-hidden rounded-b-3xl shadow-sm">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="max-w-4xl mx-auto relative z-10 flex items-center justify-between">
          <Link to="/pro-dashboard" className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-white font-bold text-xl tracking-wide">Client Messages</h1>
          <div className="w-10"></div>
        </div>
        
        {/* Search */}
        <div className="max-w-4xl mx-auto relative z-10 mt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
            <input 
              type="text" 
              placeholder="Search clients..."
              className="w-full bg-white/10 text-white placeholder-blue-200 border border-white rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:bg-white/20 transition"
            />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100 min-h-[50vh]">
          {isLoadingChats ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-[#c9a765] animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p>No messages from clients yet.</p>
            </div>
          ) : (
            chats.map((chat, idx) => (
              <React.Fragment key={chat.id}>
                <div 
                  onClick={() => setActiveChat(chat)}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer rounded-2xl group"
                >
                  <div className="relative shrink-0">
                    <ChatAvatar src={chat.avatar} name={chat.name} className="w-14 h-14 rounded-full object-cover border border-slate-200 group-hover:border-[#1f3b6c] transition-colors bg-white" />
                    {chat.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-800 truncate pr-2 text-[15px]">{chat.name}</h3>
                      <span className={`text-[11px] font-bold shrink-0 ${chat.unread ? 'text-[#c9a765]' : 'text-slate-400'}`}>
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate pr-4 ${chat.unread ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                        {chat.lastMessage}
                      </p>
                      {chat.unread > 0 && (
                        <div className="w-5 h-5 bg-[#c9a765] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {idx < chats.length - 1 && <div className="h-px bg-slate-100 mx-4"></div>}
              </React.Fragment>
            ))
          )}
        </div>
      </main>

      <ProfessionalBottomNav />
    </div>
  );
}
