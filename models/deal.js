'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Deal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      this.belongsToMany(models.Contact, { through: 'DealContacts' });
    }
  }
  Deal.init({
    name: DataTypes.STRING,
    crm_id: DataTypes.INTEGER,
    price: DataTypes.INTEGER,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Deal',
  });
  return Deal;
};