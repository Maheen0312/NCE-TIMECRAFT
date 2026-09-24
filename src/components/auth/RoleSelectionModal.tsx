import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { verifyAdminSecretCodeOnServer } from '@/services/authService';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { UserProfile } from '@/services/userService';
import { StaffProfile } from '@/types/timetable';
import { toast } from 'react-hot-toast';
import { 
  ShieldCheck, 
  UserCheck, 
  KeyRound, 
  ArrowLeft, 
  ShieldAlert, 
  LogOut, 
  Loader2,
  ChevronRight,
  Sparkles,
  Building,
  Eye,
  EyeOff
} from 'lucide-react';

type ModalStep = 'SELECT_PORTAL' | 'ADMIN_VERIFY' | 'STAFF_DENIED';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen }) => {
  const navigate = useNavigate();
  const { user, setAuthProfile, refreshUserProfile, logoutUser } = useAuth();

  const [step, setStep] = useState<ModalStep>('SELECT_PORTAL');
  const [adminSecretCode, setAdminSecretCode] = useState('');
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingStaff, setIsCheckingStaff] = useState(false);

  if (!isOpen || !user) return null;

  const userEmail = (user.email || '').toLowerCase().trim();
  const userName = user.displayName || 'Google User';

  // Handler 1: User selects ADMIN
  const handleSelectAdmin = () => {
    setAdminError('');
    setAdminSecretCode('');
    setShowSecretCode(false);
    setStep('ADMIN_VERIFY');
  };

  // Handler 2: User submits Admin Secret Code
  const handleVerifyAdminCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecretCode.trim()) {
      setAdminError('Please enter the Admin Secret Code.');
      return;
    }

    setAdminError('');
    setIsVerifying(true);

    try {
      // Secure server-side check - NEVER hardcoded in client code
      const result = await verifyAdminSecretCodeOnServer(adminSecretCode.trim());

      if (!result.success) {
        setAdminError('Invalid Admin Secret Code.');
        setIsVerifying(false);
        return;
      }

      // Admin verification succeeded!
      // Update/create user profile in Firestore users collection
      const adminProfile: UserProfile = {
        uid: user.uid,
        name: userName || 'Administrator',
        email: userEmail,
        role: 'admin',
        staffCode: null,
        staffId: null,
        active: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
      setAuthProfile(adminProfile);
      toast.success('Admin authorization verified. Welcome to Admin Portal!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error during admin verification:', err);
      setAdminError('An unexpected error occurred during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handler 3: User selects STAFF
  const handleSelectStaff = async () => {
    setIsCheckingStaff(true);
    try {
      // Query Admin-managed staff collection by authenticated Google email or user UID
      let matchedStaffDoc: any = null;
      let matchedStaffData: StaffProfile | null = null;

      if (userEmail) {
        const staffQuery = query(collection(db, 'staff'), where('email', '==', userEmail));
        const snap = await getDocs(staffQuery);
        if (!snap.empty) {
          matchedStaffDoc = snap.docs[0];
          matchedStaffData = { id: matchedStaffDoc.id, ...matchedStaffDoc.data() } as StaffProfile;
        }
      }

      if (!matchedStaffData) {
        const uidQuery = query(collection(db, 'staff'), where('userId', '==', user.uid));
        const snap = await getDocs(uidQuery);
        if (!snap.empty) {
          matchedStaffDoc = snap.docs[0];
          matchedStaffData = { id: matchedStaffDoc.id, ...matchedStaffDoc.data() } as StaffProfile;
        }
      }

      // Check if match exists and is active
      if (matchedStaffData && matchedStaffData.active !== false) {
        // Authorized Staff! Link staff doc with user.uid if not already linked
        if (matchedStaffData.userId !== user.uid) {
          await updateDoc(doc(db, 'staff', matchedStaffDoc.id), {
            userId: user.uid,
            updatedAt: serverTimestamp(),
          });
        }

        const staffProfile: UserProfile = {
          uid: user.uid,
          name: matchedStaffData.name || userName,
          email: userEmail,
          role: 'staff',
          staffCode: matchedStaffData.staffCode,
          staffId: matchedStaffDoc.id,
          active: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', user.uid), staffProfile, { merge: true });
        setAuthProfile(staffProfile);
        toast.success(`Staff account verified. Welcome, ${matchedStaffData.name || 'Faculty Member'}!`);
        navigate('/staff/dashboard', { replace: true });
      } else {
        // Not present in authorized Staff list -> DENY Staff access
        // Persist unauthorized record so no protected queries are allowed
        await setDoc(
          doc(db, 'users', user.uid),
          {
            uid: user.uid,
            name: userName,
            email: userEmail,
            role: 'unauthorized',
            staffCode: null,
            staffId: null,
            active: false,
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );

        setStep('STAFF_DENIED');
      }
    } catch (err) {
      console.error('Error verifying staff authorization:', err);
      toast.error('Failed to verify staff registry. Please try again.');
    } finally {
      setIsCheckingStaff(false);
    }
  };

  // Handler 4: Sign out / switch account
  const handleSignOut = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="role-selection-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-luna-dark-navy to-luna-deep-blue p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/10 text-cyan-300">
                <Building className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-200">
                NCE Timecraft • Verification
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20">
              Anna University
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-extrabold text-white tracking-tight">
            {step === 'SELECT_PORTAL' && 'Welcome to NCE Timecraft'}
            {step === 'ADMIN_VERIFY' && 'Admin Verification'}
            {step === 'STAFF_DENIED' && 'Access Denied'}
          </h2>

          <p className="mt-1 text-xs text-cyan-100/90">
            {step === 'SELECT_PORTAL' && 'How do you want to continue?'}
            {step === 'ADMIN_VERIFY' && 'Enter your institutional administrator passcode'}
            {step === 'STAFF_DENIED' && 'Your account is not registered in the Faculty Directory'}
          </p>

          {/* Account Indicator Badge */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/90">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">
                Signed in as: <strong className="text-white">{userEmail || userName}</strong>
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[11px] text-cyan-300 hover:text-white underline ml-2 shrink-0 cursor-pointer"
            >
              Switch Account
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* VIEW 1: SELECT PORTAL (ADMIN / STAFF) */}
          {step === 'SELECT_PORTAL' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Please choose the portal you wish to access with your Google account. Role authorization is verified after selection.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Option 1: ADMIN */}
                <button
                  id="select-admin-portal-button"
                  type="button"
                  onClick={handleSelectAdmin}
                  disabled={isCheckingStaff}
                  className="group relative p-5 rounded-2xl border-2 border-gray-200 dark:border-slate-800 hover:border-luna-primary-blue dark:hover:border-cyan-500 bg-white dark:bg-slate-900/60 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 text-left transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-cyan-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="font-extrabold text-base text-gray-900 dark:text-white flex items-center justify-between">
                    <span>ADMIN</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Master timetables, department scheduling, rules, faculty allocations & audit.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-cyan-300">
                    <span>Passcode required</span>
                  </div>
                </button>

                {/* Option 2: STAFF */}
                <button
                  id="select-staff-portal-button"
                  type="button"
                  onClick={handleSelectStaff}
                  disabled={isCheckingStaff}
                  className="group relative p-5 rounded-2xl border-2 border-gray-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-slate-900/60 hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 text-left transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    {isCheckingStaff ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="font-extrabold text-base text-gray-900 dark:text-white flex items-center justify-between">
                    <span>STAFF</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Teaching schedules, assigned subject hours, weekly workload & syllabus.
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span>Verified via staff roster</span>
                  </div>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out & return to login</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ADMIN VERIFICATION (ENTER SECRET CODE) */}
          {step === 'ADMIN_VERIFY' && (
            <form onSubmit={handleVerifyAdminCode} className="space-y-5">
              <div className="space-y-2">
                <label 
                  htmlFor="admin-secret-code-input"
                  className="block text-xs font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase"
                >
                  Enter Admin Secret Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-secret-code-input"
                    type={showSecretCode ? "text" : "password"}
                    autoFocus
                    placeholder="Enter admin secret passcode"
                    value={adminSecretCode}
                    onChange={(e) => {
                      setAdminSecretCode(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    className="w-full pl-10 pr-11 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    id="toggle-admin-secret-visibility-button"
                    type="button"
                    onClick={() => setShowSecretCode(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors focus:outline-none"
                    title={showSecretCode ? "Hide Admin Secret Code" : "View Admin Secret Code"}
                    aria-label={showSecretCode ? "Hide Admin Secret Code" : "View Admin Secret Code"}
                  >
                    {showSecretCode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {adminError && (
                  <div id="admin-secret-error-message" className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 pt-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                  The Admin Secret Code is configured securely by institutional IT. It is verified against the server without exposing secrets to client bundles.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="admin-verify-continue-button"
                  type="submit"
                  disabled={isVerifying || !adminSecretCode.trim()}
                  className="flex-1 px-5 py-3 bg-luna-dark-navy hover:bg-luna-deep-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Passcode...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Admin</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('SELECT_PORTAL');
                    setAdminError('');
                  }}
                  disabled={isVerifying}
                  className="px-4 py-3 border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: STAFF DENIED (NOT REGISTERED IN STAFF ROSTER) */}
          {step === 'STAFF_DENIED' && (
            <div className="space-y-5 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                    Access Denied — Your Google account is not registered as Staff.
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300/90 leading-relaxed">
                    The email <strong className="font-mono underline">{userEmail}</strong> is not present in the institutional Faculty Roster managed by the Administrator.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 space-y-2">
                <div className="font-bold text-gray-800 dark:text-gray-100">
                  How to resolve this:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-gray-500 dark:text-gray-400">
                  <li>Contact the Department Administrator or Timetable Coordinator.</li>
                  <li>Request that your email address (<span className="font-mono text-gray-700 dark:text-gray-300">{userEmail}</span>) be added to the Staff Directory.</li>
                  <li>Once added by the Admin, you can log in immediately with Google.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_PORTAL')}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Role Selection</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out / Switch Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionModal;
