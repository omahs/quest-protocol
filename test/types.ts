import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

export type MerkleDistributorContractType = {
  token: () => Promise<string>
  totalAmount: () => Promise<number>
  owner: () => Promise<string>
  startTime: () => Promise<number>
  endTime: () => Promise<number>
  hasStarted: () => Promise<boolean>
  merkleRoot: () => Promise<void>
  address: string
  connect: (address: SignerWithAddress) => { setMerkleRoot: (merkleRoot: string) => Promise<void>; start: () => Promise<void>; pause: () => Promise<void>; unPause: () => Promise<void>; withdraw: () => Promise<void> }
  withdraw: () => Promise<void>
  claim: (owner: string, amount: number, merkleProof: string[]) => Promise<void>
  setMerkleRoot: (merkleRoot: string) => Promise<void>
  unPause: () => Promise<void>
  transfer: () => Promise<void>
}

export type SampleErc20Type = {
  address: string
  deployed: () => Promise<any>
  functions: {
    transfer: (transferee: string, amount: number) => Promise<any>
    balanceOf: (tokenAddress: string) => Promise<number>
  }
}
