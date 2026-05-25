const Rectangle = artifacts.require("Rectangle");

module.exports = function (deployer) {
  deployer.deploy(Rectangle, 0, 0, 5, 3);
};
