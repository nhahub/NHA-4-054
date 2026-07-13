import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Home, CheckCircle2, Phone, UploadCloud, ChevronDown, X, Briefcase, ArrowLeft, User, FileImage, Wrench, MapPin } from 'lucide-react';
import BackgroundElements from '../../components/BackgroundElements';
import { SplitText } from '../../components/reactbits/SplitText';
import { BlurText } from '../../components/reactbits/BlurText';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const COUNTRY_CODES = [
  { code: '+20', country: 'SA', flag: '🇪🇬' },
  { code: '+20', country: 'EG', flag: '🇪🇬' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+965', country: 'KW', flag: '🇰🇼' },
  { code: '+974', country: 'QA', flag: '🇶🇦' },
  { code: '+973', country: 'BH', flag: '🇧🇭' },
  { code: '+968', country: 'OM', flag: '🇴🇲' },
];

const AVAILABLE_SKILLS = [
  "Plumbing", "Electrical", "Carpentry", "Painting", 
  "HVAC", "Cleaning", "Masonry", "Landscaping"
];

const CITIES = [
  "Cairo, Nasr City", "Cairo, Olaya", "Alexandria, Al Safa", 
  "Dammam, Al Faisaliyah", "Mecca, Al Awali", "Medina, Quba"
];

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState(location.pathname === '/register' ? 'register' : 'login');
  
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    countryCode: '+20',
    password: '',
    location: 'Cairo, Nasr City'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [location.pathname]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setErrors({});
    if (tab === 'login') {
      navigate('/login', { replace: true });
    } else {
      navigate('/register', { replace: true });
    }
  };

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
    if (errors.skills) setErrors({ ...errors, skills: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          localStorage.setItem('user', JSON.stringify(userData));
          navigate(userData.role === 'professional' ? '/pro-dashboard' : '/dashboard');
        } else {
          setErrors({ email: 'User data not found in database.' });
        }
      } catch (error) {
        console.error("Login Error:", error);
        setErrors({ email: 'Invalid email or password' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    else if (formData.fullName.trim().length < 3) newErrors.fullName = 'Full name must be at least 3 characters';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';

    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (formData.phone.length < 9) newErrors.phone = 'Please enter a valid phone number';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (selectedRole === 'professional') {
      if (!idFront) newErrors.idFront = 'ID Front is required';
      if (!idBack) newErrors.idBack = 'ID Back is required';
      if (selectedSkills.length === 0) newErrors.skills = 'Please select at least one skill';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        const userData = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          role: selectedRole,
          profileImage: null,
          skills: selectedRole === 'professional' ? selectedSkills : []
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
        
        localStorage.setItem('user', JSON.stringify(userData));
        navigate(selectedRole === 'professional' ? '/pro-dashboard' : '/dashboard');
      } catch (error) {
        console.error("Register Error:", error);
        if (error.code === 'auth/email-already-in-use') {
          setErrors({ email: 'Email already registered' });
        } else {
          setErrors({ email: error.message });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setErrors({ email: 'من فضلك أدخل البريد الإلكتروني أولاً في خانة الإيميل' });
      return;
    }
    
    setIsLoading(true);
    setResetSent(false);
    try {
      // Check if user exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', formData.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrors({ email: 'هذا البريد الإلكتروني غير مسجل لدينا.' });
        setIsLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, formData.email);
      setResetSent(true);
      setErrors({});
    } catch (error) {
      console.error("Reset Password Error:", error.code);
      if (error.code === 'auth/user-not-found') {
        setErrors({ email: 'هذا البريد الإلكتروني غير مسجل لدينا.' });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'صيغة البريد الإلكتروني غير صحيحة.' });
      } else {
        setErrors({ email: 'An error occurred, please try again later.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      
      {/* Left Side - Image/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-[#1f3b6c] items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -left-40 w-96 h-96 bg-[#c9a765] rounded-full mix-blend-multiply filter blur-[128px] opacity-40"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/2 -right-40 w-[30rem] h-[30rem] bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"
          ></motion.div>
          
          <img src="/hero-bg.jpg" alt="Home Services" className="w-full h-full object-cover opacity-30 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f3b6c] via-[#1f3b6c]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1f3b6c] via-[#1f3b6c]/90 to-transparent"></div>
        </div>
        
        {/* Floating Elements / Content */}
        <div className="relative z-10 p-16 text-white max-w-2xl flex flex-col justify-center h-full">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } }
            }}
          >
            <motion.div 
              variants={{ hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } }}
              className="w-20 h-2 bg-[#c9a765] rounded-full mb-8 shadow-[0_0_15px_rgba(201,167,101,0.5)]"
            ></motion.div>
            
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="text-5xl xl:text-6xl font-extrabold mb-6 leading-tight tracking-tight"
            >
              Expert Services, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c9a765] to-[#f3dca6]">Right at your Doorstep.</span>
            </motion.h1>
            
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="text-lg xl:text-xl text-slate-300 leading-relaxed font-medium max-w-lg mb-12 border-l-4 border-slate-600/50 pl-6"
            >
              Join Fixora today and connect with thousands of verified professionals ready to help you with your home needs. Safe, fast, and reliable.
            </motion.p>
            
            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              className="flex gap-6 items-center bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-xl w-fit"
            >
              <div className="flex -space-x-4">
                {[1,2,3,4].map((i, index) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + (index * 0.1) }}
                    className="w-12 h-12 rounded-full border-2 border-[#1f3b6c] bg-slate-200 overflow-hidden shadow-md"
                  >
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </motion.div>
                ))}
              </div>
              <div className="text-sm font-semibold">
                <span className="text-[#c9a765] text-xl font-bold tracking-wider">50,000+</span> <br/>
                <span className="text-slate-300">Happy Users</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center relative bg-[#f5f3ec] p-4 py-12 lg:p-10 overflow-hidden">
        <BackgroundElements />
        
        <div className="w-full max-w-[440px] z-10 relative">
          
          {/* Header Logo (Bigger) */}
          <div className="text-center mb-8">
            <Link to="/" className="cursor-pointer inline-block">
              <img src="/logo.png" alt="Fixora Logo" className="h-28 lg:h-32 object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105" />
            </Link>
          </div>

          {/* Beautiful Card Shape */}
          <div className="bg-white/90 backdrop-blur-3xl border border-white shadow-[0_20px_60px_-15px_rgba(31,59,108,0.2)] rounded-[2.5rem] overflow-hidden">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-100 relative">
            <button 
              onClick={() => switchTab('register')}
              className={`flex-1 py-4 text-center font-bold text-sm transition-all z-10 ${activeTab === 'register' ? 'text-[#c9a765]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign Up
            </button>
            <button 
              onClick={() => switchTab('login')}
              className={`flex-1 py-4 text-center font-bold text-sm transition-all z-10 ${activeTab === 'login' ? 'text-[#c9a765]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Login
            </button>
            {/* Animated Underline */}
            <motion.div 
              className="absolute bottom-0 h-1 bg-[#c9a765] rounded-t-full"
              initial={false}
              animate={{
                width: '50%',
                left: activeTab === 'register' ? '0%' : '50%'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>

          <div className="p-6 sm:p-10">
            <AnimatePresence mode="wait">
              {/* LOGIN TAB */}
              {activeTab === 'login' && (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <form className="space-y-5" onSubmit={handleLoginSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                          <Mail size={20} />
                        </div>
                        <input 
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-4 py-3.5 bg-[#f8f9fa] border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765]'} rounded-xl focus:ring-2 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700`}
                          placeholder="you@example.com"
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-xs mt-1 ml-1 font-medium">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-sm font-semibold text-slate-700">Password</label>
                        <button 
                          type="button" 
                          onClick={handleForgotPassword}
                          disabled={isLoading}
                          className="text-sm font-semibold text-[#c9a765] hover:text-[#1f3b6c] transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                          <Lock size={20} />
                        </div>
                        <input 
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-12 py-3.5 bg-[#f8f9fa] border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765]'} rounded-xl focus:ring-2 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700`}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1 ml-1 font-medium text-left">{errors.password}</p>}
                      {resetSent && <p className="text-green-600 text-xs mt-2 ml-1 font-medium text-left">Password reset link sent! Please check your inbox.</p>}
                    </div>

                  <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#c9a765] hover:bg-[#b89854] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#c9a765]/30 transition-all active:scale-[0.98] mt-8 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                  {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
                  </form>

                  <div className="mt-8 relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase tracking-wider">OR</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  <div className="mt-6">
                    <motion.button 
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-slate-700 font-semibold"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* REGISTER TAB */}
              {activeTab === 'register' && (
                <motion.div 
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {/* Register Step 1: Role Selection */}
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">Join Fixora</h2>
                          <p className="text-slate-500 font-medium text-sm">Choose an account type to customize your experience</p>
                        </div>

                        <div className="flex flex-col gap-4 mb-8">
                          <motion.button 
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedRole('homeowner')}
                            className={`text-left rounded-[1.5rem] p-5 border-2 transition-all duration-300 group
                              ${selectedRole === 'homeowner' ? 'border-[#1f3b6c] bg-white shadow-lg shadow-[#1f3b6c]/10' : 'border-transparent bg-[#f8f9fa] hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center transition-colors
                                ${selectedRole === 'homeowner' ? 'bg-[#1f3b6c] text-white' : 'bg-white text-[#1f3b6c] shadow-sm'}`}>
                                <Home className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800">Homeowner</h3>
                                <p className="text-slate-500 text-xs mt-1">Book professionals for home repairs</p>
                              </div>
                              <div className="ml-auto">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRole === 'homeowner' ? 'border-[#1f3b6c] bg-[#1f3b6c]' : 'border-slate-300'}`}>
                                  {selectedRole === 'homeowner' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                              </div>
                            </div>
                          </motion.button>

                          <motion.button 
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setSelectedRole('professional')}
                            className={`text-left rounded-[1.5rem] p-5 border-2 transition-all duration-300 group
                              ${selectedRole === 'professional' ? 'border-[#c9a765] bg-white shadow-lg shadow-[#c9a765]/10' : 'border-transparent bg-[#f8f9fa] hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center transition-colors
                                ${selectedRole === 'professional' ? 'bg-[#c9a765] text-white' : 'bg-white text-[#c9a765] shadow-sm'}`}>
                                <Briefcase className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-800">Professional</h3>
                                <p className="text-slate-500 text-xs mt-1">Offer services and reach new clients</p>
                              </div>
                              <div className="ml-auto">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRole === 'professional' ? 'border-[#c9a765] bg-[#c9a765]' : 'border-slate-300'}`}>
                                  {selectedRole === 'professional' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        </div>

                        <motion.button 
                          whileHover={selectedRole ? { scale: 1.02 } : {}}
                          whileTap={selectedRole ? { scale: 0.98 } : {}}
                          onClick={() => setStep(2)}
                          disabled={!selectedRole}
                          className={`w-full py-3.5 rounded-xl font-bold transition-all duration-300
                            ${selectedRole ? 'bg-[#1f3b6c] text-white shadow-lg hover:bg-[#1a325b]' : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'}`}
                        >
                          Continue
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Register Step 2: Form */}
                    {step === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <button 
                          onClick={() => setStep(1)} 
                          className="flex items-center gap-2 text-slate-400 hover:text-[#1f3b6c] transition-colors text-sm font-semibold mb-6"
                        >
                          <ArrowLeft size={16} /> Back
                        </button>

                        <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                          
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                                <User size={18} />
                              </div>
                              <input 
                                type="text" 
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-4 py-3 bg-[#f8f9fa] border ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765]'} rounded-xl focus:ring-2 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 text-sm`}
                                placeholder="John Architect"
                              />
                            </div>
                            {errors.fullName && <p className="text-red-500 text-xs ml-1 font-medium">{errors.fullName}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                                <Mail size={18} />
                              </div>
                              <input 
                                type="email" 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-4 py-3 bg-[#f8f9fa] border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765]'} rounded-xl focus:ring-2 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 text-sm`}
                                placeholder="john@example.com"
                              />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs ml-1 font-medium">{errors.email}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Phone</label>
                            <div className={`relative flex bg-[#f8f9fa] border ${errors.phone ? 'border-red-500 focus-within:ring-red-500' : 'border-transparent focus-within:bg-white focus-within:border-[#c9a765] focus-within:ring-[#c9a765]'} rounded-xl focus-within:ring-2 transition-all overflow-hidden group`}>
                              <div className="flex items-center pl-2 pr-1 border-r border-slate-200 shrink-0 bg-slate-50 focus-within:bg-white transition-colors relative">
                                <select
                                  name="countryCode"
                                  value={formData.countryCode}
                                  onChange={handleChange}
                                  className="appearance-none bg-transparent py-3 pl-2 pr-6 text-sm font-bold text-slate-700 outline-none cursor-pointer z-10"
                                >
                                  {COUNTRY_CODES.map(c => (
                                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
                              </div>
                              <input 
                                type="tel" 
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full py-3 pl-3 pr-4 bg-transparent outline-none placeholder:text-slate-400 font-medium text-slate-700 text-sm"
                                placeholder="5X XXX XXXX"
                              />
                            </div>
                            {errors.phone && <p className="text-red-500 text-xs ml-1 font-medium">{errors.phone}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Location</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                                <MapPin size={18} />
                              </div>
                              <select 
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-10 py-3 bg-[#f8f9fa] border border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765] rounded-xl focus:ring-2 outline-none transition-all font-medium text-slate-700 text-sm appearance-none cursor-pointer`}
                              >
                                {CITIES.map(city => (
                                  <option key={city} value={city}>{city}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors">
                                <Lock size={18} />
                              </div>
                              <input 
                                type={showPassword ? "text" : "password"} 
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full pl-11 pr-11 py-3 bg-[#f8f9fa] border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-transparent focus:bg-white focus:border-[#c9a765] focus:ring-[#c9a765]'} rounded-xl focus:ring-2 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 text-sm`}
                                placeholder="••••••••"
                              />
                              <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs ml-1 font-medium">{errors.password}</p>}
                          </div>

                          {selectedRole === 'professional' && (
                            <>
                              {/* Skills Section */}
                              <div className="space-y-1.5 pt-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Your Skills</label>
                                <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#1f3b6c] transition-colors z-10">
                                    <Wrench size={18} />
                                  </div>
                                  <div 
                                    onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                                    className={`w-full pl-11 pr-11 py-2.5 bg-[#f8f9fa] border rounded-xl cursor-pointer flex flex-wrap gap-1.5 items-center min-h-[46px] transition-all
                                      ${isSkillsOpen ? 'ring-2 ring-[#c9a765] border-transparent bg-white' : (errors.skills ? 'border-red-500' : 'border-transparent hover:bg-white')}`}
                                  >
                                    {selectedSkills.length === 0 ? (
                                      <span className="text-slate-400 font-medium text-sm">Select skills...</span>
                                    ) : (
                                      selectedSkills.map(skill => (
                                        <span key={skill} className="bg-[#1f3b6c] text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                          {skill}
                                          <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }}
                                            className="hover:bg-white/20 rounded-full p-0.5"
                                          >
                                            <X size={10} />
                                          </button>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 cursor-pointer" onClick={() => setIsSkillsOpen(!isSkillsOpen)}>
                                    <ChevronDown size={18} className={`transition-transform duration-300 ${isSkillsOpen ? 'rotate-180 text-[#c9a765]' : ''}`} />
                                  </div>
                                </div>
                                
                                <AnimatePresence>
                                  {isSkillsOpen && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      className="absolute w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5"
                                    >
                                      {AVAILABLE_SKILLS.map(skill => (
                                        <button
                                          key={skill} type="button" onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }}
                                          className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all hover:bg-slate-50 text-sm"
                                        >
                                          <span className={`font-medium ${selectedSkills.includes(skill) ? 'text-[#1f3b6c] font-bold' : 'text-slate-700'}`}>{skill}</span>
                                          {selectedSkills.includes(skill) && <CheckCircle2 size={16} className="text-[#c9a765]" />}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                {errors.skills && <p className="text-red-500 text-xs ml-1 font-medium">{errors.skills}</p>}
                              </div>
                            </>
                          )}

                          {/* Universal ID Upload */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Identity Verification (National ID)</label>
                            <div className="grid grid-cols-2 gap-3">
                                  {/* Front */}
                                  <div className="relative group cursor-pointer">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setIdFront(e.target.files[0].name); if (errors.idFront) setErrors({...errors, idFront: ''}); } }} />
                                    <div className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${errors.idFront ? 'border-red-500 bg-red-50' : (idFront ? 'border-[#23a06a] bg-[#23a06a]/5' : 'border-slate-300 bg-[#f8f9fa] group-hover:border-[#c9a765] group-hover:bg-white')}`}>
                                      {idFront ? (
                                        <><CheckCircle2 className="w-5 h-5 text-[#23a06a] mb-1" /><span className="text-[10px] font-semibold text-[#23a06a] px-2 truncate w-full text-center">{idFront}</span></>
                                      ) : (
                                        <><FileImage className="w-5 h-5 text-slate-400 mb-1" /><span className="text-[10px] font-semibold text-slate-500">ID Front</span></>
                                      )}
                                    </div>
                                  </div>
                                  {/* Back */}
                                  <div className="relative group cursor-pointer">
                                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setIdBack(e.target.files[0].name); if (errors.idBack) setErrors({...errors, idBack: ''}); } }} />
                                    <div className={`h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${errors.idBack ? 'border-red-500 bg-red-50' : (idBack ? 'border-[#23a06a] bg-[#23a06a]/5' : 'border-slate-300 bg-[#f8f9fa] group-hover:border-[#c9a765] group-hover:bg-white')}`}>
                                      {idBack ? (
                                        <><CheckCircle2 className="w-5 h-5 text-[#23a06a] mb-1" /><span className="text-[10px] font-semibold text-[#23a06a] px-2 truncate w-full text-center">{idBack}</span></>
                                      ) : (
                                        <><FileImage className="w-5 h-5 text-slate-400 mb-1" /><span className="text-[10px] font-semibold text-slate-500">ID Back</span></>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {(errors.idFront || errors.idBack) && <p className="text-red-500 text-xs ml-1 font-medium">{errors.idFront || errors.idBack}</p>}
                          </div>

                  <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#1f3b6c] hover:bg-[#162b50] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-[#1f3b6c]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating Account...' : 'Complete Registration'}
                    {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
