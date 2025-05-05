
import { useState, useEffect } from 'react';
import { Shield, ExternalLink, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MetaMaskSDK, SDKProvider } from '@metamask/sdk';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Update the global window interface to avoid type conflicts
declare global {
  interface Window {
    ethereum?: any; // Using any type to avoid conflicts with SDKProvider
  }
}

const MetaMaskConnector = () => {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [sdk, setSDK] = useState<MetaMaskSDK | null>(null);
  const [provider, setProvider] = useState<SDKProvider | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  
  // Check if MetaMask is installed
  const checkMetaMaskInstalled = () => {
    // Fix the providers check by checking if window.ethereum exists and then checking its properties
    return !!window.ethereum && (
      window.ethereum.isMetaMask || 
      (typeof window.ethereum.providers === 'object' && 
       Array.isArray(window.ethereum.providers) && 
       window.ethereum.providers.some((p: any) => p.isMetaMask))
    );
  };
  
  // Initialize MetaMask SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        // First check if MetaMask is installed
        const hasMetaMask = checkMetaMaskInstalled();
        setIsMetaMaskInstalled(hasMetaMask);
        
        if (!hasMetaMask) {
          console.log('MetaMask not detected in browser');
          return;
        }
        
        console.log('Initializing MetaMask SDK');
        const MMSDK = new MetaMaskSDK({
          dappMetadata: {
            name: "ChronoVault",
            url: window.location.href,
          },
          logging: {
            sdk: true, // Enable SDK logging for debugging
          },
          // Remove the invalid connectOnInit option
          checkInstallationImmediately: true, // Check for installation immediately
        });
        
        setSDK(MMSDK);
        
        // Get the provider
        const sdkProvider = MMSDK.getProvider();
        setProvider(sdkProvider || null);
        
        // Check if already connected by trying to get accounts
        if (sdkProvider) {
          try {
            const accounts = await sdkProvider.request({ method: 'eth_accounts' }) as string[];
            if (accounts && accounts.length > 0) {
              console.log('Already connected to account:', accounts[0]);
              setAddress(accounts[0]);
              setConnected(true);
            }
          } catch (err) {
            console.log('Error checking existing connection:', err);
          }
          
          // Listen for account changes
          sdkProvider.on('accountsChanged', (...args: unknown[]) => {
            const accounts = args[0] as string[];
            console.log('Account changed:', accounts);
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setConnected(true);
              toast({
                title: "Account changed",
                description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
              });
            } else {
              setAddress('');
              setConnected(false);
              toast({
                title: "Disconnected",
                description: "Wallet disconnected",
                variant: "destructive",
              });
            }
          });
          
          // Listen for chain changes
          sdkProvider.on('chainChanged', (...args: unknown[]) => {
            console.log('Network changed to:', args[0]);
            toast({
              title: "Network changed",
              description: `Connected to chain ID: ${args[0]}`,
            });
          });
          
          // Listen for disconnect
          sdkProvider.on('disconnect', () => {
            console.log('Disconnected');
            setAddress('');
            setConnected(false);
            toast({
              title: "Wallet disconnected",
              description: "Your wallet has been disconnected",
              variant: "destructive",
            });
          });
        }
      } catch (error) {
        console.error('Failed to initialize MetaMask SDK:', error);
        // Try to recover by checking direct window.ethereum
        setIsMetaMaskInstalled(checkMetaMaskInstalled());
      }
    };
    
    initSDK();
    
    // Cleanup function
    return () => {
      if (provider) {
        provider.removeAllListeners();
      }
    };
  }, [toast]);
  
  // Connect wallet using either SDK or direct ethereum object
  const connectWallet = async () => {
    setConnecting(true);
    
    try {
      // Try with SDK provider first
      if (provider) {
        console.log('Connecting using SDK provider...');
        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
          
          toast({
            title: "Wallet connected",
            description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          });
          return;
        }
      }
      
      // Fallback to direct window.ethereum if SDK fails
      if (window.ethereum) {
        console.log('Falling back to direct window.ethereum...');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
        
        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
          
          toast({
            title: "Wallet connected",
            description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          });
          return;
        }
      }
      
      // If we get here, we couldn't connect
      throw new Error('Could not connect to MetaMask');
      
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      
      // Handle user rejected request error specially
      if (error instanceof Error && error.message.includes('User rejected')) {
        toast({
          title: "Connection Rejected",
          description: "You rejected the connection request",
          variant: "destructive",
        });
      } else {
        // Check if MetaMask is installed at all
        const installed = checkMetaMaskInstalled();
        if (!installed) {
          setIsMetaMaskInstalled(false);
          setShowInstallDialog(true);
        } else {
          toast({
            title: "Connection Failed",
            description: "Could not connect to MetaMask. Please try again.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setConnecting(false);
    }
  };

  // Logout wallet function
  const logoutWallet = async () => {
    setDisconnecting(true);
    
    try {
      console.log('Attempting to disconnect wallet');
      
      // Reset state
      setAddress('');
      setConnected(false);
      
      // Try to disconnect using the provider if available
      // Note: MetaMask doesn't have a direct disconnect method, but we can clear our state
      if (provider) {
        console.log('Clearing provider state');
        // Force update of the UI by requesting accounts to show disconnected state
        await provider.request({ method: 'eth_accounts' });
      }
      
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected successfully",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error disconnecting from MetaMask:', error);
      
      toast({
        title: "Disconnection Failed",
        description: "Could not disconnect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  // Function to retry SDK initialization
  const retryConnection = () => {
    window.location.reload();
  };
  
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-neo-dark p-6">
      <div className="w-full max-w-md bg-black/30 neo-brutalist p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Shield className="h-16 w-16 text-neo-accent" />
        </div>
        
        <h1 className="text-2xl font-mono font-bold mb-2">CHRONO<span className="text-neo-accent">VAULT</span></h1>
        <p className="text-white/70 mb-6">Secure your digital legacy</p>
        
        {isMetaMaskInstalled === false && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>MetaMask not detected</AlertTitle>
            <AlertDescription>
              Please install the MetaMask extension to continue
            </AlertDescription>
          </Alert>
        )}
        
        {!connected ? (
          <>
            <Button
              onClick={connectWallet}
              disabled={connecting || isMetaMaskInstalled === false}
              className="neo-button bg-black border-neo-border text-white font-mono w-full py-6 text-lg mb-3"
            >
              {connecting ? "Connecting..." : "Connect MetaMask"}
            </Button>
            
            {isMetaMaskInstalled !== false && (
              <Button
                onClick={retryConnection}
                variant="outline"
                className="w-full font-mono"
              >
                Refresh Connection
              </Button>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="mb-4 p-4 border border-neo-accent/30 bg-neo-accent/10">
              <p className="font-mono text-sm text-white/90">Connected as</p>
              <p className="font-mono text-neo-accent">{address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
            <Button
              onClick={() => window.location.href = "/liveness-check"}
              className="neo-button bg-black border-neo-border text-white font-mono w-full py-4 mb-3"
            >
              Enter Dashboard
            </Button>
            <Button
              onClick={logoutWallet}
              variant="destructive"
              disabled={disconnecting}
              className="w-full font-mono flex items-center justify-center gap-2"
            >
              {disconnecting ? (
                "Disconnecting..."
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Disconnect Wallet
                </>
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* MetaMask Installation Dialog */}
      <AlertDialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>MetaMask Required</AlertDialogTitle>
            <AlertDialogDescription>
              ChronoVault requires MetaMask to secure your digital legacy. Would you like to install it now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center"
              >
                Install MetaMask <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MetaMaskConnector;