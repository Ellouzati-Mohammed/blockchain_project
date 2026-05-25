const Convertisseur = artifacts.require("Convertisseur");

module.exports = function (deployer) {
  deployer.deploy(Convertisseur);
};
