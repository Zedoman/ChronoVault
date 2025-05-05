require('@nomicfoundation/hardhat-toolbox');
// require('@nomiclabs/hardhat-waffle');
require("dotenv").config();


module.exports = {
  solidity: "0.8.25",
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      gas: 8000000
    },
    sepolia: {
      url: "https://sepolia.infura.io/v3/fdf79b2428b44369bf1f87fe5f120dee",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111
    }
  }
};