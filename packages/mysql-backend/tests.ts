import {SqlBackend} from './backend';
import {Record, RelatedRecords} from '@astonio/core';
import 'mocha';
//import 'assert';
var assert = require('assert');

var dbBackend:SqlBackend;
var flowModel;
var productModel;
var firstModel;



describe('Backend', () => {
  it('should create backend', (done) => {
    dbBackend = new SqlBackend({url: 'http://127.0.0.1:8080/datasource/'});
    done();
  });
  it('shoul wait for bootstrap', (done) => {
    dbBackend.bootstrap().subscribe(() => {
      done();
    });
  });
  it('shoul return a RecordModel', (done) => {
    var mapIter = dbBackend.recordModels.keys();
    firstModel = dbBackend.getModel(mapIter.next().value);
    done();
  });
  var remainsTableModel;
  it('should return "remains" view model', (done) => {
    remainsTableModel = dbBackend.getTable('remains');
    done();
  });
  it('should return rows of "remains" view', (done) => {
    remainsTableModel.objects.getRows().subscribe(rows => {
      done();
    });
  });
  var flowTableModel;
  it('should return "flow" table model', (done) => {
    flowTableModel = dbBackend.getTable('flow');
    done();
  });
  var flowTableRecords;
  it('should return records of "flow" table', (done) => {
    flowTableModel.objects.getRows().subscribe(records => {
      flowTableRecords = records;
      done();
    });
  });
  var flowTableRecord:Record;
  it('should return record of "flow" table', (done) => {
    flowTableRecord = flowTableRecords[0];
    done();
  });
  var flowTableRecordData:Record;
  it('should return record data of "flow" record', (done) => {
    flowTableRecord.getData().subscribe(recordData => {
      flowTableRecordData = recordData;
      done();
    });
  });
  it('should set a new virtual value to "flow" record data', (done) => {
    flowTableRecordData['flow__product'] = dbBackend.getModel('product').constructRecord(false, {id:2, name:'Блок питания 200 Вт'});
    flowTableRecordData['flow__product'] = null;
    done();
  });
  var productTableModel;
  it('should return "product" table model', (done) => {
    productTableModel = dbBackend.getTable('product');
    done();
  });
  var productTableRecords:Record[];
  it('should return records of "product" table', (done) => {
    productTableModel.objects.getRows().subscribe(records => {
      productTableRecords = records;
      done();
    });
  });
  var productTableRecord:Record;
  it('should return record of "product" table', (done) => {
    productTableRecord = productTableRecords[0];
    done();
  });
  var productTableRecordData:Record;
  it('should return record data of "product" table record', (done) => {
    productTableRecord.getData().subscribe(recordData => {
      productTableRecordData = recordData;
      done();
    });
  });
  it('should return related records of "product" table record', (done) => {
    (productTableRecordData['flow__product_set'] as RelatedRecords).getRecords().subscribe(result => {
      done();
    });
  });
  it('should return state data of "product" table record', (done) => {
     var stateRecordData = productTableRecordData.extractStateData();
     done();
  });
  it('should construct and load "product" record', (done) => {
    dbBackend.getModel('product').constructRecord(false, {id:2}).getData().subscribe(recordData => {
      done();
    });
  });
  var loadedFlowProduct:Record;
  it('should construct and load "flow" record', function (done) {
    dbBackend.getModel('flow').constructRecord(false, {id:26}).getData('flow__product').subscribe(record => {
      loadedFlowProduct = record;
      done();
    });
  });
  var recordWithChildren:Record;
  it('should load record with its children', function (done) {
    dbBackend.getModel('product').constructRecord(false, {id:1}).getData('flow__product_set__flow__product__flow__product_set').subscribe(record => {
      recordWithChildren = record;
      //assert.equal(true, (record['flow__product_set']['data'][0]['flow__product']['flow__product_set'] as RelatedRecords).loaded);
      done();
    });
  });
  it('should save record and return the record with child fields', function (done) {
    recordWithChildren.save().subscribe(res => {
      assert.equal(true, (res['flow__product_set']['data'][0]['flow__product']['flow__product_set'] as RelatedRecords).isLoaded);
      done();
    }, error =>{
      done(error);
    });
  });
  it('should raise an error because of adding to child related record not existing record', function (done) {
    recordWithChildren['flow__product_set']['data'][0]['flow__product'] = dbBackend.getModel('product').constructRecord(false, {id:2, name:'error'});
    recordWithChildren.save().subscribe(res => {
      assert.equal(true, false);
    }, error =>{
      done();
    });
  });

  var newRecord:Record;
  it('should add related records to new record and save it', function (done) {
    newRecord = dbBackend.getModel('product').constructRecord(true, {name:"test"+Math.random()});
    newRecord.getData().subscribe(recordData => {
      var recordToAdd1 = dbBackend.getModel('flow').constructRecord(true);
      //var recordToAdd2 = dbBackend.getModel('flow').constructRecord(true);
      (recordData['flow__product_set'] as RelatedRecords).add(recordToAdd1);
      //(recordData['flow__product_set'] as RelatedRecords).add(recordToAdd2);
      assert.equal(1, (recordData['flow__product_set'] as RelatedRecords).items.length);
      newRecord.save().subscribe(res => {
        done();
      }, error =>{
        done(error);
      });
      
    });
  });
  it('should remove related record from new record and save it', function (done) {
    newRecord.getData().subscribe(recordData => {
      var flow__product_set = (recordData['flow__product_set'] as RelatedRecords);
      flow__product_set.remove(flow__product_set.items[flow__product_set.items.length-1]);
      assert.equal(0, flow__product_set.items.length);  
      newRecord.save().subscribe(res => {
        done();
      }, error =>{
        done(error);
      });
    });
  });
  it('should delete new record', function (done) {
    newRecord.delete().subscribe(() => {
      done();
    });
  });
  it('should change foreign-key field value and save the record', function (done) {
    dbBackend.getModel('product').constructRecord(false, {id:2}).getData().subscribe(r => {
      loadedFlowProduct['flow__product'] = r;
      loadedFlowProduct.save().subscribe(res => {
        dbBackend.getModel('product').constructRecord(false, {id:1}).getData().subscribe(r => {
          loadedFlowProduct['flow__product'] = r;
          loadedFlowProduct.save().subscribe(res => {
            done();
          }, error =>{
            done(error);
          });
        });
      }, error =>{
        done(error);
      });
    });
  });


  it('test', (done) => {
    done();
  });
})

/**
 * Реализовать Global record event
 * Подумать как реализовать не RelatedRecords list
 * Нужны ли отдельные модели для таблиц и для записей?
 * ContentTypes
 * Приминительно к ezdim.by и знанио
 * 
 * 
 * в query реализовать функции contains icontains и т.д., ordering
 * Вопросы:
 * Конвертирование полей в рав из рава. Для модели и для поиска. В какие моменты это делать. Где должен быть этот функционал
 */