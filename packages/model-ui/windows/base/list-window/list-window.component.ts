import {Input, OnInit, Output} from '@angular/core';
import {ListModel, QuerySet, Record} from '@astonio/core';
import {WindowComponent} from '@astonio/ui';
import {Subject} from 'rxjs';

export class ListWindowComponent extends WindowComponent implements OnInit{
  @Input() list:ListModel;
  @Input() choice:"single"|"multiple";
  @Output() chosen:Subject<Record[]> = new Subject<Record[]>();
  queryset:QuerySet;
  

  ngOnInit() {
    this.queryset = this.list.getQueryset();
  }
}