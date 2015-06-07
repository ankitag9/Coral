var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var AbstractModel = require('./AbstractModel');

/*
* Base class for Models
*/
var BaseModel = (function (_super) {
    __extends(BaseModel, _super);
    function BaseModel() {
        _super.apply(this, arguments);
    }
    /* Getters */
    BaseModel.prototype.getId = function () {
        return this.id;
    };
    BaseModel.prototype.getCreated = function () {
        return this.created;
    };
    BaseModel.prototype.getUpdated = function () {
        return this.updated;
    };
    BaseModel.prototype.getDeleted = function () {
        return this.deleted;
    };

    /* Setters */
    BaseModel.prototype.setId = function (val) {
        this.id = val;
    };
    BaseModel.prototype.setCreated = function (val) {
        this.created = val;
    };
    BaseModel.prototype.setUpdated = function (val) {
        this.updated = val;
    };
    BaseModel.prototype.setDeleted = function (val) {
        this.deleted = val;
    };

    BaseModel.prototype.isValid = function () {
        return true;
    };
    BaseModel.COL_ID = 'id';
    BaseModel.COL_CREATED = 'created';
    BaseModel.COL_UPDATED = 'updated';
    BaseModel.COL_DELETED = 'deleted';
    return BaseModel;
})(AbstractModel);
module.exports = BaseModel;
//# sourceMappingURL=BaseModel.js.map
