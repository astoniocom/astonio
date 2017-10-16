import {BaseSorter} from './base';
import {Record} from '../../datatypes/record';

export class WeightSorter extends BaseSorter  {
  arrangeSupported = true;

  constructor(public colName:string) {
    super(colName);
  }

  normaliseOrderValues(records:Record[]):number {
    var colName = this.colName;
    var usedWeights:number[] = [];
    records.forEach(record => {
      if (usedWeights.indexOf(record[colName]) !== -1) // Избавляемся от дубликатов весов
        record[colName] = null;
      else if (!isNaN(parseInt(record[colName])))
        usedWeights.push(parseInt(record[colName]));
    });
    
    var minimalWeight = 0;
    
    records.forEach(record => {
      if (record[colName]==null) {
        while (usedWeights.indexOf(minimalWeight) !== -1) {
          minimalWeight++;
        }
        record[colName] = minimalWeight;
        usedWeights.push(minimalWeight);
        minimalWeight++;
      }
    });

    return usedWeights.length ? Math.max(...usedWeights) : -1;
  }

  protected _moveUp(records:Record[], recordsToMove:Record[]) {
    var colName = this.colName;
    this.normaliseOrderValues(records);
    
    var selection = [];
    recordsToMove.forEach(nextSelection => {
      selection[nextSelection[colName]] = nextSelection;
    }); 
    
    selection.forEach(record => {
      var nextRecord:Record=null;
      records.forEach(testRecord => {
        if (selection.indexOf(testRecord) !== -1 )
          return;
        if (testRecord[colName] < record[colName] && (!nextRecord || testRecord[colName] > nextRecord[colName])) 
          nextRecord = testRecord;
      });
      if (nextRecord)
        [record[colName], nextRecord[colName]] = [nextRecord[colName], record[colName]];
      
    });
  }

  protected _moveDown(records:Record[], recordsToMove:Record[]) {
    var colName = this.colName;

    this.normaliseOrderValues(records);
    
    var selection = [];
    recordsToMove.forEach(next_selection => {
      selection[next_selection[colName]] = next_selection;
    }); 
    
    
    selection.reverse().forEach(record => {
      var nextRecord:Record=null;
      records.forEach(testRecord => {
        if (selection.indexOf(testRecord) !== -1 )
          return;
        if (testRecord[colName] > record[colName] && (!nextRecord || testRecord[colName] < nextRecord[colName])) 
          nextRecord = testRecord;
      });
      if (nextRecord)
        [record[colName], nextRecord[colName]] = [nextRecord[colName], record[colName]];
      
    });
  }

  moveUp(records:Record[], recordsToMove:Record[], sort:string) {
    if (sort == 'asc')
      this._moveUp(records, recordsToMove);
    else if (sort == 'desc')
      this._moveDown(records, recordsToMove);
  }

  moveDown(records:Record[], recordsToMove:Record[], sort:string) {
    if (sort == 'asc')
      this._moveDown(records, recordsToMove);
    else if (sort == 'desc')
      this._moveUp(records, recordsToMove);
  }

  alterNewRecord(records:Record[], newRecords:Record[]) {
    var maxWeight = this.normaliseOrderValues(records) + 1;
    for (let record of newRecords) {
      record[this.colName] = maxWeight;
      maxWeight++;
    }
  }
}