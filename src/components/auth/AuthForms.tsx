'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AuthAPI } from '../../services/auth';
import { UserObject } from '../../type/user';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Eye, EyeOff } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';

// Local type for login response data to avoid importing from services and keep types explicit
interface LoginData {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  username?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  cookies_set?: boolean | string;
  [key: string]: unknown;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserObject) => void;
}

const RegisterForm: React.FC<{ onSubmit: (captchaToken: string) => void, email: string, setEmail: (v: string) => void, userName: string, setUserName: (v: string) => void, password: string, setPassword: (v: string) => void }> = ({ onSubmit, email, setEmail, userName, setUserName, password, setPassword }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [showPassword, setShowPassword] = useState(false);

  // show password toggle handler
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      alert('Recaptcha not ready');
      return;
    }
    const token = await executeRecaptcha('register');
    onSubmit(token);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-purple-700">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />
      </div>
      <div>
        <label className="block text-purple-700">Username</label>
        <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />
      </div>
      <div className="relative">
        <label className="block text-purple-700">Password</label>
        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />
        <button type="button" onClick={toggleShowPassword} className="absolute top-8 right-3 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle password visibility">
          {
            showPassword ? (
              <EyeOff className="w-6 h-6" />
            ) : (
              <Eye className="w-6 h-6" />
            )
          }
        </button>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="w-full bg-purple-600 text-white font-semibold py-3 rounded-md transition duration-300 hover:bg-purple-700">Register</motion.button>
    </form>
  );
};

const ForgotPasswordForm: React.FC<{ onSubmit: (email: string) => void, email: string, setEmail: (v: string) => void, loading: boolean }> = ({ onSubmit, email, setEmail, loading }) => (
  <form onSubmit={e => { e.preventDefault(); onSubmit(email); }} className="space-y-4">
    <div>
      <label className="block text-purple-700">Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />
    </div>
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={loading} className="w-full bg-purple-600 text-white font-semibold py-3 rounded-md transition duration-300 hover:bg-purple-700">
      {loading ? 'Đang gửi...' : 'Gửi yêu cầu đặt lại mật khẩu'}
    </motion.button>
  </form>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // show password toggle handler
  const toggleShowPassword = () => setShowPassword(!showPassword);

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { usernameOrEmail: email, password };// Note: backend accepts either username or email
      const res = await AuthAPI.login(payload, { saveCookies: rememberMe });// Pass saveCookies to control refresh token storage
      if (res.success) {
        try { localStorage.setItem('rememberMe', String(rememberMe)); } catch {
          console.warn('Failed to save rememberMe to localStorage');
        }
        const data: LoginData | undefined = res.data as LoginData | undefined;
        if (data && data.access_token) {
          try { localStorage.setItem('accessToken', data.access_token as string); } catch {
            console.warn('Failed to save accessToken to localStorage');
          }
          if (data.refresh_token && data.cookies_set !== true && data.cookies_set !== 'true') {
            try { localStorage.setItem('refreshToken', data.refresh_token as string); } catch {
              console.warn('Failed to save refreshToken to localStorage');
            }
          }
          // Standardize user object format to match OAuth
          const userObj: UserObject = {
            username: (data.username as string) || email,
            email: (data.email as string) || email,
            role: (data.role as string) || 'USER',
            avatar_url: (data.avatar_url as string) || '/images/default-avatar.jpg',
          };
          try { localStorage.setItem('user', JSON.stringify(userObj)); } catch {
            console.warn('Failed to save user to localStorage');
          }
          console.log('Saved user to localStorage:', userObj); // Debug log
          onSuccess?.(userObj);
          onClose();
          toast.success('Đăng nhập thành công! Đang chuẩn bị tài nguyên cho bạn...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          try {
            const who = await AuthAPI.whoami();
            if (who.success) {
              // Standardize user object format to match OAuth
              const userObj: UserObject = {
                username: who.data.username || who.data.name || email,
                email: who.data.email || email,
                role: who.data.role || 'USER',
                avatar_url: who.data.avatar_url || who.data.avatarUrl || '/images/default-avatar.jpg',
              };
              try { localStorage.setItem('user', JSON.stringify(userObj)); } catch {
                console.warn('Failed to save user to localStorage');
              }
              onSuccess?.(userObj);
            } else {
              const fallback: UserObject = {
                username: email,
                email: email,
                role: 'USER',
                avatar_url: '/images/default-avatar.jpg'
              };
              try { localStorage.setItem('user', JSON.stringify(fallback)); } catch {
                console.warn('Failed to save fallback user to localStorage');
              }
              onSuccess?.(fallback);
              toast.error('Failed to fetch user info after login.');
            }
          } catch {
            const fallback: UserObject = {
              username: email,
              email: email,
              role: 'USER',
              avatar_url: '/images/default-avatar.jpg'
            };
            try { localStorage.setItem('user', JSON.stringify(fallback)); } catch {
              console.warn('Failed to save fallback user to localStorage');
            }
            onSuccess?.(fallback);
          }
        }
      } else {
        toast.error((res && res.message) ? res.message : 'Login failed (see console)');
      }
    } catch (err) {
      const unknownErr: unknown = err;
      console.log(unknownErr);
      // let serverMsg: string | undefined;
      // if (typeof unknownErr === 'object' && unknownErr !== null) {
      //   const e = unknownErr as { response?: { data?: { message?: string } }; message?: string };
      //   serverMsg = e.response?.data?.message || e.message;
      // } else if (typeof unknownErr === 'string') {
      //   serverMsg = unknownErr;
      // }
      toast.error( 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.' );
    }
  };

  // Register handler
  const handleRegisterSubmit = async (captchaToken: string) => {
    try {
      const payload = { username: userName, email, password, captchaToken };
      const res = await AuthAPI.register(payload);
      if (res.success) {
        toast.success('Đăng ký thành công. Vui lòng xác thực email của bạn.');
        setIsRegistering(false);
      } else {
        toast.error('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (err) {
      const unknownErr: unknown = err;
      let serverMsg: string | undefined;
      if (typeof unknownErr === 'object' && unknownErr !== null) {
        const e = unknownErr as { response?: { data?: { message?: string } }; message?: string };
        serverMsg = e.response?.data?.message || e.message;
      } else if (typeof unknownErr === 'string') {
        serverMsg = unknownErr;
      }
      alert(serverMsg || 'Register error');
    }
  };


  // Forgot password handler
  const handleForgotPasswordSubmit = async (email: string) => {
    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');
    try {
      const res = await AuthAPI.forgotPassword({ email });
      if (res.success) {
        setForgotPasswordMessage('Vui lòng kiểm tra email để xác thực và lập mật khẩu mới.');
      } else {
        setForgotPasswordMessage(res.message || 'Gửi yêu cầu thất bại.');
      }
    } catch {
      setForgotPasswordMessage('Gửi yêu cầu thất bại.');
    }
    setForgotPasswordLoading(false);
  };

  // Google OAuth handler
  const handleGoogleLogin = async () => {
    try {
      try { localStorage.setItem('rememberMe', String(rememberMe)); } catch {
        console.warn('Failed to save rememberMe to localStorage');
      }
      window.location.href = await AuthAPI.oauth2GoogleUrl();
    } catch {
      alert('Unable to start Google sign-in.');
    }
  };

  // Framer Motion variants for animations
  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const modalVariants = {
    hidden: { y: '-100vh', opacity: 0 },
    visible: { y: '0', opacity: 1, transition: { duration: 0.5, damping: 25, stiffness: 500 } },
    exit: { y: '100vh', opacity: 0 },
  };

  // Render the modal if it's open
  if (!isOpen) return null;
  return (
    <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_NEXT_PUBLIC_RECAPTCHA_SITE_KE || ''}>
      <ToastContainer />
      <motion.div className="absolute w-full h-screen top-0 left-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-3xl" variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose}>
        <motion.div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-xl mx-4 md:mx-0 relative" variants={modalVariants} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Render the form based on the current state */}
          <AnimatePresence mode="wait">
            {isForgotPassword ? (
              <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <img hidden src="/LOGO/Logo_Horizontal_Light_1-1024x237.png.webp" alt="Logo" width={200} height={100} className="mb-8 mx-auto" />
                <ForgotPasswordForm onSubmit={handleForgotPasswordSubmit} email={email} setEmail={setEmail} loading={forgotPasswordLoading} />
                {forgotPasswordMessage && <div className="mt-4 text-green-600 text-center font-semibold">{forgotPasswordMessage}</div>}
                <button onClick={() => { setIsForgotPassword(false); setForgotPasswordMessage(''); }} className="w-full mt-4 text-center text-purple-600 font-medium hover:underline">Quay lại đăng nhập</button>
              </motion.div>
            ) : isRegistering ? (
              <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <img hidden src="/LOGO/Logo_Horizontal_Light_1-1024x237.png.webp" alt="Logo" width={200} height={100} className="mb-8 mx-auto" />
                <RegisterForm onSubmit={handleRegisterSubmit} email={email} setEmail={setEmail} userName={userName} setUserName={setUserName} password={password} setPassword={setPassword} />
                <button onClick={() => setIsRegistering(false)} className="w-full mt-4 text-center text-purple-600 font-medium hover:underline">Bạn đã có tài khoản? Đăng nhập ngay</button>
              </motion.div>
            ) : (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <img hidden src="/LOGO/Logo_Horizontal_Light_1-1024x237.png.webp" alt="Logo" width={200} height={100} className="mb-4 mx-auto" />
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-purple-700">Email</label>
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />
                  </div>
                  <div className="relative">
                    <label className="block text-purple-700">Mật khẩu</label>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-3 border-b-2 border-b-yellow-600 border-gray-300 focus:outline-none" required />

                    <button type="button" onClick={toggleShowPassword} className="absolute top-8 right-3 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle password visibility">
                      {
                        showPassword ? (
                          <EyeOff className="w-6 h-6" />
                        ) : (
                          <Eye className="w-6 h-6" />
                        )
                      }
                    </button>

                  </div>


                  <div className="flex items-center gap-2">
                    <input id="remember" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <label htmlFor="remember" className="text-sm text-gray-600">{t('remember')}</label>
                  </div>


                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="w-full bg-gradient-to-bl from-purple-500 hover:from-yellow-600 hover:to-purple-600 to-yellow-600 text-white font-semibold py-3 rounded-md transition duration-300 hover:bg-blue-700">{t('login')}</motion.button>

                  <motion.button type="button" onClick={handleGoogleLogin} aria-label="Sign in with Google" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full mt-2 border border-gray-300 flex items-center justify-center gap-3 py-2 rounded-md bg-white text-gray-800">
                    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="inline-block">
                      <path fill="#EA4335" d="M24 9.5c3.9 0 7.3 1.4 10 3.9l7.4-7.4C36.1 2.7 30.4 0 24 0 14 0 5.3 5.7 1.6 14.1l8.9 6.9C12.5 15 17.8 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3.5-2.4 6.4-5 8.4l8 6.2C43.7 38 46.5 31.7 46.5 24.5z" />
                      <path fill="#FBBC05" d="M10.5 28.9c-.6-1.8-.6-3.6 0-5.4L1.6 16.6C.6 18.8 0 21.3 0 24c0 2.7.6 5.2 1.6 7.4l8.9-6.5z" />
                      <path fill="#34A853" d="M24 48c6.5 0 12.2-2.1 16.3-5.7l-8-6.3c-2.3 1.5-5.2 2.4-8.3 2.4-6.2 0-11.5-4.5-12.9-10.5L1.6 31.1C5.3 39.5 14 45.2 24 45.2z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </motion.button>
                </form>
                <button onClick={() => setIsRegistering(true)} className="w-full mt-4 text-center text-blue-600 font-medium hover:underline">Bạn chưa có tài khoản? Đăng ký ngay</button>
                <button onClick={() => setIsForgotPassword(true)} className="w-full mt-2 text-center text-purple-600 font-medium hover:underline">Quên mật khẩu?</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </GoogleReCaptchaProvider>
  );
};

export default AuthModal;
