import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, ShieldCheck, UserCheck, Shield, AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { login, resetPassword, setupAccount, loginWithGoogle, setupAccountWithGoogle, verifyAdminSecretCodeOnServer } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { CollegeLogo } from '@/components/common/CollegeLogo';
import { RoleSelectionModal } from '@/components/auth/RoleSelectionModal';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isStaff, loading, setAuthProfile, user, profile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [setupRole, setSetupRole] = useState<'admin' | 'staff'>('admin');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset' | 'setup'>('login');
  
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (isAdmin) navigate('/admin/dashboard', { replace: true });
        else if (isStaff) navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isAdmin, isStaff, loading, navigate]);

  const isNewOrUnrecognizedGoogleUser = !!user && !isAuthenticated && (profile?.role === 'unrecognized' || profile?.role === 'unauthorized');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'reset') {
      handleResetPassword();
      return;
    }
    
    if (mode === 'setup') {
      handleSetup();
      return;
    }
    
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    
    try {
      const res = await login(email.trim(), password);
      if (res?.profile) {
        setAuthProfile(res.profile);
      }
      toast.success('Welcome back!');
    } catch (error: any) {
      const code = error?.code || '';
      const message = error?.message || '';

      if (
        code === 'auth/invalid-credential' || 
        code === 'auth/user-not-found' || 
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-login-credentials'
      ) {
        setErrorMsg('Invalid email or password. Please check your credentials and try again.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else if (code === 'auth/user-disabled') {
        setErrorMsg('Your account has been disabled. Please contact the administrator.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Too many failed attempts. Please try again in a few moments.');
      } else {
        setErrorMsg(message || 'Sign in failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setUnauthorizedDomain(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google. Verifying authorization...');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User closed popup
      } else if (code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        const currentDomain = error?.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(currentDomain);
        setErrorMsg(`Domain "${currentDomain}" is not authorized in Firebase Authentication.`);
      } else {
        console.error('Google login error:', error);
        setErrorMsg(error?.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handleSetup = async () => {
    if (!email || !password || !name) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    
    if (setupRole === 'admin') {
      if (!adminPasscode.trim()) {
        setErrorMsg('Please enter the admin authorization passcode.');
        return;
      }
      setIsLoading(true);
      setErrorMsg('');
      const verifyRes = await verifyAdminSecretCodeOnServer(adminPasscode.trim());
      if (!verifyRes.success) {
        setIsLoading(false);
        setErrorMsg('Invalid admin authorization passcode.');
        return;
      }
    } else {
      setIsLoading(true);
      setErrorMsg('');
    }
    
    try {
      const res = await setupAccount(email.trim(), password, name.trim(), setupRole);
      if (res?.profile) {
        setAuthProfile(res.profile);
      }
      toast.success(`${setupRole === 'admin' ? 'Admin' : 'Staff'} account created successfully!`);
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email address already exists. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setErrorMsg('Please enter a valid email address.');
      } else {
        setErrorMsg(error?.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address to reset password.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      await resetPassword(email);
      toast.success('If the account exists, password reset instructions have been sent to the email address.');
      setMode('login');
    } catch (error: any) {
      toast.success('If the account exists, password reset instructions have been sent to the email address.');
      setMode('login');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-950">
      {/* Left Panel - Branding with College Emblem Background */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-luna-dark-navy via-[#022852] to-luna-deep-blue p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#A7EBF2 1px, transparent 1px), linear-gradient(90deg, #A7EBF2 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        {/* Large Prominent College Emblem Watermark as Background */}
        <div className="absolute -right-16 -bottom-16 opacity-15 pointer-events-none transform rotate-6 scale-125 select-none">
          <CollegeLogo size={480} variant="white" />
        </div>

        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-luna-cyan/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center space-x-3.5 text-white">
          <div className="p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            <CollegeLogo size={46} variant="full" />
          </div>
          <div>
            <div className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
              NCE Timecraft
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                Official ERP
              </span>
            </div>
            <div className="text-xs text-luna-light-cyan/80 font-medium">
              Nellai College of Engineering • Anna University
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-cyan-200 font-semibold mb-6 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Autonomous AI-Assisted Timetable Engine</span>
          </div>

          <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">
            Crafting smarter timetables, automatically.
          </h2>
          <p className="text-luna-light-cyan text-base leading-relaxed opacity-95">
            Sign in to manage faculty teaching allocations, continuous practical lab schedules, Naan Muthalvan reservations, and download Anna University-compliant semester master timetables.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xs text-cyan-300 font-bold mb-1">🏛️ Department Level</div>
              <div className="text-[11px] text-gray-300">Synchronized CSE, ECE, MECH, AI&DS and IT curricula.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-xs text-cyan-300 font-bold mb-1">⚡ Instant Export</div>
              <div className="text-[11px] text-gray-300">High-resolution print PNG & institutional PDF generation.</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-luna-light-cyan/70 font-medium">
          Nellai College of Engineering, Maruthakulam, Tirunelveli - 627 151
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white dark:bg-slate-950 relative overflow-hidden">
        {/* Subtle Background Watermark on Login Form Side */}
        <div className="absolute right-4 bottom-4 opacity-[0.03] dark:opacity-[0.06] pointer-events-none select-none">
          <CollegeLogo size={320} variant="monochrome" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-7 relative z-10"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center space-x-3 mb-6">
            <CollegeLogo size={42} variant="full" />
            <div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 dark:text-white block">
                NCE Timecraft
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                Nellai College of Engineering
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              {mode === 'reset' ? 'Reset Password' : mode === 'setup' ? 'First-Time Setup' : 'Sign in to Portal'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'reset' 
                ? 'Enter your email address and we will send you a reset link.' 
                : mode === 'setup'
                ? 'Create your initial system administrator or staff account.'
                : 'Enter your institutional credentials or use 1-click Quick Access.'}
            </p>
          </div>
          
          {unauthorizedDomain && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Domain Authorization Notice</span>
              </div>
              <p className="leading-relaxed">
                This app is running on <strong className="font-mono">{unauthorizedDomain}</strong>. Firebase Authentication requires this domain to be added to Authorized Domains in Firebase Console.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(unauthorizedDomain);
                    setCopiedDomain(true);
                    toast.success('Domain copied to clipboard!');
                    setTimeout(() => setCopiedDomain(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied!' : `Copy: ${unauthorizedDomain}`}</span>
                </button>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Quick Fix: Open Firebase Console → Authentication → Settings → Authorized domains → Add domain, paste this domain and save.
              </p>
            </div>
          )}

          {errorMsg && !unauthorizedDomain && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {mode === 'setup' && (
                <>
                  <div className="flex space-x-4 mb-3">
                    <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="radio" value="staff" checked={setupRole === 'staff'} onChange={() => setSetupRole('staff')} className="text-luna-primary-blue focus:ring-luna-primary-blue" />
                      <span className="text-sm font-medium">Staff Member</span>
                    </label>
                    <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input type="radio" value="admin" checked={setupRole === 'admin'} onChange={() => setSetupRole('admin')} className="text-luna-primary-blue focus:ring-luna-primary-blue" />
                      <span className="text-sm font-medium">Administrator</span>
                    </label>
                  </div>
                  {setupRole === 'admin' && (
                    <div className="flex flex-col space-y-1.5 w-full">
                      <label className="text-sm font-medium text-luna-dark-navy dark:text-slate-200">
                        Admin Authorization Passcode
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminPasscode ? 'text' : 'password'}
                          placeholder="Enter admin authorization passcode"
                          required
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-10 py-2 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue focus:border-transparent transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                          title={showAdminPasscode ? 'Hide Passcode' : 'View Passcode'}
                        >
                          {showAdminPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="e.g. Dr. K. Senthil"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="admin@nce.edu or faculty@nce.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode !== 'reset' && (
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-sm font-medium text-luna-dark-navy dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3 pr-10 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-luna-primary-blue focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      title={showPassword ? 'Hide Password' : 'View Password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300 text-luna-primary-blue focus:ring-luna-primary-blue"
                  />
                  <span className="ml-2 text-xs font-medium">Remember me</span>
                </label>

                <button 
                  type="button" 
                  onClick={() => {
                    setMode('reset');
                    setErrorMsg('');
                  }}
                  className="text-xs font-semibold text-luna-primary-blue dark:text-cyan-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full bg-[#002B7F] hover:bg-[#001D56] text-white font-bold h-11 rounded-xl shadow-md" size="lg" isLoading={isLoading}>
              {mode === 'reset' ? 'Send Reset Link' : mode === 'setup' ? 'Create Account' : isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            {mode !== 'reset' && (
              <>
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-950 px-2 text-gray-400 font-semibold tracking-wider">
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isGoogleLoading ? 'Connecting...' : mode === 'setup' ? 'Sign up with Google' : 'Sign in with Google'}</span>
                </button>
              </>
            )}
            
            {mode !== 'login' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-luna-primary-blue dark:hover:text-cyan-400 transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
            
            {mode === 'login' && (
              <div className="text-center pt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Need a new faculty or admin login? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('setup');
                    setErrorMsg('');
                  }}
                  className="text-xs font-bold text-luna-primary-blue dark:text-cyan-400 hover:underline"
                >
                  Sign up
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>

      {/* Role Selection & Authorization Modal for New/Unrecognized Google Accounts */}
      <RoleSelectionModal isOpen={isNewOrUnrecognizedGoogleUser} />
    </div>
  );
}

