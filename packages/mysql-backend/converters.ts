import {BaseField, DateTimeField, BaseDbField, BooleanField, DateField, NumberRangeField, DateRangeField, BaseBackend, BaseFieldParams} from '@astonio/core';
declare const Buffer;

export function fromRAWtoInternal(field:{new(backend:BaseBackend, fieldParams:BaseFieldParams): BaseField}, rawValue:any):any {
  if (field == DateField && typeof rawValue == "string") { // typeof rawValue == "string" -- because mysql library conver dates
    var tzOffset = (new Date()).getTimezoneOffset() * 60000;
    var dateWoTimezone = new Date(rawValue);
    return new Date(dateWoTimezone.getTime() + tzOffset);
  }
  if (field == DateTimeField && typeof rawValue == "string") { // typeof rawValue == "string" -- because mysql library conver dates
    return new Date(rawValue);
  }
  if (field == NumberRangeField) {
    if (rawValue == null)
      return null;
    else if (typeof rawValue == "string" && rawValue.split('|').length >= 1) { 
      var val1, val2
      [val1, val2] = rawValue.split('|');
      val1 = val1 && parseFloat(val1) !== NaN ? parseFloat(val1) : null;
      val2 = val2 && parseFloat(val2) !== NaN ? parseFloat(val2) : null;
      return [val1, val2]
    }
  }
  if (field == DateRangeField) {
    if (rawValue == null)
      return null;
    else if (typeof rawValue == "string" && rawValue.split('|').length >= 1) { 
      var val1, val2
      [val1, val2] = rawValue.split('|');
      //var tzOffset = (new Date()).getTimezoneOffset() * 60000; 
      var tzOffset = 0; 
      val1 = val1 && parseInt(val1) !== NaN ? new Date(parseInt(val1)+tzOffset) : null;
      val2 = val2 && parseInt(val2) !== NaN ? new Date(parseInt(val2)+tzOffset) : null;
      return [val1, val2]
    }
  }
  if (field == BooleanField) {
    if ((rawValue instanceof Buffer && rawValue.length === 0) || rawValue === null) {
      return null;
    }
    else if (rawValue instanceof Buffer && rawValue[0] === 1)
      return true;
    else if (rawValue instanceof Buffer && rawValue[0] === 0)
      return false;
    else
      throw new Error('Wrong boolean value');

  }
  return rawValue;
}

export function fromInternalToRAW(internalValue:any, field?:typeof BaseField):any {
  if (field == BooleanField) {
    if (internalValue === true)
      return 1;
    else if (internalValue === false)
      return 0;
    else if (internalValue === null)
      return null;
    else
      throw new Error('Wrong boolean value');
  }

  if (field == NumberRangeField) {
    if (internalValue == null)
      return null;
    else if (internalValue instanceof Array && internalValue.length == 2) {
      var saveStr = '';
      if (internalValue[0])
        saveStr += internalValue[0];
      saveStr += '|';
      if (internalValue[1])
        saveStr += internalValue[1];
      return saveStr;
    }
    else
      throw new Error('NumberRangeField');
  }

    if (field == DateRangeField) {
      if (internalValue == null)
        return null;
      else if (internalValue instanceof Array && internalValue.length == 2) {
        //var tzOffset = (new Date()).getTimezoneOffset() * 60000; 
        var saveStr = '';
        if (internalValue[0])
          saveStr += internalValue[0].getTime();
        saveStr += '|';
        if (internalValue[1])
          saveStr += internalValue[1].getTime();
        return saveStr;
      }
      else
        throw new Error('DateRangeField1');
    }

  if (internalValue instanceof Date) {
    return internalValue.getFullYear() + '-' +
      ('00' + (internalValue.getMonth()+1)).slice(-2) + '-' +
      ('00' + internalValue.getDate()).slice(-2) + ' ' + 
      ('00' + internalValue.getHours()).slice(-2) + ':' + 
      ('00' + internalValue.getMinutes()).slice(-2) + ':' + 
      ('00' + internalValue.getSeconds()).slice(-2);
  }
  return internalValue;
} 