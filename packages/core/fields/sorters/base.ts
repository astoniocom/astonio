import {ListRow} from '../../datatypes/list-row';
import {Record} from '../../datatypes/record';

export class BaseSorter {
  arrangeSupported = false;
  comparisionSupported = false;
  
  constructor(public colName:string) {

  }

  moveUp (records:Record[], recordsToMove:Record[], sort:string) {

  }

  moveDown (records:Record[], recordsToMove:Record[], sort:string) {

  }

  comparator (valueA:any, valueB:any, rowA:ListRow, rowB:ListRow) {

  }

  alterNewRecord(records:Record[], newRecords:Record[]) {

  }
}