const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Starting deployment...");

  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    // 1. Deploy GaiaOracle
    console.log("\n1. 🏗️  Deploying GaiaOracle...");
    const GaiaOracle = await hre.ethers.getContractFactory("GaiaOracle");
    const gaiaOracle = await GaiaOracle.deploy("0x0000000000000000000000000000000000000000");
    await gaiaOracle.waitForDeployment();
    console.log(`✅ GaiaOracle deployed to: ${gaiaOracle.target}`);

    // 2. Deploy SchrodingerWallet
    console.log("\n2. 🏗️  Deploying SchrodingerWallet...");
    const SchrodingerWallet = await hre.ethers.getContractFactory("SchrodingerWallet");
    const schrodinger = await SchrodingerWallet.deploy(gaiaOracle.target);
    await schrodinger.waitForDeployment();
    console.log(`✅ SchrodingerWallet deployed to: ${schrodinger.target}`);

    // 3. Link contracts
    console.log("\n3. 🔗 Linking contracts...");
    const tx = await gaiaOracle.setSchrodingerWallet(schrodinger.target);
    await tx.wait();
    console.log("✅ Contracts linked successfully!");

    console.log("\n🎉 Deployment completed successfully!");
    console.log(`🌐 GaiaOracle: ${gaiaOracle.target}`);
    console.log(`💼 SchrodingerWallet: ${schrodinger.target}`);
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main();
