import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  ArrowRight,
  Shield,
  GraduationCap
} from 'lucide-react';
import { CollegeLogo } from '@/components/common/CollegeLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-luna-dark-navy dark:text-slate-100 overflow-hidden relative selection:bg-luna-cyan selection:text-white flex flex-col justify-between">
      {/* Dynamic Animated Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Glowing Aurora Orb 1 - Deep Blue */}
        <motion.div
          animate={{
            x: ['-20%', '20%', '-10%'],
            y: ['-10%', '30%', '10%'],
            scale: [1, 1.25, 0.95],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-blue-500/20 via-luna-cyan/25 to-transparent blur-[120px]"
        />

        {/* Glowing Aurora Orb 2 - Cyan & Sky */}
        <motion.div
          animate={{
            x: ['20%', '-20%', '15%'],
            y: ['20%', '-15%', '30%'],
            scale: [1.1, 0.9, 1.2],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="absolute top-[30%] -right-[15%] w-[650px] h-[650px] rounded-full bg-gradient-to-tl from-cyan-400/20 via-luna-primary-blue/20 to-transparent blur-[130px]"
        />

        {/* Ambient Subtle Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(#26658C 1.5px, transparent 1.5px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CollegeLogo size={44} variant="full" />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-luna-dark-navy dark:text-white flex items-center gap-1.5">
                NCE Timecraft
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-cyan-300 font-bold">
                  v3.0
                </span>
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium hidden sm:inline-block">
                Nellai College of Engineering • Timetable ERP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link to="/login">
              <Button className="bg-luna-dark-navy hover:bg-luna-deep-blue text-white shadow-md shadow-luna-dark-navy/15 flex items-center gap-1.5 text-sm font-bold">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Sign In / Enter Portal</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-6 max-w-5xl mx-auto flex flex-col items-center text-center my-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-cyan-500/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-luna-primary-blue dark:text-cyan-300 mb-6 shadow-xs backdrop-blur-xs"
        >
          <span className="relative flex h-2.5 w-2.5 mr-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          Next-Gen Academic Timetable Automation System
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-4xl space-y-6"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-luna-dark-navy dark:text-white leading-[1.1]">
            Crafting smarter timetables,{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-luna-primary-blue to-cyan-500 dark:from-cyan-400 dark:via-blue-400 dark:to-cyan-200">
                automatically.
              </span>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full origin-left opacity-80"
              />
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Automated conflict-free scheduling engine compliant with Anna University regulations. Optimized for faculty workload, lab continuous blocks, and official HD exports.
          </p>

          {/* Quick Access Roles */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base font-bold bg-gradient-to-r from-luna-dark-navy via-luna-deep-blue to-luna-primary-blue hover:opacity-95 text-white shadow-xl shadow-luna-dark-navy/20 px-8 py-4 h-auto rounded-xl flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-cyan-300" />
                <span>Admin & Staff Portal</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-gray-100 dark:border-slate-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Nellai College of Engineering. All rights reserved.</p>
      </footer>
    </div>
  );
}
