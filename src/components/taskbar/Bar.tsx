import { AuthAPI, clearAuthTokens } from "@/services/auth";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import AuthModal from "../auth/AuthForms";
import { motion, AnimatePresence } from "framer-motion";
import { CircleUser, LogOut, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DentalInfoAPI from "@/services/dentalinfo";
// import LanguageSwitcher from "../languageSwitcher/LanguageSwitcher";

interface User {
  name: string;
  avatarUrl: string;
}

const Bar: React.FC = () => {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [clinicName, setClinicName] = useState<string>('Nha Khoa');
  const profileDropdownTimerRef = useRef<number | null>(null);
  const { t } = useTranslation();
  const router = useNavigate();


  // Lấy dữ liệu người dùng từ localStorage khi component được mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(
          {
            name: userData.username || userData.name || "User",
            avatarUrl: userData.avatar_url || userData.avatarUrl || '/images/default-avatar.jpg'
          }
        )
        setRole(userData.role || null);
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error("Error parsing user data from localStorage:", err);
      toast.error("Dữ liệu người dùng không hợp lệ.",
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        }
      );
    }
  }, [])

  // Lắng nghe sự kiện thay đổi localStorage để cập nhật trạng thái đăng nhập
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'user') {
        try {
          const stored = e.newValue;
          if (stored) {
            const userData = JSON.parse(stored);
            setUser(
              {
                name: userData.username || userData.name || "User",
                avatarUrl: userData.avatar_url || userData.avatarUrl || '/images/default-avatar.jpg'
              }
            )
            setRole(userData.role || null);
            setIsLoggedIn(true);
          } else {
            setUser(null);
            setRole(null);
            setIsLoggedIn(false);
          }
        } catch (err) {
          console.error("Error parsing user data from localStorage:", err);
        }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    }
  }, [])

  // Lấy tên phòng khám từ API
  useEffect(() => {
    const fetchClinicName = async () => {
      try {
        const response = await DentalInfoAPI.getAll();
        if (response.success && response.data && response.data.length > 0) {
          // Lấy tên của phòng khám đầu tiên hoặc phòng khám hoạt động
          const activeClinic = response.data.find(clinic => clinic.active) || response.data[0];
          if (activeClinic && activeClinic.name) {
            setClinicName(activeClinic.name);
          }
        }
      } catch (err) {
        console.error("Error fetching clinic name:", err);
      }
    };
    
    fetchClinicName();
  }, [])


  const handleAuthSuccess = (userObj: { username?: string; email?: string; role?: string; avatar_url?: string;[k: string]: unknown }) => {
    // Use the standardized format directly from AuthForms, don't convert to legacy format
    const standardizedUser = {
      username: userObj.username || '',
      email: userObj.email || '',
      role: userObj.role || 'USER',
      avatar_url: userObj.avatar_url || '/images/default-avatar.jpg'
    };

    // Update local state for Menu display
    setUser({
      name: standardizedUser.username,
      avatarUrl: standardizedUser.avatar_url
    });
    setRole(standardizedUser.role || null);
    setIsLoggedIn(true);
    try { localStorage.setItem('user', JSON.stringify(userObj)); } catch {
      toast.error("Lỗi lưu dữ liệu người dùng.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
    setShowAuthModal(false);
  };


  const handleLogout = async () => {
    setIsLoggedIn(false);
    setUser(null);
    setRole(null);
    // reload the page to reset state
    try { await AuthAPI.clearCookies(); } catch {
      // Ignore errors during cookie clearing
    }
    try {
      // Optionally call backend to invalidate session
      const refreshToken = localStorage.getItem('refreshToken') || '';
      if (refreshToken) {
        try { await AuthAPI.logout({ refreshToken }); } catch {
          // Ignore errors during logout
        }
      }
      // Call backend to clear cookies
    } catch {
      toast.error(t('logoutFailed'), {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
    clearAuthTokens();
    window.location.reload();
    localStorage.removeItem('currentPage');
  };

  const handleMouseEnterProfile = () => {
    if (profileDropdownTimerRef.current) {
      window.clearTimeout(profileDropdownTimerRef.current);
      profileDropdownTimerRef.current = null;
    }
    setShowProfileDropdown(true);
  };

  const handleMouseLeaveProfile = () => {
    profileDropdownTimerRef.current = window.setTimeout(() => setShowProfileDropdown(false), 200) as unknown as number;
  };


  return (
    <div className="flex md:flex-row  justify-between items-center  bg-white dark:bg-gray-800  text-gray-900 dark:text-white p-2" style={{
      borderBottom: '1px solid #e5e7eb',
    }}>

      <div className="flex items-center justify-between sm:px-4 py-2 gap-3">
        <img src="/tooth.png" alt="Tooth" className='md:w-[30px] md:h-[30px] w-8 h-8' />
        <p className='h-[50px] w-[2px] bg-black'></p>
        <h1 className={`md:text-2xl text-lg bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-purple-500 font-bold`}><span className='md:text-[16px] text-sm'>Nha Khoa</span> <br />{clinicName} 🍃</h1>
      </div>

      <div className="flex md:flex-row flex-col items-center gap-4">
        {isLoggedIn ? (
          <div className="relative" onMouseEnter={handleMouseEnterProfile} onMouseLeave={handleMouseLeaveProfile}>
            <button className="flex items-center gap-2 cursor-pointer">
              <img src={user?.avatarUrl || '/images/default-avatar.jpg'} alt="User Avatar" className="rounded-full border-2 border-purple-500 w-12 h-12" />
            </button>
            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  className="absolute top-full md:right-0 right-0 mt-2 bg-white shadow-lg rounded-md p-2 w-60 z-50 flex flex-col items-start"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="w-full py-2 px-4 text-sm font-semibold text-gray-800">
                    {user?.name || "User"}
                  </div>
                  <div className="w-full  bg-gray-200 my-1" />
                  <button onClick={() => { router('/profile'); setShowProfileDropdown(false); }} className="w-full flex items-center text-left text-sm text-gray-600 py-2 px-4 hover:bg-gray-100 rounded-md transition-colors duration-200">
                    <CircleUser className="mr-2 text-gray-400" /> {t('profile') || 'Profile'}
                  </button>
                  <div className="w-full h-px bg-gray-200 my-1" />
                  <button onClick={() => { router('/settings'); setShowProfileDropdown(false); }} className="w-full flex items-center text-left text-sm text-gray-600 py-2 px-4 hover:bg-gray-100 rounded-md transition-colors duration-200">
                    <Settings2 className="mr-2 text-gray-400" /> {t('settings') || 'Settings'}
                  </button>
                  <div className="w-full h-px bg-gray-200 my-1" />
                  {role === 'DENTIST' && (
                    <button onClick={() => { router('/pages/dentist/appointments'); setShowProfileDropdown(false); }} className="w-full flex items-center text-left text-sm text-gray-600 py-2 px-4 hover:bg-gray-100 rounded-md transition-colors duration-200">
                      {/* simple icon could be added here */}
                      {t('my_appointments') || 'My Appointments'}
                    </button>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center text-left text-sm text-gray-600 py-2 px-4 hover:bg-gray-100 rounded-md transition-colors duration-200">
                    <LogOut className="mr-2 text-gray-400" /> {t('logout') || 'Logout'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button onClick={() => setShowAuthModal(true)} whileTap={{ scale: 0.95 }}
            className="md:text-lg font-bold text-white py-2 px-4 rounded-2xl text-sm bg-blue-600 hover:bg-blue-700 transition-colors duration-300">
            {t('login')}
          </motion.button>
        )}

        {/* <LanguageSwitcher /> */}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>

  );
};

export default Bar;
