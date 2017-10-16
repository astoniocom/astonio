import {Observable} from 'rxjs';
import {Record, RelatedRecords} from '@astonio/core';

export function cloneRecordWithRelated(record:Record, asNew=true):Observable<Record> {
  var relatedFields:string[] = [];

  for (let field of record.__director__.model.fields) {
    if (record[field.name] instanceof RelatedRecords) {
      relatedFields.push(field.name);
    }
  }

  return record.__director__.getData(true, ...relatedFields).map(record => {
    var clonedRecord = record.__director__.clone(true, asNew, false);

    for (let field of record.__director__.model.fields) {
      if (record[field.name] instanceof RelatedRecords) {
        for (let nextRelatedRecord of (record[field.name] as RelatedRecords).items) {
          (clonedRecord[field.name] as RelatedRecords).add(nextRelatedRecord.__director__.clone(true, asNew, false));
        }
      }
    };
    clonedRecord.__director__.removeChangedStatus();
    return clonedRecord;
  })
}