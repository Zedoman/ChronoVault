import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';

class RiddleEngine {
    private static riddles: Map<string, { question: string, answer: string }> = new Map();

    static generateRiddle(): { id: string, question: string } {
        const id = uuidv4();
        const question = "What's the SHA-256 of 'Vitalik'?";
        const answer = "0x4f8b42c22dd3729b519ba6f68d2da97cc12dec1a8ee48e15e1f2b5a0a0a9a8f2";
        
        this.riddles.set(id, { question, answer });
        return { id, question };
    }

    static verifyAnswer(riddleId: string, answer: string): boolean {
        const riddle = this.riddles.get(riddleId);
        if (!riddle) return false;
        
        // Ethers v6 equivalent
        return ethers.keccak256(ethers.toUtf8Bytes(answer)) === 
               ethers.keccak256(ethers.toUtf8Bytes(riddle.answer));
    }
}

export default RiddleEngine;