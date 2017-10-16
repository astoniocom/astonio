import {Component, AfterViewInit, OnDestroy, ComponentRef, Injector, ViewContainerRef, ComponentFactoryResolver, ViewChild} from '@angular/core';
import {ICellEditorParams} from "ag-grid/main";
import {ICellEditorAngularComp} from "ag-grid-angular";
import {GridComponent} from './grid.component';


@Component({
  selector: 'ast-grid-edit-render-cell',
  template: `<ng-template #container></ng-template>`,
})
export class GridEditRenderCellComponent implements ICellEditorAngularComp, AfterViewInit, OnDestroy {
  grid:GridComponent;
  params:ICellEditorParams;
  component:any;
  componentParams: Object;
  componentRef:ComponentRef<any>;
  startWith: string;
  value:any;
  @ViewChild('container', {read: ViewContainerRef}) container:ViewContainerRef;

  constructor(private componentFactoryResolver:ComponentFactoryResolver, private injector:Injector) {
  }

  agInit(params:ICellEditorParams) {
    this.params = params;
    var editorParams = params.column.getColDef().cellEditorParams;
    this.grid = editorParams.grid;
    this.component = editorParams.component;
    this.componentParams = editorParams.componentParams;
  }

  ngAfterViewInit() {
      let factory = this.componentFactoryResolver.resolveComponentFactory(this.component);
      this.componentRef = this.container.createComponent<any>(factory, this.container.length, this.injector);
      if (this.componentParams)
        Object.assign(this.componentRef.instance, this.componentParams)
      if ('astGridInit' in this.componentRef.instance) {
        this.componentRef.instance.astGridInit(this.params);
      }
  }

  getValue():any {
    if (this.componentRef && 'getValue' in this.componentRef.instance)
      return this.componentRef.instance.getValue()
  }

  ngOnDestroy() {
    if (this.componentRef)
      this.componentRef.destroy();
  }
}
