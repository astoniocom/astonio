import {Component,ChangeDetectorRef, AfterViewInit, OnInit, Input, Output, ViewChild, ViewContainerRef, ComponentRef,
  ComponentFactoryResolver, Injector, OnDestroy, Optional, EventEmitter} from '@angular/core';
import {WindowComponent, Window, WindowsManager} from '@astonio/ui';
import {Condition, Query, Where, Lookup, Q, Col, Connector, BaseDbField, BaseField} from '@astonio/core';
import { Subscription, Observable} from 'rxjs';
import {BaseInputWidgetComponent, TextInputWidgetComponent} from '@astonio/ui';
import {FilterWindow} from '../../windows/filter-window/filter-window';
import {WidgetsRegister} from '../../services/widgets-register/widgets-register.service';


@Component({
  selector: 'ast-query-where-from',
  templateUrl: './query-where-form.html',
  //styleUrls: ['./query-where-form.css']
})
export class QueryWhereFormComponent implements OnInit, OnDestroy {
  @Input() query:Query;
  @Input() where:Where;
  @ViewChild('valueContainer', {read: ViewContainerRef}) valueContainerVcr: ViewContainerRef;
  newConditionInputComponentRef:ComponentRef<BaseInputWidgetComponent>;
  newConditionInputValue:any;

  //@Output() queryChanged:EventEmitter<Query> = new EventEmitter();
  isWhereChanged = false; // TODO false

  criteriaToAdd:BaseDbField|string;
  lookupToAdd:typeof Lookup;
  filterWnd:FilterWindow<any, any>;

  filterChangedSubscription:Subscription;
  filterWndClosedSubscription:Subscription;

  notSupportedLookup = false;

  connectors = [
    [Connector.AND, 'AND'],
    [Connector.OR, 'OR'],
  ]

  constructor(protected cdr:ChangeDetectorRef, protected vcr:ViewContainerRef, protected componentFactoryResolver:ComponentFactoryResolver,
    protected injector:Injector, @Optional() protected parentWnd:Window<any,any>, private wm:WindowsManager, protected widgetsRegister:WidgetsRegister){
  }

  ngOnInit() {
  }

  removeCondition(condition:Where|Lookup) {
    var pos = this.where.children.indexOf(condition);
    if (pos == -1)
      return;
 
    this.isWhereChanged = true;
    this.where.children.splice(pos, 1);
    this.cdr.detectChanges();
  }

  conditionInstanceOfWhere(condition:Where|Lookup) {
    return condition instanceof Where;
  }

  getCriterias():(BaseDbField|string)[] {
    var result:(BaseDbField|string)[] = [];
    result.push(...this.query.model.getDbFields());
    result.push('where');
    return result;
  }

  getColRepr(col:BaseDbField|string):string {
    return (typeof col == 'string') ? '< Sub condition >' : col.verboseName;
  }

  onColumnChanged() {
    this.lookupToAdd = undefined;
    this.clearCondition();
    if (this.criteriaToAdd instanceof BaseDbField && this.criteriaToAdd.lookups.length) {
      this.lookupToAdd = this.criteriaToAdd.lookups[0];
      this.onLookupChanged();
    }
    
    this.cdr.detectChanges();
  }

  onLookupChanged() {
    this.clearCondition();
    this.cdr.detectChanges();
    this.notSupportedLookup = false;
    setTimeout(() => {
      try {
        var componentInfo = this.widgetsRegister.getInputWidget(this.query.model, this.criteriaToAdd as BaseDbField, 'ast-query-where-from', {lookup: this.lookupToAdd});
      }
      catch (e) {
        this.notSupportedLookup = true;
        this.cdr.detectChanges();
      }
      if (componentInfo) {
        let factory = this.componentFactoryResolver.resolveComponentFactory(componentInfo.component);
        this.newConditionInputComponentRef = this.valueContainerVcr.createComponent<BaseInputWidgetComponent>(factory, this.valueContainerVcr.length, this.injector);
        if (componentInfo.componentParams)
          Object.assign(this.newConditionInputComponentRef.instance, componentInfo.componentParams)
        this.newConditionInputComponentRef.instance.value = (this.criteriaToAdd as BaseField).getEmptyValue();
        this.newConditionInputComponentRef.instance.registerOnChange(val => {
          this.newConditionInputValue = val;
        })
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    if (this.newConditionInputComponentRef)
      this.newConditionInputComponentRef.destroy();
  }

  onAddConditionClicked() {
    if (this.criteriaToAdd instanceof BaseDbField) {
      //var filter = {};
      //filter[this.criteriaToAdd.name + '__' + this.lookupToAdd.prototype.lookupName] = this.newConditionInputValue;
      this.where.children.push(new this.lookupToAdd(new Col(this.query.model.name, this.criteriaToAdd), this.newConditionInputValue));
    }
    else {
      this.where.children.push(new Where());
    }
    this.clearNewConditionForm();
    this.cdr.detectChanges();
    this.isWhereChanged = true;
  }

  clearCondition() {
    if (this.criteriaToAdd instanceof BaseDbField) {
      this.newConditionInputValue = this.criteriaToAdd.getEmptyValue();
    }
    else
      this.newConditionInputValue = null;
    if (this.newConditionInputComponentRef) {
      this.newConditionInputComponentRef.destroy();
      this.newConditionInputComponentRef = undefined;
    }
  }

  clearNewConditionForm() {
    this.criteriaToAdd = undefined;
    this.lookupToAdd = undefined;
    this.clearCondition();
  }

  onChangedCondition() {
    this.isWhereChanged = true;
  }

  getCriteriaType(criteria:BaseDbField|string):string {
    if (criteria instanceof BaseDbField)
      return 'field';
    else if (typeof criteria == 'string')
      return 'where'
    return '';
  }

  editSubWhere(where:Where) {
    var closeSubscription:Observable<boolean>;
    if (this.filterWnd && !this.filterWnd.isClosed)
      closeSubscription = this.filterWnd.close();
    else
      closeSubscription = Observable.of(true);

    closeSubscription.subscribe(() => {
      this.filterWnd = new FilterWindow(this.wm, this.parentWnd, {componentParams: {query:this.query, initWhere: where}});
      this.filterWnd.componentRef.changeDetectorRef.detectChanges();

      this.filterChangedSubscription = this.filterWnd.componentRef.instance.whereChanged.subscribe((newWhere) => {
        var pos = this.where.children.indexOf(where);
        if (pos !== -1) {
          this.where.children[pos] = newWhere;
          this.isWhereChanged = true;
          this.cdr.detectChanges();
        }
      });

      this.filterWndClosedSubscription = this.filterWnd.closed.subscribe(() => {
        if (this.filterChangedSubscription) 
          this.filterChangedSubscription.unsubscribe();
        this.filterChangedSubscription = null;

        if (this.filterWndClosedSubscription)
          this.filterWndClosedSubscription.unsubscribe();
        this.filterWndClosedSubscription = null;
      });
    });


  }

}