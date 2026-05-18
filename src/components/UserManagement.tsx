import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRole } from '../types';
import { Plus, Trash2, UserPlus, Mail, Shield, User as UserIcon, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function UserManagement({ currentUser, onToast }: { currentUser: UserRole, onToast?: (msg: string) => void }) {
  const [employees, setEmployees] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');

  const triggerToast = (msg: string) => {
    if (onToast) {
      onToast(msg);
    } else {
      console.log(msg);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('firmId', '==', currentUser.firmId));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => doc.data() as UserRole);
      setEmployees(docs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentUser.firmId]);

  const handleInvite = async () => {
    if (!newEmail.trim()) return;
    try {
      const inviteRef = doc(db, 'invites', newEmail.trim().toLowerCase());
      await setDoc(inviteRef, {
        email: newEmail.trim().toLowerCase(),
        firmId: currentUser.firmId,
        role: newRole,
        invitedBy: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      setNewEmail('');
      setIsAdding(false);
      alert('تم إرسال الدعوة بنجاح. سيتمكن الموظف من الانضمام عند تسجيل الدخول بنفس البريد الإلكتروني.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invites');
    }
  };

  const removeUser = async (uid: string) => {
    if (uid === currentUser.uid) return alert('لا يمكنك حذف حسابك الخاص');
    if (!confirm('هل أنت متأكد من سحب صلاحيات هذا المستخدم؟')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setEmployees(prev => prev.filter(e => e.uid !== uid));
      triggerToast('تم سحب الصلاحيات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const toggleUserRole = async (user: UserRole) => {
    if (user.uid === currentUser.uid) return;
    const newRole = user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
    if (!confirm(`هل أنت متأكد من تغيير صلاحية ${user.displayName} إلى ${newRole === 'ADMIN' ? 'مدير' : 'موظف'}؟`)) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setEmployees(prev => prev.map(e => e.uid === user.uid ? { ...e, role: newRole } : e));
      triggerToast('تم تحديث الصلاحية بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">إدارة فريق العمل</h3>
          <p className="text-[10px] font-bold opacity-40 uppercase">إدارة المستخدمين والصلاحيات لمؤسستك</p>
        </div>
        {!isAdding && currentUser.role === 'ADMIN' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#1A1A1A] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <UserPlus size={14} />
            إضافة موظف
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border-4 border-[#1A1A1A] p-6 shadow-brutal-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b-2 border-[#F2F0EA] pb-3">
            <h4 className="text-[12px] font-black uppercase tracking-widest">دعوة موظف جديد</h4>
            <button onClick={() => setIsAdding(false)}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">البريد الإلكتروني (Google Account)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={14} />
                <input 
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-[#F2F0EA] p-3 pl-10 text-xs font-bold border-2 border-transparent focus:border-[#1A1A1A] outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">الصلاحية</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setNewRole('EMPLOYEE')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase border-2 transition-all",
                    newRole === 'EMPLOYEE' ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-slate-400 border-slate-200 hover:border-[#1A1A1A]"
                  )}
                >
                  موظف (إدخال بيانات)
                </button>
                <button 
                  onClick={() => setNewRole('ADMIN')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase border-2 transition-all",
                    newRole === 'ADMIN' ? "bg-[#A08C5B] text-white border-[#A08C5B]" : "bg-white text-slate-400 border-slate-200 hover:border-[#A08C5B]"
                  )}
                >
                  مدير (صلاحيات كاملة)
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={handleInvite}
            className="w-full bg-[#1A1A1A] text-white py-3 text-[11px] font-black uppercase tracking-widest shadow-brutal-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            إرسال دعوة الانضمام
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex flex-col items-center gap-4 opacity-40">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest">جاري تحميل قائمة الفريق...</p>
          </div>
        ) : employees.map((emp) => (
          <div key={emp.uid} className="bg-white border-2 border-[#1A1A1A] p-4 flex items-center justify-between shadow-brutal-sm">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-sm text-white",
                emp.role === 'ADMIN' ? "bg-[#A08C5B]" : "bg-[#1A1A1A]"
              )}>
                {emp.role === 'ADMIN' ? <Shield size={18} /> : <UserIcon size={18} />}
              </div>
              <div>
                <p className="text-[12px] font-black">{emp.displayName}</p>
                <p className="text-[10px] font-bold opacity-40">{emp.email}</p>
                <p className={cn(
                  "text-[8px] font-black uppercase tracking-widest mt-1",
                  emp.role === 'ADMIN' ? "text-[#A08C5B]" : "text-slate-400"
                )}>
                  {emp.role === 'ADMIN' ? 'مدير نظام' : 'موظف ميداني'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.role === 'ADMIN' && emp.uid !== currentUser.uid && (
                <>
                  <button 
                    onClick={() => toggleUserRole(emp)}
                    className="p-2 text-[#A08C5B] hover:bg-[#A08C5B]/10 rounded-sm transition-all"
                    title="تغيير الصلاحية"
                  >
                    <Shield size={16} />
                  </button>
                  <button 
                    onClick={() => removeUser(emp.uid)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-sm transition-all"
                    title="سحب الصلاحيات"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {!loading && employees.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-[#E5E1D8]">
            <p className="text-sm font-bold opacity-40 italic">لا يوجد موظفين حالياً في هذا الفريق</p>
          </div>
        )}
      </div>
    </div>
  );
}
