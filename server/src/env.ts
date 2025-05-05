import dotenv from 'dotenv';
dotenv.config(); // ✅ Make sure this is before any other imports

export const ENV = {
    SCHRODINGER_ADDRESS: process.env.SCHRODINGER_ADDRESS ?? throwEnvError('SCHRODINGER_ADDRESS'),
    RPC_URL: process.env.RPC_URL ?? throwEnvError('RPC_URL'),
    
    GAIA_ORACLE_ADDRESS: process.env.GAIA_ORACLE_ADDRESS ?? throwEnvError('GAIA_ORACLE_ADDRESS'),
    PRIVATE_KEY: process.env.PRIVATE_KEY ?? throwEnvError('PRIVATE_KEY'),
  };
  
  function throwEnvError(name: string): never {
    throw new Error(`Missing env variable: ${name}`);
  }
  