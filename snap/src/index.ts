import { OnRpcRequestHandler } from '@metamask/snap-types';
import { ethers } from 'ethers';
import { JsonRpcEngine } from 'json-rpc-engine';

// Type definitions for the wallet object
declare const wallet: {
  request: (options: { method: string; params?: any[] }) => Promise<any>;
};

// Mock GaiaOracle ABI for encoding function calls
const GaiaOracle = {
  encodeFunctionData: (functionName: string, params: any[]) => {
    const iface = new ethers.Interface([
      'function verifyVoiceAndProveLiveness(address,bytes)',
      'function verifyRiddleAndProveLiveness(address,string,string)'
    ]);
    return iface.encodeFunctionData(functionName, params);
  }
};

// Merkle tree implementation (simplified)
class SimpleMerkleTree {
  private leaves: string[];
  private root: string;

  constructor(leaves: string[]) {
    this.leaves = leaves.map(leaf => ethers.keccak256(leaf));
    // In a real implementation, you would build the actual tree here
    this.root = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32[]'],
      [this.leaves]
    ));
  }

  getHexRoot(): string {
    return this.root;
  }

  getProof(index: number): string[] {
    // Simplified proof - real implementation would generate actual merkle proofs
    return [this.leaves[index]];
  }
}

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {
    case 'approveHeirs':
      return handleHeirApproval(request.params);
    case 'verifyLiveness':
      return handleLivenessVerification(request.params);
    default:
      throw new Error('Method not found.');
  }
};

async function handleHeirApproval(params: any): Promise<any> {
  const { heirs, contractAddress } = params;
  
  // Generate merkle tree and proofs for heirs
  const merkleTree = generateMerkleTree(heirs);
  const proofs = generateProofs(heirs, merkleTree);
  
  // Store using Snap's storage
  const userAddress = await wallet.request({ method: 'eth_requestAccounts' });
  await wallet.request({
    method: 'snap_manageState',
    params: ['update', { 
      [`heirs_${userAddress[0]}`]: { 
        heirs, 
        merkleRoot: merkleTree.getHexRoot(),
        proofs 
      } 
    }]
  });
  
  return { 
    success: true, 
    merkleRoot: merkleTree.getHexRoot() 
  };
}

async function handleLivenessVerification(params: any): Promise<any> {
  const { verificationType, data } = params;
  const userAddress = await wallet.request({ method: 'eth_requestAccounts' });
  
  if (verificationType === 'voice') {
    const voiceSignature = ethers.id(data.voiceSample);
    return wallet.request({
      method: 'eth_sendTransaction',
      params: [{
        to: data.gaiaOracleAddress,
        data: GaiaOracle.encodeFunctionData('verifyVoiceAndProveLiveness', [
          userAddress[0],
          voiceSignature
        ])
      }]
    });
  } else if (verificationType === 'riddle') {
    return wallet.request({
      method: 'eth_sendTransaction',
      params: [{
        to: data.gaiaOracleAddress,
        data: GaiaOracle.encodeFunctionData('verifyRiddleAndProveLiveness', [
          userAddress[0],
          data.riddleId,
          data.answer
        ])
      }]
    });
  }
  
  throw new Error('Invalid verification type');
}

function generateMerkleTree(heirs: Array<{address: string, share: number}>): SimpleMerkleTree {
  // Convert heirs to encoded leaves
  const leaves = heirs.map(heir => 
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [heir.address, heir.share]
    )
  );
  return new SimpleMerkleTree(leaves);
}

function generateProofs(
  heirs: Array<{address: string, share: number}>, 
  tree: SimpleMerkleTree
): any[] {
  return heirs.map((_, index) => ({
    index,
    proof: tree.getProof(index)
  }));
}