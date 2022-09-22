import { resolve, basename } from "path";
import { network, ethers } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { developmentChains, networkConfig } from "../helper-hardhat-config"
import { verify } from "../helper-functions"

import { Web3Storage, getFilesFromPath, File, Blob } from 'web3.storage'

const client = new Web3Storage({token: process.env.WEB3STORAGE_TOKEN || ""})

const FUND_AMOUNT = "1000000000000000000000"

const imagesLocation = "./images/random/"
let tokenUris = [
  'ipfs://bafkreidcfboqloanmnrwjxlykkvxi2iaevaw3p4u6her2rth5xoe43qkay',
  'ipfs://bafkreifr4k4jvopwkp24523aaegmrjbanoaym3yftst6eicyvbejsqwgmu',
  'ipfs://bafkreia63lkzlj4lcwn3f3p7hu7fnb35zxh6rpgyswtjr44bja64wxhslu'
]

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

const deployFundMe: DeployFunction = async function(
    hre: HardhatRuntimeEnvironment
) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId;

    // if (process.env.WEB3STORAGE_TOKEN) {
    //   await deployImage();
    // }

    let coordinatorAddr, subscriptionId
    if (developmentChains.includes(network.name)) {
      const vrfCoordinator = await ethers.getContract("VRFCoordinatorV2Mock")
      coordinatorAddr = vrfCoordinator.address
      const tx = await vrfCoordinator.createSubscription()
      const txReceipt = await tx.wait(1)
      subscriptionId = txReceipt.events[0].args.subId
      await vrfCoordinator.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
      coordinatorAddr = networkConfig[chainId!].vrfCoordinator || ""
      subscriptionId = networkConfig[chainId!].subId || "0"
    }

    const entranceFee = networkConfig[chainId!].fee
    const gasLane = networkConfig[chainId!].keyHash;
    const callbackGasLimit = networkConfig[chainId!].callbackGasLimit;

    log("----------------------------------------------------")
    const args: any[] = [coordinatorAddr, subscriptionId, gasLane, callbackGasLimit, entranceFee, tokenUris];
    const nft = await deploy("RandomIpfsNFT", {
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
      await verify(nft.address, args)
    }
    log("----------------------------------------------------")
}

async function deployImage() {
  tokenUris = []
  let imageUris = []
  const files = await getFilesFromPath(imagesLocation);
  console.log(`read ${files.length} file(s) from ${imagesLocation}`);

  
  for (const f of files) {
    console.log(`Uploading ${f.name}...`)
    const cid = await client.put([f], {wrapWithDirectory: false});
    imageUris.push(cid)
  }
  console.log("Token URIs uploaded! They are:")
  console.log(imageUris)

  for (let i = 0; i < imageUris.length; i++) {
    let metadata = { ...metadataTemplate };
    metadata.name = basename(files[i].name.replace(".png", ""))
    metadata.description = `An adorable ${metadata.name} pup!`
    metadata.image = `ipfs://${imageUris[i]}`

    console.log(`Uploading metadata ${metadata.name}...`)
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    const cid = await client.put([new File([blob], "metadata.json")], {wrapWithDirectory: false});
    tokenUris.push(`ipfs://${cid}`);
  }
  console.log(tokenUris);
  return tokenUris;
}

export default deployFundMe
deployFundMe.tags = ["all", "randomipfs"]
