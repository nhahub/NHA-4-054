import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, MapPin, Search, ChevronDown, Droplets, Zap, Paintbrush, Star, Users, Sparkles, Wrench, Flame, LayoutGrid, ShieldCheck, Plus, MessageCircle, Hammer, Wind, Bug, Settings, MessageSquare, ClipboardList } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { SplitText } from '../../components/reactbits/SplitText';
import BackgroundElements from '../../components/BackgroundElements';
import HomeownerBottomNav from '../../components/homeowner/HomeownerBottomNav';

export default function HomeownerDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState({ initials: 'JD', location: 'Cairo, Nasr City', profileImage: null });
  const [myRequests, setMyRequests] = useState([]);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        import('../../firebase/messaging').then(({ requestNotificationPermission }) => {
          requestNotificationPermission(user.uid);
        });
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let initials = 'U';
            if (data.fullName) {
              const parts = data.fullName.trim().split(' ');
              if (parts.length > 1) {
                initials = (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
              } else {
                initials = data.fullName.substring(0, 2).toUpperCase();
              }
            }
            setUserData({
              initials,
              location: data.location || 'Cairo, Nasr City',
              profileImage: data.profileImage || null,
              fullName: data.fullName
            });
          }
        });

        // Also fetch active requests
        const requestsQ = query(
          collection(db, 'requests'), 
          where('homeownerId', '==', user.uid)
        );
        const unsubscribeRequests = onSnapshot(requestsQ, (snapshot) => {
          const reqs = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'open' || data.status === 'pending') {
              reqs.push({ id: doc.id, ...data });
            }
          });
          setMyRequests(reqs.sort((a,b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          }));
        }, (error) => {
          console.error("Error fetching requests: ", error);
        });

        return () => {
          unsubscribeSnapshot();
          unsubscribeRequests();
        };
      } else {
        setMyRequests([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const services = [
    {
      id: 1,
      title: 'Plumbing',
      prosCount: 98,
      rating: 4.8,
      icon: <Droplets className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 2,
      title: 'Electrical',
      prosCount: 142,
      rating: 4.9,
      icon: <Zap className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 3,
      title: 'Cleaning',
      prosCount: 203,
      rating: 4.8,
      icon: <Sparkles className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 4,
      title: 'Painting',
      prosCount: 115,
      rating: 4.9,
      icon: <Paintbrush className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 5,
      title: 'Maintenance',
      prosCount: 167,
      rating: 4.7,
      icon: <Wrench className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 6,
      title: 'Welding',
      prosCount: 54,
      rating: 4.6,
      icon: <Flame className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 7,
      title: 'Flooring',
      prosCount: 79,
      rating: 4.7,
      icon: <LayoutGrid className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 8,
      title: 'Security',
      prosCount: 63,
      rating: 4.8,
      icon: <ShieldCheck className="w-5 h-5" />,
      image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=600&auto=format&fit=crop'
    },
    {
      id: 9,
      title: 'Carpentry',
      prosCount: 85,
      rating: 4.9,
      icon: <Hammer className="w-5 h-5" />,
      image: '/images/services/carpentry.jpg'
    },
    {
      id: 10,
      title: 'HVAC',
      prosCount: 112,
      rating: 4.7,
      icon: <Wind className="w-5 h-5" />,
      image: '/images/services/hvac.jpg'
    },
    {
      id: 11,
      title: 'Pest Control',
      prosCount: 45,
      rating: 4.6,
      icon: <Bug className="w-5 h-5" />,
      image: '/images/services/pest_control.jpg'
    },
    {
      id: 12,
      title: 'Appliance Repair',
      prosCount: 92,
      rating: 4.8,
      icon: <Settings className="w-5 h-5" />,
      image: '/images/services/appliance.jpg'
    }
  ];

  const filteredServices = services.filter(service => 
    service.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startChat = async (proId, proName, proImage) => {
    if (!auth.currentUser || isStartingChat) return;
    setIsStartingChat(true);
    try {
      // Check if chat already exists
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      let existingChatId = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(proId)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        navigate('/chat');
      } else {
        // Create new chat
        const newChat = {
          participants: [auth.currentUser.uid, proId],
          lastMessage: 'Chat started',
          lastMessageTime: serverTimestamp(),
          participantDetails: {
            [auth.currentUser.uid]: {
              name: userData.fullName || 'Homeowner',
              avatar: userData.profileImage || null
            },
            [proId]: {
              name: proName || 'Professional',
              avatar: proImage || null
            }
          }
        };
        await addDoc(chatsRef, newChat);
        navigate('/chat');
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 pb-32 font-sans relative overflow-hidden">
      <BackgroundElements />
      
      {/* Top Navigation */}
      <header className="bg-[#f5f3ec] backdrop-blur-xl sticky top-0 z-40 px-4 py-4 md:px-8 border-b border-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Avatar */}
          <Link to="/profile">
            <motion.div whileHover={{ scale: 1.05 }} className="w-12 h-12 bg-[#1f3b6c] rounded-full flex items-center justify-center text-white font-bold shadow-md cursor-pointer border-2 border-white overflow-hidden">
              {userData.profileImage ? (
                <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userData.initials
              )}
            </motion.div>
          </Link>
          
          {/* Location & Title */}
          <div className="flex flex-col items-center">
            <div className="mb-1 text-[#1f3b6c] font-black text-xl tracking-wider">FIXORA</div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 cursor-pointer hover:text-[#1f3b6c] transition-colors">
              <MapPin className="w-3 h-3 text-[#c9a765]" />
              <span>{userData.location}</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
          
          <div className="flex gap-3 relative z-10">
            <Link to="/chat" className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-[#1f3b6c] hover:bg-white/20 transition relative">
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#c9a765] rounded-full"></span>
            </Link>
            <Link to="/homeowner/notifications" className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-[#1f3b6c] hover:bg-white/20 transition relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#c9a765] rounded-full border border-[#f5f3ec]"></span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-4">
        
        {/* Main Question */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-extrabold text-[#1f3b6c] mb-6 flex justify-center"
          >
            <SplitText text="What do you need help with?" delay={30} />
          </motion.h1>
          
          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-white rounded-2xl shadow-lg shadow-slate-200/50 focus:ring-2 focus:ring-[#c9a765] focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700"
              placeholder="Search for a service..."
            />
          </motion.div>
        </div>

        {/* My Active Requests Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-[#1f3b6c] flex items-center justify-between mb-4">
            <SplitText text="My Active Requests" delay={40} />
            <span className="bg-[#1f3b6c] text-white text-xs px-2 py-0.5 rounded-full">{myRequests.length}</span>
          </h2>
          
          {myRequests.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {myRequests.map(req => (
                <Link 
                  key={req.id} 
                  to={`/homeowner/request/${req.id}/offers`}
                  className="min-w-[280px] flex-shrink-0 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-block px-3 py-1 bg-[#c9a765]/10 text-[#c9a765] text-xs font-black uppercase tracking-wider rounded-lg">
                      {req.serviceType}
                    </span>
                    {req.offersCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" /> {req.offersCount} Offers
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{req.description || 'No description provided.'}</p>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.location?.name || 'Cairo'}</span>
                    <span className="text-[#1f3b6c] font-bold">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">You don't have any active requests.</p>
              <Link to="/create-request" className="text-[#c9a765] font-bold text-sm mt-2 inline-block">Create one now →</Link>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1f3b6c] flex">
            <SplitText text="Choose a Service" delay={40} />
          </h2>
          <span className="text-sm font-semibold text-slate-400">{filteredServices.length} available</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {filteredServices.length > 0 ? (
            filteredServices.map((service, index) => (
              <Link to="/create-request" state={{ selectedService: service.title.toLowerCase() }} key={service.id}>
                <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (index * 0.1) }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300"
              >
              <img src={service.image} alt={service.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1f3b6c]/90 via-[#1f3b6c]/40 to-transparent"></div>
              
              <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/30 group-hover:bg-[#c9a765] group-hover:border-transparent transition-colors">
                {service.icon}
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <h3 className="text-white font-bold text-xl mb-1">{service.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs font-bold border border-white/30">
                      <Star className="w-3 h-3 fill-current text-[#c9a765]" /> {service.rating}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-200 text-xs font-medium">
                  <Users className="w-3 h-3" /> {service.prosCount} Pros
                </div>
              </div>
              </motion.div>
              </Link>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/50 backdrop-blur-md rounded-3xl border border-white">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">No services found</h3>
              <p className="text-slate-500 font-medium">Try adjusting your search terms</p>
            </div>
          )}
        </div>

      </main>

      {/* Floating Action Button for Create Request */}
      <Link to="/create-request" className="fixed bottom-24 right-4 md:right-8 z-40">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-tr from-[#1f3b6c] to-[#2a4d8c] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#1f3b6c]/40 border-2 border-white"
        >
          <Plus className="w-8 h-8" />
        </motion.div>
      </Link>

      {/* Bottom Navigation */}
      <HomeownerBottomNav />

    </div>
  );
}
