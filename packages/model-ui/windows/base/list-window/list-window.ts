import {Window, WindowConstructorParams, WindowsManager} from '@astonio/ui';
import {ListWindowComponent} from './list-window.component';
import {ListModel, Record, Backend} from '@astonio/core';
import {Subject} from 'rxjs';

export interface ListWindowConstructorParams<C extends ListWindowComponent> extends WindowConstructorParams<C> {
  list?:ListModel;
  choice?:"single"|"multiple";
}

export class ListWindow<C extends ListWindowComponent, PC> extends Window<C, PC> implements ListWindowConstructorParams<C> {
  backend:Backend;
  list:ListModel;
  choice:"single"|"multiple";
  chosen:Subject<Record[]>;
  
  
  get title():string {
    return this._title || `List: ${this.list}`;
  }

  constructor(windowsManager: WindowsManager, parentWindow:Window<PC, any>, params:ListWindowConstructorParams<C>) {
    if (!params.name)
      params.name = `${params.list.name}-list-window`

    super(windowsManager, parentWindow, params);
  }

  init() {
    this.backend = this.injector.get(Backend);
    this.componentRef.instance.list = this.list;
    this.componentRef.instance.choice = this.choice;
    this.chosen = this.componentRef.instance.chosen;
  }

  setList(listModel:ListModel) {
    this.componentRef.instance.list = listModel;
  }
}