import {Component, AfterViewInit, OnDestroy, ComponentRef, Injector, ViewContainerRef, ChangeDetectionStrategy, ComponentFactoryResolver, ViewChild, OnInit} from '@angular/core';
import {ICellRendererParams} from "ag-grid/main";
import {ICellRendererAngularComp} from "ag-grid-angular";
import {BaseInputWidgetComponent} from '@astonio/ui';
import {GridComponent} from './grid.component';

@Component({
  selector: 'ast-grid-view-input-cell',
  template: '<div #container></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridViewInputCellComponent implements ICellRendererAngularComp, OnInit, OnDestroy {
  errors: string[];
  grid:GridComponent;
  public params: ICellRendererParams;
  component:typeof BaseInputWidgetComponent;
  componentParams: Object;
  componentRef:ComponentRef<BaseInputWidgetComponent>;
  value:any;
  @ViewChild('container', {read: ViewContainerRef}) vcr:ViewContainerRef;

  constructor(private componentFactoryResolver:ComponentFactoryResolver, private injector:Injector) {
  }

  agInit(params: ICellRendererParams): void {
    this.params = params;
    var rendererParams = params.column.getColDef().cellRendererParams;
    this.grid = rendererParams.grid;
    
    this.component = rendererParams.component;
    this.componentParams = rendererParams.componentParams;
    this.value = params.value;
    this.errors = this.getErrors();
    if (this.errors && this.errors.length) {
      if (params.eGridCell.className.indexOf(" ast-grid-error-cell") == -1)
        params.eGridCell.className += " ast-grid-error-cell";
    }
    else {
      params.eGridCell.className = params.eGridCell.className.replace(" ast-grid-error-cell", "");
    }
    //this.generate();
  }

  getErrors() {
    var errors = this.grid.fieldErrors.get(this.params.data);
    if (errors && this.params.colDef.field in errors) {
      return errors[this.params.colDef.field];
    }
    return [];
  }

  ngOnInit() {
    if (this.params.data === undefined)
      return;
    let factory = this.componentFactoryResolver.resolveComponentFactory(this.component);
    this.componentRef = this.vcr.createComponent<BaseInputWidgetComponent>(factory, this.vcr.length, this.injector);
    if (this.componentParams)
      Object.assign(this.componentRef.instance, this.componentParams)
    if (this.params.node.data)
      this.componentRef.instance.data = this.params.node.data;
    this.componentRef.instance.value = this.params.value;
    if (this.componentRef.instance.registerOnChange) {
      this.componentRef.instance.registerOnChange(val => {
        this.params.data[this.params.colDef.field] = val;
      })
    }
    if ('errors' in this.componentRef.instance && this.errors && this.errors.length) {
      this.componentRef.instance.errors = this.errors;
    }
    this.grid.renderCell.next({rowData: this.params.node.data, col: this.grid.getColByName(this.params.column.getColDef().field), componentRef:this.componentRef});
  }

  ngOnDestroy() {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
  }

}