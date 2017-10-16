import {Component, AfterViewInit, OnDestroy, ComponentRef, Injector, ViewContainerRef, ComponentFactoryResolver, OnInit,ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {ICellEditorParams} from "ag-grid/main";
import {ICellEditorAngularComp} from "ag-grid-angular";
import {BaseInputWidgetComponent} from '@astonio/ui';
import {GridComponent} from './grid.component';
import {Subscription} from 'rxjs';


@Component({
  selector: 'ast-grid-edit-input-cell',
  template: ` `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridEditInputCellComponent implements ICellEditorAngularComp, OnInit, OnDestroy {
  grid:GridComponent;
  params:ICellEditorParams;
  component:typeof BaseInputWidgetComponent;
  componentParams: Object;
  componentRef:ComponentRef<BaseInputWidgetComponent>;
  startWith: string;
  value:any;
  inputFinishedSubscription:Subscription;

  onCellKeyDown(event:KeyboardEvent):boolean|void {
    if (!this.componentRef || !this.componentRef.instance || !this.componentRef.instance.onContainerKeyDown)
      return true;
    return this.componentRef.instance.onContainerKeyDown(event);
  }

  constructor(private componentFactoryResolver:ComponentFactoryResolver, private injector:Injector, private vcr:ViewContainerRef) {
  }

  agInit(params:ICellEditorParams) {
    this.params = params;
    var editorParams = params.column.getColDef().cellEditorParams;
    this.grid = editorParams.grid;
    this.component = editorParams.component;
    this.componentParams = editorParams.componentParams;
    this.value = params.value;
    //this.ngOnInit();
    //console.log(params);
    //console.log(this.component); 
  }

  ngOnInit() {
    let factory = this.componentFactoryResolver.resolveComponentFactory(this.component);
    this.componentRef = this.vcr.createComponent<BaseInputWidgetComponent>(factory, this.vcr.length, this.injector);
    /*this.params.onKeyDown = ev => {
      console.log(ev);
    };*/
    if (this.componentParams)
      Object.assign(this.componentRef.instance, this.componentParams)
    if (this.params.charPress)
      this.componentRef.instance.startWithChar = this.params.charPress;
    if (this.params.keyPress)
      this.componentRef.instance.startWithKey = this.params.keyPress;
    if (this.params.node.data)
      this.componentRef.instance.data = this.params.node.data;
    //if (!this.params.charPress && !this.params.keyPress && this.componentRef.instance.setFocus) 
    this.componentRef.instance.focusAfterInit = true;
    this.componentRef.instance.hostContainer = this.params.eGridCell;

    this.componentRef.instance.value = this.params.value;
    if (this.componentRef.instance.registerOnChange) {
      this.componentRef.instance.registerOnChange(val => {
        this.value = val;
      })
    }
    if (this.componentRef.instance.finished) {
      this.inputFinishedSubscription = this.componentRef.instance.finished.subscribe(() => {
        this.params.stopEditing();
      })
    }
    if ('errors' in this.componentRef.instance) {
      var errors = this.grid.fieldErrors.get(this.params.node.data);
      if (errors && this.params.column.getColDef().field in errors) {
        this.componentRef.instance.errors = errors[this.params.column.getColDef().field];
      }
    }
    this.grid.renderCell.next({rowData: this.params.node.data, col: this.grid.getColByName(this.params.column.getColDef().field), componentRef:this.componentRef})
  }

  getValue() {
    return this.value;
  }

  ngOnDestroy() {
    if (this.componentRef)
      this.componentRef.destroy();
    if (this.inputFinishedSubscription)
      this.inputFinishedSubscription.unsubscribe();
  }
}
