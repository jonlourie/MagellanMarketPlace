const MagellanMarket  = artifacts.require("MagellanMarketContract");

module.exports = function (deployer) {
  deployer.deploy(MagellanMarket);
};
