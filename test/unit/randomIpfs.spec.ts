// We are going to skimp a bit on these tests...

import { assert, expect } from "chai"
import { network, deployments, ethers }from "hardhat"
import { developmentChains, networkConfig} from "../../helper-hardhat-config"
import {RandomIpfsNFT, VRFCoordinatorV2Mock} from "../../typechain"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIpfsNft: RandomIpfsNFT, deployer, vrfCoordinatorV2Mock: VRFCoordinatorV2Mock

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNFT")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          describe("constructor", function () {
              it("sets starting values correctly", async function () {
                  const dogTokenUriZero = await randomIpfsNft.getDogTokenUri(0)
                //   const isInitialized = await randomIpfsNft.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                //   assert.equal(isInitialized, true)
              })
          })

          describe("requestNft", function () {
              it("fails if payment isn't sent with the request", async function () {
                  await expect(randomIpfsNft.requestNFT()).to.be.revertedWithCustomError(randomIpfsNft, "RandomIpfsNFT__NeedMoreETH")
              })
              it("emits and event and kicks off a random word request", async function () {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNFT({ value: fee.toString() })).to.emit(
                      randomIpfsNft,
                      "NFTRequested"
                  )
              })
          })
          describe("fulfillRandomWords", function () {
              it("mints NFT after random number returned", async function () {
                  await new Promise<void>(async (resolve, reject) => {
                      randomIpfsNft.once("NFTMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNft.tokenURI(0)
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomIpfsNft.getMintFee()
                          const requestNftResponse = await randomIpfsNft.requestNFT({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events![1].args!.requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
      })
