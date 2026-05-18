import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LogIn, LogOut, Shield, User, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

export function Login({ onLoginSuccess }: { onLoginSuccess: (user: UserRole) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) throw new Error('Email is required');

      // Check if user has a profile
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        onLoginSuccess(userSnap.data() as UserRole);
      } else {
        // Check for an invite
        const inviteRef = doc(db, 'invites', user.email);
        const inviteSnap = await getDoc(inviteRef);

        let role: 'ADMIN' | 'EMPLOYEE' = 'ADMIN';
        let firmId = `firm_${Math.random().toString(36).substr(2, 9)}`;

        if (inviteSnap.exists()) {
          const inviteData = inviteSnap.data();
          role = inviteData.role;
          firmId = inviteData.firmId;
        } else {
          // If no existing users in system, first user is ADMIN
          // Otherwise, we might want a more restrictive flow.
          // For now, if no invite, they create their own new firm.
        }

        const newUser: UserRole = {
          uid: user.uid,
          email: user.email,
          role,
          firmId,
          displayName: user.displayName || 'مستخدم جديد',
          createdAt: new Date().toISOString()
        };

        await setDoc(userRef, {
          ...newUser,
          createdAt: serverTimestamp()
        });
        
        onLoginSuccess(newUser);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border-4 border-[#1A1A1A] shadow-brutal max-w-sm w-full mx-auto">
      <div className="w-20 h-20 bg-[#1A1A1A] text-white flex items-center justify-center shadow-brutal rotate-[-3deg] mb-8">
        <Building2 size={40} />
      </div>
      
      <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">نظام بنيان</h2>
      <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em] mb-8">BUNYAN / AUTHENTICATION</p>
      
      <div className="w-full space-y-4">
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#1A1A1A] text-white py-4 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[11px] shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin"></div>
          ) : (
            <LogIn size={18} />
          )}
          <span>تسجيل الدخول بواسطة جوجل</span>
        </button>

        {error && (
          <p className="text-rose-500 text-[10px] font-bold text-center mt-2">{error}</p>
        )}

        <div className="bg-[#F2F0EA] p-4 text-[9px] font-bold leading-relaxed opacity-60">
          <p>يتطلب النظام حساب Google مفعل للوصول إلى بيانات المشاريع والتعاون مع الفريق الهندسي.</p>
        </div>
      </div>
    </div>
  );
}
