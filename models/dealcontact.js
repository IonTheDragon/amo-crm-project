'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DealContact extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DealContact.init({
    DealId: DataTypes.INTEGER,
    ContactId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'DealContact',
    noPrimaryKey: true
  });

  DealContact.removeAttribute('id');

  return DealContact;
};