import { useEffect, useState } from "react";
import { Sun, Moon, ChevronLeft, Building2 } from "lucide-react"; // Icon từ lucide-react (có thể đổi sang MUI)
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UserData {
  username?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
}

const SettingsDetail: React.FC = () => {

  // Quản lý ngôn ngữ (có thể mở rộng trong tương lai)
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [hasMounted, setHasMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Quản lý trạng thái theme (light/dark)
  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );

  // Khi theme thay đổi -> cập nhật class của <html> và lưu vào localStorage
  useEffect(() => {

    setHasMounted(true);
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, i18n]);

  // Lấy role của người dùng từ localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user: UserData = JSON.parse(userData);
        setUserRole(user.role || null);
      }
    } catch (err) {
      console.error("Error reading user role:", err);
    }
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const isAdmin = userRole === 'ROLE_ADMIN';

  if (!hasMounted) {
    return (
      <div className="flex gap-2">
        <button
          className={`text-sm font-bold p-2 rounded-md bg-blue-500 text-white`}
        >
          VI
        </button>
        <button
          className={`text-sm font-bold p-2 rounded-md bg-gray-200 text-gray-800`}
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center  bg-white dark:bg-gray-800 p-9" style={
      {
        borderRadius: '10px',
        minHeight: '100vh',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
      }
    }>
      <p className="absolute top-10 left-5 cursor-pointer w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300/80 flex items-center justify-center">
        <ChevronLeft onClick={() => window.history.back()} />
      </p>
      <h1 className="font-semibold sm:text-4xl text-2xl text-gray-900 dark:text-white border-b pb-2 w-full text-center">
        Cài đặt
      </h1>

      <div className="sm:w-3/4 w-full mt-5 space-y-6 p-4 border rounded-lg shadow-md">
        {/* Ngôn ngữ */}
        <div>
          <p className="sm:text-lg text-sm font-medium text-gray-700 dark:text-gray-200">Ngôn ngữ</p>
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="border-2 sm:text-lg text-sm border-gray-300 rounded-md w-full p-2 mt-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Chế độ */}
        <div>
          <p className="sm:text-lg text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Chế độ</p>
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-2 p-2 rounded-lg sm:text-lg text-sm transition ${theme === "light"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                }`}
              onClick={() => setTheme("light")}
            >
              <Sun className="sm:w-5 sm:h-5 w-4 h-4" />
              Light
            </button>

            <button
              className={`flex items-center gap-2 p-2 rounded-lg sm:text-lg text-sm transition ${theme === "dark"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                }`}
              onClick={() => setTheme("dark")}
            >
              <Moon className="sm:w-5 sm:h-5 w-4 h-4" />
              Dark
            </button>
          </div>
        </div>

        {/* Quản lý thông tin phòng khám - Chỉ hiển thị cho Admin */}
        {isAdmin && (
          <div className="border-t pt-6">
            <p className="sm:text-lg text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">Quản lý</p>
            <button
              onClick={() => navigate('/dental-info')}
              className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
            >
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">Quản Lý Thông Tin Phòng Khám</span>
            </button>
          </div>
        )}

        {/* Thông báo nếu không phải admin */}
        {!isAdmin && userRole && (
          <div className="border-t pt-6">
            <div className="p-4 rounded-lg border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <span className="text-lg">🔒</span>
                Bạn không có quyền truy cập vào chức năng quản lý phòng khám. Chỉ quản trị viên mới có thể truy cập.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsDetail;
