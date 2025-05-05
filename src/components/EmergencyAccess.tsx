import { useState, useEffect } from 'react';
import { Shield, User, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import axios from 'axios';
import BlockchainService from '@/services/BlockchainService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type HeirApprovalStatus = {
  address: string;
  approved: boolean;
};

type Riddle = {
  id: string;
  question: string;
  answer?: string;
};

const EmergencyAccess = () => {
  const { toast } = useToast();
  const [heirApprovals, setHeirApprovals] = useState<HeirApprovalStatus[]>([]);
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [useRiddleVerification, setUseRiddleVerification] = useState(false);
  const releaseDate = "June 15, 2025";
  const approvalsNeeded = 3;

  useEffect(() => {
    const fetchHeirsAndRiddle = async () => {
      setLoading(true);
      try {
        const address = await BlockchainService.connectWallet();
        const heirResponse = await axios.get(`${API_BASE_URL}/api/heirs/${address}`);
        setHeirApprovals(heirResponse.data);
        const riddleResponse = await axios.get(`${API_BASE_URL}/api/riddle/${address}`);
        setRiddle(riddleResponse.data);
      } catch (error) {
        console.error('Error fetching heirs:', error);
        toast({
          title: "Error",
          description: "Could not fetch heir data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHeirsAndRiddle();
  }, [toast]);

  const requestApproval = async () => {
    try {
      const address = await BlockchainService.connectWallet();
      toast({
        title: "Request sent",
        description: "The other heirs have been notified of your request.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not send approval request",
        variant: "destructive",
      });
    }
  };

  const verifyRiddleForAccess = async () => {
    try {
      const address = await BlockchainService.connectWallet();
      const response = await axios.post(`${API_BASE_URL}/api/riddle/verify/${address}`, {
        riddleId: riddle?.id,
        answer: riddleAnswer,
      });
      if (response.data.success) {
        await BlockchainService.verifyHeirViaRiddle(address, riddle?.id || "");
        toast({
          title: "Access granted",
          description: "Riddle solved successfully. You have been granted access.",
          variant: "default",
        });
      } else {
        throw new Error("Incorrect answer");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: "Verification failed",
        description: message || "Incorrect riddle answer",
        variant: "destructive",
      });
    }
  };

  const approvalsReceived = heirApprovals.filter(h => h.approved).length;

  return (
    <div className="grid-bg">
      <div className="mb-6">
        <h2 className="text-2xl font-mono font-bold mb-1">EMERGENCY <span className="text-neo-red">ACCESS</span></h2>
        <p className="text-white/70 font-mono">Heir inheritance claim portal</p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <div className="bg-black neo-brutalist border-neo-red p-6 mb-8">
          <div className="flex items-start gap-4">
            <Shield className="w-10 h-8 text-neo-red flex-shrink-0" />
            <div>
              <h3 className="text-xl font-mono font-bold text-neo-red mb-2">EMERGENCY NOTICE</h3>
              <p className="text-white/90 mb-4">
                The owner of this vault has not performed life verification. Inheritance protocol has been initiated.
              </p>
              <div className="p-4 border border-white/20 bg-white/5 mb-4">
                <p className="font-mono">
                  Funds will be automatically released to designated heirs on: <br />
                  <span className="text-neo-red">{releaseDate}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-black/30 neo-brutalist p-6 mb-8">
          <h3 className="text-lg font-mono font-bold mb-4">
            {useRiddleVerification ? "VERIFY IDENTITY VIA RIDDLE" : "REQUEST EARLY ACCESS"}
          </h3>
          <div className="mb-4">
            <button 
              onClick={() => setUseRiddleVerification(!useRiddleVerification)} 
              className="text-xs font-mono text-neo-accent"
            >
              {useRiddleVerification ? "Switch to Approval Request" : "Use Riddle Verification Instead"}
            </button>
          </div>

          {useRiddleVerification ? (
            riddle ? (
              <div>
                <p className="text-white/80 mb-4">
                  Solve the owner's riddle to verify your identity and gain access:
                </p>
                <div className="mb-4 p-4 border border-white/20 bg-white/5">
                  <p className="font-mono text-white/90 mb-2">{riddle.question}</p>
                  <p className="text-xs font-mono text-neo-accent">HINT: Check block 0.</p>
                </div>
                <div className="flex gap-4 mb-4">
                  <input
                    type="text"
                    value={riddleAnswer}
                    onChange={(e) => setRiddleAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="flex-1 bg-black/50 border border-white/20 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neo-accent"
                    disabled={loading}
                  />
                  <Button 
                    onClick={verifyRiddleForAccess}
                    className="neo-button bg-black border-neo-border text-white font-mono px-4 py-2"
                    disabled={loading}
                  >
                    SUBMIT ANSWER
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-white/80">No riddle available for verification.</p>
            )
          ) : (
            <>
              <p className="text-white/80 mb-4">
                To request early access to the vault, approval from {approvalsNeeded} out of {heirApprovals.length} heirs is required.
              </p>
              <div className="mb-4">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Approvals received</span>
                  <span>{approvalsReceived}/{approvalsNeeded}</span>
                </div>
                <Progress value={(approvalsReceived / approvalsNeeded) * 100} className="h-2" />
              </div>
              <div className="space-y-3 mb-6">
                {loading ? (
                  <p className="font-mono text-white/70">Loading heirs...</p>
                ) : (
                  heirApprovals.map((heir, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-mono text-sm">{heir.address.slice(0, 6)}...{heir.address.slice(-4)}</span>
                      <div className="ml-auto flex items-center">
                        <span className={cn(
                          "text-xs font-mono px-2 py-1",
                          heir.approved 
                            ? "bg-neo-accent/20 text-neo-accent" 
                            : "bg-white/10 text-white/60"
                        )}>
                          {heir.approved ? "APPROVED" : "PENDING"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button 
                onClick={requestApproval}
                className="neo-button bg-black border-neo-red text-white font-mono px-6 py-2 hover:bg-black"
                disabled={loading}
              >
                REQUEST APPROVAL 
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        <div className="p-4 border border-white/20 bg-white/5 text-center">
          <p className="text-sm font-mono text-white/60">
            All access requests are permanently recorded on-chain.
            <br />
            Fraudulent requests may result in legal consequences.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyAccess;