import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Gauge,
  FileStack,
  Map,
  Settings,
  Bug,
} from 'lucide-react';
import { useEffect } from 'react';

const navItems = [
  { to: '/', label: '总览', icon: BarChart3 },
  { to: '/errors', label: '错误明细', icon: Bug },
  { to: '/issues', label: 'Issue 聚合', icon: AlertTriangle },
  { to: '/tracks', label: '埋点分析', icon: Activity },
  { to: '/vitals', label: '性能指标', icon: Gauge },
  { to: '/sourcemaps', label: 'SourceMap', icon: Map },
  { to: '/settings', label: '项目与密钥', icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <FileStack size={22} />
          <div>
            <strong>frontend-monitor</strong>
            <span>稳定性监控平台</span>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">Web · uni-app · Node</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
