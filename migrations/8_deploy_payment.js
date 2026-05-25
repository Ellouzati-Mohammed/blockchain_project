const Payment = artifacts.require("Payment");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Payment, accounts[0]);
};
