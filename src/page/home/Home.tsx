
import React, { useEffect, useState } from 'react';
import MenuDrawer from '../../components/menu/MenuDrawer';
import Bar from '../../components/taskbar/Bar';


const Home: React.FC = () => {

  const [canShowMenu, setCanShowMenu] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown as { role?: string; username?: string };
      const role = parsed?.role;
      if (role === 'ROLE_ADMIN' || role === 'ROLE_DENTIST' || role === 'ROLE_RECEPTIONIST' || role === 'ROLE_MANAGER' || role === 'ROLE_ACCOUNTANT' || role === 'ROLE_HR') setCanShowMenu(true);
      else setCanShowMenu(false);
    } catch {
      // invalid JSON or other error - hide the menu
      setCanShowMenu(false);
    }
  }, []);

  return (
    <div className="relative flex flex-col h-screen">
      {/* Taskbar */}
      <div className="flex-shrink-0">
        <Bar />
      </div>

      {/* Main content area */}
      <div className="flex overflow-hidden">
        {/* Menu Drawer: only visible to admin or dentist roles */}
        <MenuDrawer />
      </div>
      {
        canShowMenu ? <div hidden></div> :
          <div className="absolute top-24 w-full h-[calc(100vh-98px)] flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-lg z-20">
            <img src="/planet.png" alt="planet" className='w-40 h-40' />
            <p className="text-2xl font-bold text-gray-800 mt-3">Xin chào, vui lòng đăng nhập</p>
          </div>

      }
    </div>
  );
};

export default Home;
