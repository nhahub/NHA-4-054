import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ShieldCheck, MapPin, Wrench, ChevronLeft, Briefcase, ThumbsUp, CheckCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { getReviewsByProfessional } from '../../../services/api';
import { Loader2 } from 'lucide-react';

export default function ProProfileView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'portfolio'

  const { id } = useParams();
  const [pro, setPro] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch Pro Details
        const proDoc = await getDoc(doc(db, "users", id));
        if (proDoc.exists()) {
          const data = proDoc.data();
          setPro({
            id: proDoc.id,
            name: data.fullName || 'Professional',
            title: data.speciality || 'Service Provider',
            rating: data.rating || 0,
            reviewsCount: data.reviewsCount || data.reviewCount || 0,
            jobsCompleted: data.completedJobs || 0,
            experience: data.experience ? `${data.experience} Years` : 'N/A',
            location: 'Egypt',
            bio: data.bio || 'Professional service provider.',
            image: data.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullName || 'Pro')}&background=1f3b6c&color=fff&size=150`
          });
        }
        
        // 2. Fetch Reviews
        const fetchedReviews = await getReviewsByProfessional(id);
        setReviews(fetchedReviews);
      } catch (error) {
        console.error("Error fetching pro profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#c9a765] animate-spin" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
        <p className="text-xl font-bold text-slate-500">Professional not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans pb-32">
      {/* Header Profile Cover */}
      <div className="bg-[#1f3b6c] pt-8 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 -mr-20 -mt-20"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white mb-6 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Profile Card Overlay */}
      <main className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 space-y-6">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0 -mt-12 bg-white">
              <img src={pro.image} alt={pro.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <h1 className="text-2xl font-black text-[#1f3b6c]">{pro.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-1 bg-[#c9a765]/10 px-3 py-1 rounded-lg">
                  <Star className="w-4 h-4 text-[#c9a765] fill-[#c9a765]" />
                  <span className="font-bold text-[#c9a765]">{pro.rating}</span>
                  <span className="text-xs text-[#c9a765]/80">({pro.reviewsCount})</span>
                </div>
              </div>
              
              <p className="text-slate-600 font-medium mb-3 flex items-center justify-center md:justify-start gap-2">
                <Wrench className="w-4 h-4" /> {pro.title}
              </p>
              
              <p className="text-sm text-slate-500 flex items-center justify-center md:justify-start gap-2 mb-4">
                <MapPin className="w-4 h-4" /> {pro.location}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Pro
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> {pro.experience} Exp.
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {pro.jobsCompleted} Jobs
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="font-bold text-[#1f3b6c] mb-2">About</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{pro.bio}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'reviews' ? 'text-[#1f3b6c]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Reviews ({pro.reviewsCount})
            {activeTab === 'reviews' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#c9a765] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'reviews' ? (
            <div className="space-y-4">
              {reviews.length > 0 ? reviews.map(review => {
                const dateStr = review.createdAt?.toDate 
                  ? new Date(review.createdAt.toDate()).toLocaleDateString()
                  : '';
                return (
                  <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3 items-center">
                        <img src={review.homeownerAvatar} alt={review.homeownerName} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{review.homeownerName}</h4>
                          <span className="text-xs text-slate-400">{dateStr} • {review.serviceName}</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-[#c9a765] fill-[#c9a765]' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm">{review.reviewText}</p>
                    <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-600 cursor-pointer transition-colors w-max">
                      <ThumbsUp className="w-3 h-3" /> Helpful
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 font-medium">
                  No reviews yet.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {portfolio.map(item => (
                <div key={item.id} className="relative rounded-2xl overflow-hidden group aspect-square">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1f3b6c]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white font-bold text-sm">{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
