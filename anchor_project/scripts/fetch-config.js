const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX');
const DEFAULT_RPC = 'https://api.devnet.solana.com';

(async () => {
  try {
    const rpcUrl = process.env.ANCHOR_PROVIDER_URL || process.env.RPC_URL || DEFAULT_RPC;
    const connection = new Connection(rpcUrl, 'confirmed');
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);

    console.log('RPC URL:', rpcUrl);
    console.log('Program ID:', PROGRAM_ID.toString());
    console.log('Config PDA:', configPda.toString());

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) {
      console.log('Config account not found on this cluster.');
      return;
    }

    const data = Buffer.from(accountInfo.data);
    console.log('Lamports:', accountInfo.lamports);
    console.log('Data length:', data.length);

    if (data.length < 82) {
      console.warn('Config account data too short to decode expected fields.');
      return;
    }

    const admin = new PublicKey(data.slice(8, 40));
    const usdcMint = new PublicKey(data.slice(40, 72));
    const switchboardProgram = new PublicKey(data.slice(72, 104));

    let riskPoolVault = null;
    let pausedOffset = 104;

    if (data.length >= 138) {
      riskPoolVault = new PublicKey(data.slice(104, 136));
      pausedOffset = 136;
    }

    const paused = data[pausedOffset] === 1;
    const bump = data[pausedOffset + 1];

    console.log('Admin:', admin.toString());
    console.log('USDC Mint:', usdcMint.toString());
    console.log('Switchboard Program:', switchboardProgram.toString());
    if (riskPoolVault) {
      console.log('Risk Pool Vault:', riskPoolVault.toString());
    }
    console.log('Paused:', paused);
    console.log('Bump:', bump);
  } catch (error) {
    console.error('Error while fetching config account:', error);
    process.exitCode = 1;
  }
})();
