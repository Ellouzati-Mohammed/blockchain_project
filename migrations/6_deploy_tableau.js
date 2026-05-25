const Tableau = artifacts.require("Tableau");

module.exports = function (deployer) {
  deployer.deploy(Tableau, [1, 2, 3]);
};
