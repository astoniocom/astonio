import {Injectable} from '@angular/core';
import {ListModel, RecordModel, Record, BaseModel, Backend} from '@astonio/core';
import {ListWindow, ListWindowConstructorParams} from '../../windows/base/list-window/list-window';
import {ListWindowComponent} from '../../windows/base/list-window/list-window.component';
import {RecordWindow, RecordWindowConstructorParams} from '../../windows/base/record-window/record-window';
import {RecordWindowComponent} from '../../windows/base/record-window/record-window.component';
import {CommonListWindow} from '../../windows/common-list-window/common-list-window';
import {CommonRecordWindow} from '../../windows/common-record-window/common-record-window';
import {Window, WindowsManager, DialogService} from '@astonio/ui';
import {Observable} from 'rxjs';
import {AstonioModelUIConfigService} from '../../services/config/config.service';

export type ListWindowDescriber = {
  window: typeof ListWindow, 
  windowOptions:ListWindowConstructorParams<any>, 
  name:string,
  list: boolean, 
  choise: boolean, 
  listDefault:boolean, 
  choiseDefault:boolean,
}

export type RecordWindowDescriber = {
  window: typeof RecordWindow, 
  windowOptions:RecordWindowConstructorParams<any>, 
  name:string,
  default:boolean,
}

@Injectable()
export class ModelWindowsDispatcher {
  listWindows:Map<string, ListWindowDescriber[]> = new Map();
  recordWindows:Map<string, RecordWindowDescriber[]> = new Map();

  constructor(public wm:WindowsManager, private ds:DialogService, private backend:Backend, private config:AstonioModelUIConfigService ) {
    
  } 

  protected getSelector(model:BaseModel|string):string {
    if (model instanceof BaseModel)
      return model.name;
    else if (typeof model == "string")
      return model;
    else 
      throw new Error("Unsupported argument type");
  }

  getListWindows(listModel:ListModel|string, isChoise=false, allWindows=false):ListWindowDescriber[] {
    var modelName = this.getSelector(listModel);
    var availableWindows = ( this.listWindows.get(modelName) || [] ).reverse();

    var suitableWindows:ListWindowDescriber[] = [];
    for (let nextWnd of availableWindows) {
      if ((nextWnd.listDefault && !isChoise) || (nextWnd.choiseDefault && isChoise)) {
        suitableWindows.push(nextWnd);
      }
    }

    if (suitableWindows.length == 0 || allWindows ) {
      for (let nextWnd of availableWindows) {
        if ((nextWnd.list && !isChoise && !nextWnd.listDefault) || (nextWnd.choise && isChoise && !nextWnd.choiseDefault) ) {
          suitableWindows.push(nextWnd);
        }
      } 
    }

    if (suitableWindows.length == 0 || allWindows) {
      var commonListWindowDescriber:ListWindowDescriber = {
        window: CommonListWindow,
        windowOptions: this.config.getListWindowConfig(modelName),
        name: '<AutogeneratedWindow>',
        list: true,
        choise: true,
        listDefault: false,
        choiseDefault: false,
      };
      
      suitableWindows.push(commonListWindowDescriber);
    }
    return suitableWindows;

  }

  getChoiseListWindow(listModel:ListModel|string):ListWindowDescriber[] {
    return this.getListWindows(listModel, true);
  }

  getListListWindow(listModel:ListModel|string):ListWindowDescriber[] {
    return this.getListWindows(listModel, false);
  }

  getRecordWindows(recrodModel:string|RecordModel, allWindows=false):RecordWindowDescriber[] {
    var modelName = this.getSelector(recrodModel);
    var availableWindows = (this.recordWindows.get(modelName) || []).reverse();
    var suitableWindows:RecordWindowDescriber[] = [];

    for (let nextWnd of availableWindows) {
      if (nextWnd.default)
        suitableWindows.push(nextWnd);
    }

    if (suitableWindows.length == 0 || allWindows) {
      for (let nextWnd of availableWindows) {
        if (!nextWnd.default)
          suitableWindows.push(nextWnd);
      } 
    }

    if (suitableWindows.length == 0 || allWindows) {
      var commonRecordWindowDescriber:RecordWindowDescriber = {
        window: CommonRecordWindow,
        windowOptions: this.config.getRecordWindowConfig(modelName),
        name: '<AutogeneratedWindow>',
        default: false,
      }
      suitableWindows.push(commonRecordWindowDescriber);
    }

    return suitableWindows;
  }

  getListWindow<PC, PPC>(listModel:ListModel|string, isChoise=false, parentWnd?:Window<PC, PPC>, allWindows=false):Observable<ListWindowDescriber> {
    var availableWindows = this.getListWindows(listModel, isChoise, allWindows);
    if (availableWindows.length == 0) {
      return Observable.of(null);
    }
    else if (availableWindows.length == 1) {
      return Observable.of(availableWindows[0]);
    }
    else {
      var choices:{value:ListWindowDescriber, default?:boolean, text:string}[] = [];
      for (let nextWnd of availableWindows) {
        choices.push({text: nextWnd.name, value:nextWnd, default:(isChoise && nextWnd.choiseDefault) || (!isChoise && nextWnd.listDefault)});
      }
      return this.ds.choice(parentWnd, choices);
    }
  }

  getRecordWindow<PC, PPC>(recrodModel:string|RecordModel, parentWnd?:Window<PC, PPC>, allWindows=false):Observable<RecordWindowDescriber> {
    var availableWindows = this.getRecordWindows(recrodModel, allWindows);
    if (availableWindows.length == 0) {
      return Observable.of(null);
    }
    else if (availableWindows.length == 1) {
      return Observable.of(availableWindows[0]);
    }
    else {
      var choices:{value:RecordWindowDescriber, default?:boolean, text:string}[] = [];
      for (let nextWnd of availableWindows) {
        choices.push({text: nextWnd.name, value:nextWnd, default:nextWnd.default});
      }
      return this.ds.choice(parentWnd, choices);
    }
  }

  registerListWindow(opts:{listModel:string|ListModel, window:typeof ListWindow, windowOptions?:ListWindowConstructorParams<any>, name?:string, list?:boolean, choise?:boolean, listDefault?:boolean, choiseDefault?:boolean}) {
    if (opts.list == undefined)
      opts.list = true;
    if (opts.choise == undefined)
      opts.choise = true;
    if (opts.listDefault == undefined)
      opts.listDefault = true;
    if (opts.choiseDefault == undefined)
      opts.choiseDefault = true;
    if (opts.name == undefined)
      opts.name = opts.window.name;
      

    if (opts.windowOptions == undefined)
      opts.windowOptions = {};
    var modelName = this.getSelector(opts.listModel);
    var wndConstructors = this.listWindows.get(modelName) || [];

    for (let constructor of wndConstructors) {
      constructor.listDefault = opts.listDefault ? false : constructor.listDefault;
      constructor.choiseDefault = opts.choiseDefault ? false : constructor.choiseDefault;
    }

    wndConstructors.push({
      window: opts.window,
      windowOptions: opts.windowOptions,
      name: opts.name,
      list: opts.list,
      choise: opts.choise,
      listDefault: opts.listDefault,
      choiseDefault: opts.choiseDefault,
    });

    this.listWindows.set(modelName, wndConstructors);
  }

  registerRecordWindow(opts:{recordModel:string|RecordModel, window:typeof RecordWindow, name?:string, windowOptions?:RecordWindowConstructorParams<any>, default?:boolean}) {
    if (opts.default == undefined)
      opts.default = true;
    if (opts.name == undefined)
      opts.name = opts.window.name;
    if (opts.windowOptions == undefined)
      opts.windowOptions = {};

    var modelName = this.getSelector(opts.recordModel);
    var wndConstructors = this.recordWindows.get(modelName) || [];

    for (let constructor of wndConstructors) {
      constructor.default = opts.default ? false : constructor.default;
    }

    wndConstructors.push({
      window: opts.window,
      name: opts.name,
      windowOptions: opts.windowOptions,
      default: opts.default,
    });

    this.recordWindows.set(modelName, wndConstructors);
  }
}