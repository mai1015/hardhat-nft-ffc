import { network, ethers } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { verify } from "../helper-functions"

const deployFundMe: DeployFunction = async function(
    hre: HardhatRuntimeEnvironment
) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()


    log("----------------------------------------------------")
    const args: any[] = [];
    const basicNFT = await deploy("BasicNFT", {
      from: deployer,
      args,
      log: true,
      waitConfirmations: developmentChains.includes(network.name) ? 1 : 6,
    });

    if (
      !developmentChains.includes(network.name) &&
      process.env.ETHERSCAN_API_KEY
    ) {
      log("Verifying...")
      await verify(basicNFT.address, args)
    }
    log("----------------------------------------------------")
}

export default deployFundMe
deployFundMe.tags = ["all", "basicnft"]
