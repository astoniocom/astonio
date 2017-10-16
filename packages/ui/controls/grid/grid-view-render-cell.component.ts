import {Component, AfterViewInit, OnDestroy, ComponentRef, Injector, ViewContainerRef, ComponentFactoryResolver, ViewChild} from '@angular/core';
import {ICellRendererParams} from "ag-grid/main";
import {ICellRendererAngularComp} from "ag-grid-angular";
import {GridComponent} from './grid.component';

@Component({
  selector: 'ast-grid-view-render-cell',
  template: `<ng-template #container></ng-template>`,
})
export class GridViewRenderCellComponent implements ICellRendererAngularComp, AfterViewInit, OnDestroy {
  grid:GridComponent;
  params:ICellRendererParams;
  component:any;
  componentParams: Object;
  componentRef:ComponentRef<any>;
  value:any;
  @ViewChild('container', {read: ViewContainerRef}) container:ViewContainerRef;

  constructor(private componentFactoryResolver:ComponentFactoryResolver, private injector:Injector) {
  }

  agInit(params:ICellRendererParams) {
    this.params = params;
    var rendereParams = params.column.getColDef().cellRendererParams;
    this.grid = rendereParams.grid;
    this.component = rendereParams.component;
    this.componentParams = rendereParams.componentParams;
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

  ngOnDestroy() {
    if (this.componentRef)
      this.componentRef.destroy();
  }
}
