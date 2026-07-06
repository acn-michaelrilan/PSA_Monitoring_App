const cds = require('@sap/cds');
const { createCheckpointLogic } = require('./handlers/checkpoint-logic');

module.exports = cds.service.impl(function () {
  const {
    AvailableBoxCheck,
    ShippedBolCheck,
    ShippedConsigneeBOLCheck,
    PartNumberBOLCheck,
    MaterialInformationCheck
  } = this.entities;

  const handler = createCheckpointLogic();

  this.on('READ', AvailableBoxCheck, handler.readAvailableBoxCheck);
  this.on('READ', ShippedBolCheck, handler.readShippedBolCheck);
  this.on('READ', ShippedConsigneeBOLCheck, handler.readShippedConsigneeBOLCheck);
  this.on('READ', PartNumberBOLCheck, handler.readPartNumberBOLCheck);
  this.on('READ', MaterialInformationCheck, handler.readMaterialInformationCheck);
});