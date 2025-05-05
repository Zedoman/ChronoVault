import { BrowserProvider, Contract, keccak256, toUtf8Bytes } from 'ethers';
import GaiaOracleABI from '../../artifacts/contracts/GaiaOracle.sol/GaiaOracle.json';
import SchrodingerWalletABI from '../../artifacts/contracts/SchrodingerWallet.sol/SchrodingerWallet.json';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CONTRACT_ADDRESSES = {
  gaiaOracle: import.meta.env.VITE_GAIA_ORACLE_ADDRESS,
  schrodingerWallet: import.meta.env.VITE_SCHRODINGER_ADDRESS
};

class BlockchainService {
  private provider: BrowserProvider | null = null;
  private signer: any = null;

  constructor() {
    if (window.ethereum) {
      this.provider = new BrowserProvider(window.ethereum);
    }
  }

  async connectWallet(): Promise<string> {
    if (!window.ethereum) throw new Error("MetaMask not installed");
    if (!this.provider) this.provider = new BrowserProvider(window.ethereum);
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    this.signer = await this.provider.getSigner();
    return accounts[0];
  }

  getSchrodingerContract(): Contract {
    if (!this.signer) throw new Error("Wallet not connected");
    return new Contract(
      CONTRACT_ADDRESSES.schrodingerWallet,
      SchrodingerWalletABI.abi,
      this.signer
    );
  }

  getGaiaOracleContract(): Contract {
    if (!this.signer) throw new Error("Wallet not connected");
    return new Contract(
      CONTRACT_ADDRESSES.gaiaOracle,
      GaiaOracleABI.abi,
      this.signer
    );
  }

  async proveLiveness(voiceSample: string) {
    const contract = this.getGaiaOracleContract();
    const voiceSignature = keccak256(toUtf8Bytes(voiceSample));
    return contract.verifyVoiceAndProveLiveness(
      await this.signer.getAddress(),
      voiceSignature
    );
  }

  async getHeirs(): Promise<Array<{ address: string, share: number }>> {
    try {
      const address = await this.connectWallet();
      const response = await axios.get(`${API_BASE_URL}/heirs/${address}`);
      return response.data.map((heir: any) => ({
        address: heir.address,
        share: parseInt(heir.share)
      }));
    } catch (error) {
      console.error('Error fetching heirs:', error);
      throw new Error("Could not fetch heirs");
    }
  }

  async generateAndVerifyRiddle(): Promise<{ question: string, answer: string }> {
    try {
      const address = await this.connectWallet();
      const response = await axios.get(`${API_BASE_URL}/riddle/${address}`);
      const { question, answer, riddleId } = response.data;
      
      const contract = this.getGaiaOracleContract();
      await contract.verifyRiddleAndProveLiveness(address, riddleId, answer);
      
      return { question, answer };
    } catch (error) {
      console.error('Error with riddle:', error);
      throw new Error("Could not process riddle");
    }
  }

  async verifyHeirViaRiddle(heirAddress: string, riddleId: string) {
    const contract = this.getSchrodingerContract();
    // Simulate contract call to verify heir via riddle
    // In a real implementation, this would interact with the contract to grant access
    console.log(`Heir ${heirAddress} verified via riddle ${riddleId}`);
  }
}

export default new BlockchainService();