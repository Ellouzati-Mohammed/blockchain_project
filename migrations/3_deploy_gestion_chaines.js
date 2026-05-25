const GestionChaines = artifacts.require("GestionChaines");

module.exports = function (deployer) {
  deployer.deploy(GestionChaines);
};
