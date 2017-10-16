import {SqlBackend} from './backend';
import {RelatedRecords} from '@astonio/core';
import {Observable} from 'rxjs';

var dbBackend = new SqlBackend({url: 'http://127.0.0.1:8080/datasource/'});

dbBackend.bootstrap().subscribe(() => {
  //var record = dbBackend.getModel('cource').constructRecord({date:new Date(), rate:4}, true);
  var record = dbBackend.getModel('product').constructRecord(false, {id:1})
  record.getData('flow__product_set').subscribe(recordData => {
    var flow__product_set = (recordData['flow__product_set'] as RelatedRecords);
    /*flow__product_set.items[flow__product_set.items.length-1].delete().subscribe(() => {
      
    })*/
    var recordToAdd1 = dbBackend.getModel('flow').constructRecord(true, {qty:11});
    var recordToAdd2 = dbBackend.getModel('flow').constructRecord(true, {qty:2});
    flow__product_set.add(recordToAdd1, recordToAdd2);
    record.save().subscribe(e => {
      var r=1;
    }, ee => {
      var e=2;
    });
  });
  
  /*dbBackend.getTable('flow').objects.getRows().subscribe(rows=>{
    var e=1;
  });*/
  /*var record = dbBackend.getModel('product').constructRecord(false, {id:1})
  record.getData('flow__product_set').subscribe(recordData => {
    var flow__product_set = (recordData['flow__product_set'] as RelatedRecords);
    flow__product_set.items[flow__product_set.items.length-1]['type'] = '1234123412341234';
    /*
    flow__product_set.remove(flow__product_set.data[flow__product_set.data.length-1]);
    var recordToAdd1 = dbBackend.getModel('flow').constructRecord(true, {qty:1});
    var recordToAdd2 = dbBackend.getModel('flow').constructRecord(true, {qty:2});
    flow__product_set.add(recordToAdd1);
    flow__product_set.add(recordToAdd2);
    recordData['name'] = 'Новое название продукта'+Math.random();
    */
    /*record.save().subscribe(e=>{
      var eee=1;
    });*/

  //});
  /*var record = dbBackend.getModel('product').constructRecord(true);
  record.getData().subscribe(recordData => {
    var recordToAdd1 = dbBackend.getModel('flow').constructRecord(true);
    var recordToAdd2 = dbBackend.getModel('flow').constructRecord(true);
    
    (recordData['flow__product_set'] as RelatedRecords).remove(recordToAdd1);
    // Добавить rel, удалить rel
    record.save();
  });*/
});