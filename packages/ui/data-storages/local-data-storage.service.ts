import {Injectable} from '@angular/core';
import {BaseDataStorageService} from './base-data-storage.service';

@Injectable()
export class LocalDataStorageService extends BaseDataStorageService {
  get(key:string, _default?:any):any {
    var value = localStorage.getItem(key);

    if (value === null && _default !== undefined)
      return _default;

    try {
      value = JSON.parse(value);
    }
    catch (error){

    }

    return value;
  }

  set(key:string, value:any) {
    if (typeof value == "object") {
      value = JSON.stringify(value);
    }
    localStorage.setItem(key, value);
  }

  clear() {
      localStorage.clear();
      
  }

  remove(key:string) {
    localStorage.removeItem(key);
  }


}