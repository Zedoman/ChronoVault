import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Fingerprint, Shield, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  current: boolean;
};

const NavItem = ({ to, icon, label, current }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
      current ? "bg-neo-accent/20 text-neo-accent" : "text-white/70 hover:bg-neo-accent/10 hover:text-white"
    )}
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="font-mono text-sm">{label}</span>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [account, setAccount] = useState<string>('');
  const [referencePicture, setReferencePicture] = useState<string | null>(null);

  useEffect(() => {
    const getAccount = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error('Error fetching account:', error);
        }
      }
    };

    getAccount();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
          setReferencePicture(null);
        }
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Fetch reference picture when account changes
  useEffect(() => {
    const fetchReferencePicture = async () => {
      if (!account) {
        setReferencePicture(null);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/liveness/${account}`);
        setReferencePicture(response.data.referencePicture);
      } catch (error) {
        console.error('Error fetching reference picture:', error);
        setReferencePicture(null);
      }
    };

    fetchReferencePicture();
  }, [account]);

  const handleLogout = async () => {
    if (window.ethereum) {
      try {
        localStorage.clear();
        window.location.href = 'http://localhost:5173/';
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex min-h-screen bg-neo-dark text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-4 flex flex-col">
        <div className="mb-8 flex items-center px-2">
          <Shield className="h-6 w-6 text-neo-accent mr-2" />
          <h1 className="font-mono font-bold text-lg">CHRONO<span className="text-neo-accent">VAULT</span></h1>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem
            to="/liveness-check"
            icon={<Fingerprint className="text-current" />}
            label="LIVENESS CHECK"
            current={location.pathname === "/liveness-check"}
          />
          <NavItem
            to="/inheritance"
            icon={<User className="text-current" />}
            label="INHERITANCE"
            current={location.pathname === "/inheritance"}
          />
          <NavItem
            to="/activity"
            icon={<Clock className="text-current" />}
            label="ACTIVITY"
            current={location.pathname === "/activity"}
          />
          <NavItem
            to="/emergency"
            icon={<Shield className="text-current" />}
            label="EMERGENCY ACCESS"
            current={location.pathname === "/emergency"}
          />
        </nav>

        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-full bg-neo-accent/20 flex items-center justify-center">
              {referencePicture ? (
                <img
                  src={referencePicture}
                  alt="User Reference"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-neo-accent" />
              )}
            </div>
            <div>
              <p className="text-xs font-mono">Connected as</p>
              <p className="text-sm font-mono text-neo-accent truncate">
                {account ? formatAddress(account) : 'Not Connected'}
              </p>
            </div>
            {account && (
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs font-mono text-white/70 hover:text-neo-accent transition-colors duration-200"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default Layout;