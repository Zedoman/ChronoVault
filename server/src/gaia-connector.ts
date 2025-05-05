import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const SCHRODINGER_ABI = require('../../artifacts/contracts/SchrodingerWallet.sol/SchrodingerWallet.json').abi;
const GAIA_ORACLE_ABI = require('../../artifacts/contracts/GaiaOracle.sol/GaiaOracle.json').abi;

export interface Activity {
    timestamp: Date;
    type: string;
    completed: boolean;
}

export interface Heir {
    address: string;
    share: string;
    approved: boolean;
}

export class GaiaConnector {
    private provider: ethers.JsonRpcProvider;
    private schrodingerContract: ethers.Contract;
    private gaiaOracleContract: ethers.Contract;
    private signer: ethers.Wallet;

    constructor(
        rpcUrl: string,
        schrodingerAddress: string,
        gaiaOracleAddress: string,
        privateKey: string
    ) {
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.signer = new ethers.Wallet(privateKey, this.provider);
            this.schrodingerContract = new ethers.Contract(
                schrodingerAddress,
                SCHRODINGER_ABI,
                this.signer
            );
            this.gaiaOracleContract = new ethers.Contract(
                gaiaOracleAddress,
                GAIA_ORACLE_ABI,
                this.signer
            );
        } catch (error) {
            throw new Error(`Failed to initialize GaiaConnector: ${(error as Error).message}`);
        }
    }

    async verifyVoiceBiometrics(userAddress: string, voiceSample: string): Promise<void> {
        try {
            const voiceSignature = ethers.id(voiceSample);
            await this.gaiaOracleContract.verifyVoiceAndProveLiveness(
                userAddress,
                voiceSignature
            );
        } catch (error) {
            throw new Error(`Voice verification failed: ${(error as Error).message}`);
        }
    }

    async generateAndVerifyRiddle(userAddress: string): Promise<{ question: string, answer: string }> {
        try {
            const riddleId = uuidv4();
            const question = "What's the SHA-256 of 'Vitalik'?";
            const answer = "0x4f8b42c22dd3729b519ba6f68d2da97cc12dec1a8ee48e15e1f2b5a0a0a9a8f2";
            
            await this.gaiaOracleContract.createRiddle(riddleId, question, answer);
            await this.gaiaOracleContract.verifyRiddleAndProveLiveness(
                userAddress,
                riddleId,
                answer
            );

            return { question, answer };
        } catch (error) {
            throw new Error(`Riddle generation failed: ${(error as Error).message}`);
        }
    }

    async getUserActivities(userAddress: string): Promise<Activity[]> {
        try {
            const activityCount = await this.schrodingerContract.getActivityCount(userAddress);
            const activities: Activity[] = [];

            for (let i = 0; i < Number(activityCount); i++) {
                const activity = await this.schrodingerContract.activities(userAddress, i);
                activities.push({
                    timestamp: new Date(Number(activity.timestamp) * 1000),
                    type: String(activity.activityType),
                    completed: Boolean(activity.completed)
                });
            }

            return activities;
        } catch (error) {
            throw new Error(`Failed to fetch activities: ${(error as Error).message}`);
        }
    }

    async getHeirs(userAddress: string): Promise<Heir[]> {
        try {
            const heirCount = await this.schrodingerContract.getHeirCount(userAddress);
            const heirs: Heir[] = [];

            for (let i = 0; i < Number(heirCount); i++) {
                const heir = await this.schrodingerContract.heirs(userAddress, i);
                heirs.push({
                    address: String(heir.wallet),
                    share: heir.share.toString(),
                    approved: Boolean(heir.approved)
                });
            }

            return heirs;
        } catch (error) {
            throw new Error(`Failed to fetch heirs: ${(error as Error).message}`);
        }
    }
}

export default GaiaConnector;