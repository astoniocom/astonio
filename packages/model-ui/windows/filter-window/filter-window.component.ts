import {Component,Injector, AfterViewInit, OnInit, ViewChild, EventEmitter, Output} from '@angular/core';
import {WindowComponent} from '@astonio/ui';
import {Condition, Query, Where, Lookup} from '@astonio/core';
//!!import {QueryWhereFormComponent} from '../../controls/query-where-form/query-where-form.component'; // to prevent circular dependency error

import {Subject} from 'rxjs';

@Component({
  templateUrl: './filter-window.html',
  inputs: ['initWhere:where', 'query'],
//  styleUrls: ['./filter-window.css']
})
export class FilterWindowComponent extends WindowComponent implements OnInit {
  @ViewChild('whereForm') whereForm:any; //!!QueryWhereFormComponent // to prevent circular dependency error
  @Output() stick = new EventEmitter<void>();
  query:Query;
  initWhere:Where;
  workWhere:Where;
  whereChanged:Subject<Where> = new Subject();
  isQueryChanged = true; // TODO false
  showStickButton:boolean = false;

  constructor(injector:Injector){
    super(injector);
  }

  ngOnInit() {
    if (this.initWhere)
      this.workWhere = this.initWhere.clone();
  }

  ok() {
    if (this.whereForm.isWhereChanged)
      this.whereChanged.next(this.workWhere);
    this.wnd.close().subscribe();
  }

  cancelFilter() {
    /*var conditionChanged = false;
    for (let key in this.condition) {
      delete this.condition[key];
      conditionChanged = true;
    } 

    if (conditionChanged) 
      this.conditionChanged.next(this.condition);
    this.wnd.close().subscribe();*/
  }

  onStickButtonClick() {
    this.stick.next();
  }
}