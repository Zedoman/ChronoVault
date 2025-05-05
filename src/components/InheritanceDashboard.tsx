import { useState, useEffect } from 'react';
import { Clock, User, CircleCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import axios from 'axios';
import BlockchainService from '@/services/BlockchainService';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Inactivity threshold in milliseconds (90 days)
const INACTIVITY_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000;

type Heir = {
  address: string;
  share: string;
  approved: boolean;
};

type Riddle = {
  id: string;
  question: string;
  answer?: string;
};

const InheritanceDashboard = () => {
  const { toast } = useToast();
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAddingRiddle, setIsAddingRiddle] = useState(false);
  const [newRiddleQuestion, setNewRiddleQuestion] = useState("");
  const [newRiddleAnswer, setNewRiddleAnswer] = useState("");
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    progress: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    progress: 0,
  });

  // Calculate remaining time and progress
  const calculateCountdown = (lastActivityTimestamp: number) => {
    const now = Date.now();
    const elapsedMs = now - lastActivityTimestamp;
    const remainingMs = Math.max(0, INACTIVITY_THRESHOLD_MS - elapsedMs);

    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const progress = Math.min(100, (elapsedMs / INACTIVITY_THRESHOLD_MS) * 100);

    return { days, hours, minutes, progress };
  };

  // Format last activity as "X days ago"
  const formatLastActivity = (timestamp: number) => {
    const now = Date.now();
    const elapsedMs = now - timestamp;
    const daysAgo = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return "Today";
    return `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
  };

  // Initialize last activity and countdown
  useEffect(() => {
    const initializeCountdown = async () => {
      // Fetch last activity from local storage (simulated)
      const storedLastActivity = localStorage.getItem('lastActivity');
      const lastActivityTimestamp = storedLastActivity ? parseInt(storedLastActivity) : Date.now();
      setLastActivity(lastActivityTimestamp);

      // Initial countdown calculation
      const countdown = calculateCountdown(lastActivityTimestamp);
      setTimeRemaining(countdown);

      // Update countdown every minute
      const interval = setInterval(() => {
        const updatedCountdown = calculateCountdown(lastActivityTimestamp);
        setTimeRemaining(updatedCountdown);
      }, 60 * 1000); // Update every minute

      return () => clearInterval(interval);
    };

    const fetchHeirsAndRiddle = async () => {
      setLoading(true);
      try {
        const address = await BlockchainService.connectWallet();
        // Fetch heirs
        const heirResponse = await axios.get(`${API_BASE_URL}/api/heirs/${address}`);
        setHeirs(heirResponse.data);
        // Fetch riddle
        const riddleResponse = await axios.get(`${API_BASE_URL}/api/riddle/${address}`);
        setRiddle(riddleResponse.data);
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: error.response?.data?.error || "Could not fetch dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeCountdown();
    fetchHeirsAndRiddle();
  }, [toast]);

  const addHeir = async () => {
    try {
      const address = await BlockchainService.connectWallet();
      const heirAddress = prompt("Enter heir address:");
      const shareInput = prompt("Enter share percentage (1-100):");
      const share = shareInput ? parseInt(shareInput) : null;

      if (!heirAddress || !share || share <= 0 || share > 100 || isNaN(share)) {
        throw new Error("Invalid heir address or share percentage");
      }

      const response = await axios.post(`${API_BASE_URL}/api/heirs/${address}`, {
        heirAddress,
        share,
      });

      if (!response.data.success) {
        throw new Error("Failed to add heir");
      }

      const heirResponse = await axios.get(`${API_BASE_URL}/api/heirs/${address}`);
      setHeirs(heirResponse.data);
      toast({
        title: "Heir added",
        description: "New heir has been added successfully",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Could not add heir",
        variant: "destructive",
      });
    }
  };

  const approveHeir = async (heirAddress: string) => {
    try {
      const address = await BlockchainService.connectWallet();
      const response = await axios.post(`${API_BASE_URL}/api/heirs/approve/${address}`, {
        heirAddress,
      });

      if (!response.data.success) {
        throw new Error("Failed to approve heir");
      }

      const heirResponse = await axios.get(`${API_BASE_URL}/api/heirs/${address}`);
      setHeirs(heirResponse.data);
      toast({
        title: "Heir approved",
        description: `Heir ${heirAddress.slice(0, 6)}...${heirAddress.slice(-4)} has been approved`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Could not approve heir",
        variant: "destructive",
      });
    }
  };

  const verifyRiddle = async () => {
    try {
      const address = await BlockchainService.connectWallet();
      const response = await axios.post(`${API_BASE_URL}/api/riddle/verify/${address}`, {
        riddleId: riddle?.id,
        answer: riddleAnswer,
      });
      if (response.data.success) {
        // Update last activity timestamp on successful riddle verification
        const now = Date.now();
        localStorage.setItem('lastActivity', now.toString());
        setLastActivity(now);
        const countdown = calculateCountdown(now);
        setTimeRemaining(countdown);

        toast({
          title: "Riddle verified",
          description: "Proof of life confirmed",
        });
        setRiddleAnswer("");
      } else {
        throw new Error("Incorrect answer");
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.response?.data?.error || error.message || "Incorrect riddle answer",
        variant: "destructive",
      });
    }
  };

  const addCustomRiddle = async () => {
    try {
      const address = await BlockchainService.connectWallet();
      if (!newRiddleQuestion || !newRiddleAnswer) {
        throw new Error("Please provide both a question and an answer");
      }
      const newRiddle = {
        id: `custom-${Date.now()}`,
        question: newRiddleQuestion,
        answer: newRiddleAnswer,
      };
      await axios.post(`${API_BASE_URL}/api/riddle/${address}`, newRiddle);
      setRiddle(newRiddle);
      setIsAddingRiddle(false);
      setNewRiddleQuestion("");
      setNewRiddleAnswer("");
      toast({
        title: "Riddle added",
        description: "Your custom riddle has been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Could not add riddle",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid-bg">
      <div className="mb-6">
        <h2 className="text-2xl font-mono font-bold mb-1">INHERITANCE <span className="text-neo-accent">DASHBOARD</span></h2>
        <p className="text-white/70 font-mono">Manage your digital legacy</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-black/30 neo-brutalist p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-mono font-bold">DESIGNATED HEIRS</h3>
              <button onClick={addHeir} className="text-xs font-mono text-neo-accent">+ ADD HEIR</button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <p className="font-mono text-white/70">Loading heirs...</p>
              ) : heirs.length === 0 ? (
                <p className="font-mono text-white/70">No heirs designated yet.</p>
              ) : (
                heirs.map((heir, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-white/5 border border-white/10">
                    <div className="w-10 h-10 rounded-full bg-neo-accent/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-neo-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-mono text-sm font-medium">{heir.address.slice(0, 6)}...{heir.address.slice(-4)}</h4>
                        <span className="font-mono text-sm text-neo-accent">{heir.share}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white/70 font-mono">{heir.approved ? "Approved" : "Pending"}</p>
                        {!heir.approved && (
                          <button
                            onClick={() => approveHeir(heir.address)}
                            className="text-xs font-mono text-neo-accent hover:underline"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="bg-black/30 neo-brutalist p-6">
            <h3 className="text-lg font-mono font-bold mb-4">TODAY'S PROOF OF LIFE CHALLENGE</h3>
            
            {isAddingRiddle ? (
              <div className="mb-4 p-4 border border-white/20 bg-white/5">
                <div className="mb-4">
                  <label className="font-mono text-white/90 mb-2 block">Riddle Question:</label>
                  <input
                    type="text"
                    value={newRiddleQuestion}
                    onChange={(e) => setNewRiddleQuestion(e.target.value)}
                    placeholder="Enter your riddle question..."
                    className="w-full bg-black/50 border border-white/20 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neo-accent"
                  />
                </div>
                <div className="mb-4">
                  <label className="font-mono text-white/90 mb-2 block">Riddle Answer:</label>
                  <input
                    type="text"
                    value={newRiddleAnswer}
                    onChange={(e) => setNewRiddleAnswer(e.target.value)}
                    placeholder="Enter the answer..."
                    className="w-full bg-black/50 border border-white/20 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neo-accent"
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={addCustomRiddle} 
                    className="neo-button bg-black border-neo-border px-4 py-2 font-mono text-sm"
                  >
                    SAVE RIDDLE
                  </button>
                  <button 
                    onClick={() => setIsAddingRiddle(false)} 
                    className="neo-button bg-black border-neo-border px-4 py-2 font-mono text-sm"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : riddle ? (
              <>
                <div className="mb-4 p-4 border border-white/20 bg-white/5">
                  <p className="font-mono text-white/90 mb-2">{riddle.question}</p>
                  <p className="text-xs font-mono text-neo-accent">HINT: Check block 0.</p>
                </div>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={riddleAnswer}
                    onChange={(e) => setRiddleAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="flex-1 bg-black/50 border border-white/20 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neo-accent"
                    disabled={loading}
                  />
                  <button 
                    onClick={verifyRiddle} 
                    className="neo-button bg-black border-neo-border px-4 py-2 font-mono text-sm"
                    disabled={loading}
                  >
                    VERIFY
                  </button>
                </div>
              </>
            ) : (
              <div className="mb-4 p-4 border border-white/20 bg-white/5">
                <p className="font-mono text-white/90 mb-2">No riddle available.</p>
                <button 
                  onClick={() => setIsAddingRiddle(true)} 
                  className="neo-button bg-black border-neo-border px-4 py-2 font-mono text-sm"
                >
                  ADD CUSTOM RIDDLE
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-black/30 neo-brutalist p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-neo-accent" />
            <h3 className="text-lg font-mono font-bold">COUNTDOWN</h3>
          </div>
          
          <p className="text-sm font-mono text-white/70 mb-4">
            Funds will be accessible to your heirs if no activity is detected in:
          </p>
          
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-black/50 border border-white/20 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-neo-accent">{timeRemaining.days}</div>
              <div className="text-xs font-mono text-white/70">DAYS</div>
            </div>
            <div className="bg-black/50 border border-white/20 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-neo-accent">{timeRemaining.hours}</div>
              <div className="text-xs font-mono text-white/70">HOURS</div>
            </div>
            <div className="bg-black/50 border border-white/20 p-3 text-center">
              <div className="text-2xl font-mono font-bold text-neo-accent">{timeRemaining.minutes}</div>
              <div className="text-xs font-mono text-white/70">MIN</div>
            </div>
          </div>
          
          <Progress value={timeRemaining.progress} className="h-2 mb-2" />
          <p className="text-xs font-mono text-right text-white/70">
            {Math.round(timeRemaining.progress)}% time elapsed
          </p>
          
          <div className="mt-6 p-4 bg-neo-accent/10 border border-neo-accent/20">
            <div className="flex items-center gap-2">
              <CircleCheck className="w-4 h-4 text-neo-accent" />
              <span className="text-sm font-mono">
                Last activity: {lastActivity ? formatLastActivity(lastActivity) : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InheritanceDashboard;