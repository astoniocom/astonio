import {Component, Input, Type, AfterViewInit, ViewChild, OnInit, ChangeDetectorRef, Output, EventEmitter, ComponentRef} from '@angular/core';
import {GridOptions as AgGridOptions, ColDef as AgGridColDef, RowNode as AgGridRowNode, RenderedCell, RenderedRow} from "ag-grid/main";
import {AgGridNg2} from "ag-grid-angular";
import { GridEditInputCellComponent} from './grid-edit-input-cell.component';
import { GridViewInputCellComponent} from './grid-view-input-cell.component';
import { GridEditRenderCellComponent} from './grid-edit-render-cell.component';
import { GridViewRenderCellComponent} from './grid-view-render-cell.component';
import { GridStatusRendererCellComponent } from './grid-status-renderer-cell.component'
//import {GridOptions as AgGridOptions, GridApi, RowNode, Constants as AgGridConstants, EventService as AgGridEventService, Events as GridEvents, GridCell as AgGridCell, FocusedCellController, Column as GridColumb} from 'ag-grid/main';
// import {ntService, Events as GridEvents, GridCell as AgGridCell, FocusedCellController, Column as GridColumb} from 'ag-grid/main';



(RenderedCell as any).PRINTABLE_CHARACTERS = (RenderedCell as any).PRINTABLE_CHARACTERS+'ёйцукенгшщзхъфывапролджэячсмитьбюЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ';

var oldOnRowClick = (RenderedRow as any).prototype.onRowClick;
(RenderedRow as any).prototype.onRowClick = function (event) {
  if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
    this.gridOptionsWrapper.gridOptions.suppressRowClickSelection = true;
  };

  oldOnRowClick.call(this, event);
  this.gridOptionsWrapper.gridOptions.suppressRowClickSelection = false;
}

var oldOnKeyDown = (RenderedCell as any).prototype.onKeyDown;
(RenderedCell as any).prototype.onKeyDown = function (event) {
  if (this.cellEditor && 
    this.cellEditor._componentRef &&
    !this.cellEditor._componentRef.hostView.destroyed &&
    this.cellEditor._componentRef.instance.onCellKeyDown && 
    this.cellEditor._componentRef.instance.onCellKeyDown(event) === false ) {
    return;
  }
  oldOnKeyDown.call(this, event);
}

export interface GridColumn {
  cellRenderer?: (params) => string;
  headerName?: string;
  field?: string;
  id?: string;
  valueGetter?: (data:any) => any;
  width?: number;
  viewComponentType?: string; // input / render
  viewComponent?: Type<any>;
  viewComponentParams?: Object;
  editComponentType?: string; // input / render
  editComponent?: Type<any>;
  editComponentParams?: Object;
  suppressSorting?:boolean;
  suppressResize?:boolean;
  isCellEditable?: ((params:GridCell)=>boolean) | boolean;
  sorting?: boolean;
  sort?: string;
}

export function instanceOfGridColumn(object: any): object is GridColumn {
  return typeof object == "object"  && 'field' in object;
}

export interface GridCell {
  colDef: GridColumn,
  data: Object,
  rowIndex: number,
}

export interface GridSorting { // Такой же как и в core/model ListSorting
  column:string, 
  sort:string
}

export interface GridGetRows {
  startRow: number,
  endRow: number, 
  sorting?: GridSorting[],
  successCallback: (rows:any[], total: number) => void,
  failCallback: () => void
}

export interface GridOptions {
  columns?: (GridColumn|string)[];
  datasource?: boolean;
  rowSelection?: boolean;
}

@Component({
  selector: 'ast-grid',
  templateUrl: './grid.html',
  //styleUrls: ['./grid.css'],
  inputs: ['columns', 'datasource', 'rowSelection', 'rows', 'edit'],
})
export class GridComponent implements OnInit, AfterViewInit, GridOptions {
  columns: (GridColumn|string)[] = [];
  datasource: boolean = false;
  rowSelection: boolean = false;

  rows = []; // При инициализации используется в шаблоне
  @Input() edit:boolean = true;
  fieldErrors = new Map<any, {[fieldName:string]:string[]}>();
  rowErrors = new Map<any, string[]>();
  changedRows:any[] = [];
  @Output() renderedRowRemoved = new EventEmitter<any>(); // any -- rowData
  @Output() cachedRowRemoved = new EventEmitter<any>(); // any -- rowData
  @Output() getRows:EventEmitter<GridGetRows> = new EventEmitter<GridGetRows>(); // any -- rowData
  @Output() focusedRowChanged:EventEmitter<{oldRowData:any, newRowData:any}> = new EventEmitter<{oldRowData:any, newRowData:any}>(); // any -- rowData
  @Output() cellDoubleClicked:EventEmitter<{rowData:any, col:GridColumn|string, event:MouseEvent}> = new EventEmitter(); // any -- rowData
  @Output() cellEditingStarted:EventEmitter<{rowData:any, col:GridColumn}> = new EventEmitter<{rowData:any, col:GridColumn}>(); // any -- rowData
  @Output() columnResized:EventEmitter<{newSize:number, col:GridColumn}> = new EventEmitter<{newSize:number, col:GridColumn}>(); // any -- rowData
  @Output() cellValueChanged:EventEmitter<{rowData:any, col:GridColumn, oldValue:any, newValue:any}> = new EventEmitter(); 
  @Output() renderCell:EventEmitter<{rowData:any, col:GridColumn, componentRef:ComponentRef<any>}> = new EventEmitter(); 
  private focusedRowIndex;
  private focusedRowData:any;
  isInit = false;
  isReady = false;
  show = true;
 
  constructor(protected cdr:ChangeDetectorRef) {

  }

  @ViewChild('agGrid') agGrid:AgGridNg2;
  agGridOptions:AgGridOptions;
  //agGridColumnDefs:AgGridColDef[] = []; 


  ngOnInit() {
    //this.prepareOptions();
    this.agGridOptions = this.optionsToAgGridOptions();

    setTimeout(() => {
      if ('infinitePageRowModel' in this.agGrid.api) {
        var _that = this;
        var oldFunc = (this.agGrid.api as any).infinitePageRowModel.infiniteCache.removeBlockFromCache;
        (this.agGrid.api as any).infinitePageRowModel.infiniteCache.removeBlockFromCache = function (pageToRemove) {
          if (pageToRemove) {
            pageToRemove.rowNodes.forEach(rowNode => {
              if (rowNode.data) {
                if (_that.changedRows.indexOf(rowNode.data) !== -1) { // Not track chages for this data
                  _that.changedRows.splice(_that.changedRows.indexOf(rowNode.data), 1);
                }
                _that.cachedRowRemoved.next(rowNode.data);
              }
            });
          }
          oldFunc.call(this, pageToRemove);
        }

        /*var oldFunc2 = (this.agGrid.api as any).infinitePageRowModel.infiniteCache.onPageLoaded;
        (this.agGrid.api as any).infinitePageRowModel.infiniteCache.onPageLoaded = function (ev) {
          oldFunc.call(oldFunc2, ev);
          setTimeout(() => {
            var focusedCell = _that.getFocusedCell();
            this.focusedRowChanged.next({oldRowData:null, newRowData:focusedCell.rowData})
          }, 10)
          
        };*/
        
      }
    });
    //console.log(this.agGrid); 
    this.isInit = true;
  }

  ngAfterViewInit () {
    this.isReady = true;
  }

  ngOnDestroy() {
    this.agGrid = undefined;
  }

  onCellEditingStarted(ev) {
    this.cdr.detectChanges();
    //console.log(ev);
    this.cellEditingStarted.next({col: null, rowData: ev.data})
    //cellEditingStarted
  }

  stopEditing(cancel:boolean=true) {
    this.agGrid.api.stopEditing(true);
  }

  optionsToAgGridOptions():AgGridOptions {
    var result:AgGridOptions = {
      columnDefs: [],
      enableColResize: true,
      suppressNoRowsOverlay: true,
      maxPagesInCache: 3,
      //stopEditingWhenGridLosesFocus: true,
      rowSelection: this.rowSelection ? 'multiple' : null,
      enableSorting: true,
      enableServerSideSorting: !!this.datasource,
      //rowDeselection: true,
      //navigateToNextCell: (params) => this.navigationProcessor(params)
    };

    if (this.datasource) {
      result.rowModelType = 'infinite';
      result.datasource = {
        getRows: (params) => {
          var oldSuccessFunc = params.successCallback;
          var _that = this;
          var resultParams:GridGetRows = {
            startRow: params.startRow,
            endRow: params.endRow,
            successCallback: function (...args) {
              setTimeout(() => {
                var focusedCell = _that.getFocusedCell();
                if (focusedCell) {
                  if (focusedCell.rowData !== _that.focusedRowData) {
                    _that.focusedRowChanged.next({oldRowData:this.focusedRowData, newRowData:focusedCell.rowData});
                    _that.focusedRowData = focusedCell.rowData;
                  }
                }
                else {
                  _that.focusedRowChanged.next({oldRowData:this.focusedRowData, newRowData:null});
                  _that.focusedRowData = null;
                }
              
              }, 10);
              oldSuccessFunc.call(this, ...args);
            },
            failCallback: params.failCallback,
            sorting: [],
          };

          (params.sortModel as any[]).forEach(sort => {
            resultParams.sorting.push({
              column: sort.colId,
              sort: sort.sort,
            });
          });

          this.getRows.next(resultParams);
        },
      };
      result.infiniteBlockSize = 100;
      this.rows = undefined;
    }


    this.columns.forEach(col => {
      if (typeof col == "string") {
        if (col == '__status__') {
          result.columnDefs.push({
            field: '__status__',
            width: 25,
            headerName: ' ',
            suppressResize: true,
            cellRendererFramework: GridStatusRendererCellComponent,
            cellRendererParams: {grid:this},
            suppressSorting: true,
          });
        }
      }
      else {
        var agGridColDef:AgGridColDef ={
          colId: col.id,
          field: col.field,
          headerName: col.headerName || col.field,
          width: col.width,
          suppressResize: col.suppressResize,
          suppressSorting: !col.sorting,
          sort: col.sort,
          //sortingOrder: ['asc','desc',null]
        };
        if (col.editComponent) {
          agGridColDef['editable'] = () => {return this.edit};
          agGridColDef['cellEditorFramework'] = col.editComponentType == 'render' ? GridEditRenderCellComponent : GridEditInputCellComponent;
          agGridColDef['cellEditorParams'] = {component: col.editComponent, componentParams: col.editComponentParams, grid:this};
        }
        if (col.viewComponent) {
          agGridColDef['cellRendererFramework'] = col.viewComponentType == 'render' ? GridViewRenderCellComponent: GridViewInputCellComponent;
          agGridColDef['cellRendererParams'] = {component: col.viewComponent, componentParams: col.viewComponentParams, grid:this};
        }
        if (col.valueGetter) {
          agGridColDef['valueGetter'] = (params) => {
            return col.valueGetter(params.data)
          };
        }
        result.columnDefs.push(agGridColDef)
      }
      
    });

    return result;
  }

  onPaginationPageLoaded() {
  }

  /*
  protected navigationProcessor(params) {
    var previousCell = params.previousCellDef;
    var suggestedNextCell = params.nextCellDef;

    var KEY_UP = 38;
    var KEY_DOWN = 40;
    var KEY_LEFT = 37;
    var KEY_RIGHT = 39;

    switch (params.key) {
      case KEY_DOWN:
          previousCell = params.previousCellDef;
          // set selected cell on current cell + 1
          this.agGrid.api.forEachNode( (node) => {
              if (previousCell.rowIndex + 1 === node.rowIndex) {
                  node.setSelected(true);
              }
          });
          return suggestedNextCell;
      case KEY_UP:
          previousCell = params.previousCellDef;
          // set selected cell on current cell - 1
          this.agGrid.api.forEachNode( (node) => {
              if (previousCell.rowIndex - 1 === node.rowIndex) {
                  node.setSelected(true);
              }
          });
          return suggestedNextCell;
      case KEY_LEFT:
      case KEY_RIGHT:
          return suggestedNextCell;
      default:
          throw "this will never happen, navigation is always on of the 4 keys above";
    }
  }*/

  clear() {
    if (!this.datasource)
      this.setRowData([]);  
  }

  addRow(row:Object) {
    this.agGrid.api.addItems([row]);
    //var model = this.agGrid.api.getModel(); // Медленное добавление, т.к. обновляет все ячейки
    //(model as any).refreshModel({step:3});
  }

  addRows(rows:Object[]) {
    this.agGrid.api.addItems(rows);
  }

  removeRows(rows:Object[]) {
    //this.agGrid.api.removeItems();
  }

  removeRowWithData(data:any) {
    this.agGrid.api.forEachNode(node => {
      if (node.data == data)
        this.agGrid.api.removeItems([node]);
    });
  }

  getSelectedData():any[] {
    var selection = this.agGrid.api.getSelectedRows();
    if (selection.length)
      return selection;

    var focusedCell = this.agGrid.api.getFocusedCell();
    var result = [];
    if (focusedCell) {
      var model = this.agGrid.api.getModel();
      var row = model.getRow(focusedCell.rowIndex);
      if (row)
        result.push(row.data);
    }
    return result;
    
  }

  private getRowNode(row:any):AgGridRowNode {
    var result = null;
    this.agGrid.api.forEachNode(node => {
      if (node.data == row) {
        result = node;
      }
    });
    return result;
  }

  getColByName(colName:string):GridColumn|string {
    for (let col of this.columns) {
      if (typeof col == "string" ) {
        if (colName == col)
          return colName;
      }
      else if (col.field == colName || col.id == colName) {
        return col;
      }
    };
  }

  refreshCells(rows:any[], cols:string[]) {
    var nodeToRefresh = [];
    rows.forEach(row => {
      let node = this.getRowNode(row);
      if (node) {
        nodeToRefresh.push(node);
      }
    }); 
    this.agGrid.api.refreshCells(nodeToRefresh, cols);
  }

  refreshRow(...rows:any[]) {
    var nodeToRefresh = [];
    rows.forEach(row => {
      let node = this.getRowNode(row);
      if (node) {
        nodeToRefresh.push(node);
      }
    }); 
    this.agGrid.api.refreshRows(nodeToRefresh);
  }

  setFieldErrors(data:any, errors: {[fieldName:string]:string[]}) {
    var colsToRefresh = [];
    var oldErrors = this.fieldErrors.get(data);
    if (oldErrors) {
      for (let colName in oldErrors) {
        colsToRefresh.push(colName);
      }
    }

    if (errors) {
      for (let colName in errors) {
        colsToRefresh.push(colName);
      }
    }

    this.fieldErrors.set(data, errors);

    this.refreshCells([data], colsToRefresh);
  }

  setRowErrors(data:any, errors: string[]) {
    if (errors && errors.length)
      this.rowErrors.set(data, errors);
    else
      this.rowErrors.delete(data);
    this.refreshCells([data], ['__status__']);
  }

  setRowData(rows:any[]) {
    if (this.agGrid)
      this.agGrid.api.setRowData(rows);
  }

  setRowChanged(data:any) {
    if (this.changedRows.indexOf(data) == -1) {
      this.changedRows.push(data);
      this.refreshCells([data], ['__status__']);
    }
  }

  removeRowChanged(data:any) {
    if (this.changedRows.indexOf(data) !== -1) {
      this.changedRows.splice(this.changedRows.indexOf(data), 1);
      this.refreshCells([data], ['__status__']);
    }
  }

  refreshView(stages:string[]=['all']) {
    if (!this.datasource) {
      if (stages.indexOf('all') !== -1) {
        this.agGrid.api.refreshView();
      }

      if (stages.indexOf('reorder') !== -1) {
        var rowData, colId;
        var model = this.agGrid.api.getModel();
        var focusedCell = this.agGrid.api.getFocusedCell();
        if (focusedCell) {
          colId = focusedCell.column.getColId();
          var row = model.getRow(focusedCell.rowIndex);
          if (row)
            rowData = row.data;
        }

        this.agGrid.api.dispatchEvent("sortChanged");

        if (rowData) {
          var nodeToFocus;
          model.forEachNode(node => {
            if (node.data == rowData)
              nodeToFocus = node;
          });

          if (nodeToFocus)
            this.agGrid.api.setFocusedCell(nodeToFocus.rowIndex, colId);
        }
      }
      //this.agGrid.api.setSortModel(this.agGrid.api.getSortModel());
      //this.agGrid.api.setRowData(this.rows);
    }
    else {
      //this.agGrid.api.purgeInfinitePageCache();
      this.agGrid.api.setDatasource(this.agGridOptions.datasource);
      //this.agGrid.api.refreshInfinitePageCache();
      
    }
  }

  refreshViewDelayedTimeId;
  refreshViewDelayed(delay=400) {
    if (!this.datasource) {
      this.refreshView();
      return;
    }

    if (this.refreshViewDelayedTimeId)
      clearTimeout(this.refreshViewDelayedTimeId);
    this.refreshViewDelayedTimeId = setTimeout(() => {
      this.refreshView();
      this.refreshViewDelayedTimeId = undefined;
    }, delay);
  }
  

  getSortModel ():{colId:string, sort:string}[] {
    if (this.agGrid) // undefined if rebuild
      return this.agGrid.api.getSortModel();
    else
      return [];
  }

  rebuild() {
    this.show = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      //this.prepareOptions();
      this.agGridOptions = this.optionsToAgGridOptions();
      this.show = true;
      this.cdr.detectChanges();
    },1);
    //this.agGrid.ngOnChanges();
    //this.agGrid
  }

  onVirtualRowRemoved(ev) {
    this.renderedRowRemoved.next(ev.node.data);
  }

  onCellValueChanged(ev) {
    var col = this.getColByName(ev.colDef.field);
    this.cellValueChanged.next({rowData:ev.data, newValue:ev.newValue, oldValue:ev.oldValue, col:col});
  }

  onCellFocused(ev) {
    var focusedCell = this.getFocusedCell();
    if (focusedCell && focusedCell.rowData !== this.focusedRowData) {
      this.focusedRowChanged.next({oldRowData:this.focusedRowData, newRowData:focusedCell.rowData});
      this.focusedRowData = focusedCell.rowData;
    }
    /*if (this.focusedRowIndex !== ev.rowIndex) {
      var model = this.agGrid.api.getModel();
      var oldRow;
      if (typeof this.focusedRowIndex == "number")
        oldRow = model.getRow(this.focusedRowIndex);
      else
        oldRow = null;
      var newRow = model.getRow(ev.rowIndex);
      this.focusedRowChanged.next({oldRowData:oldRow ? oldRow.data:null, newRowData:newRow.data})
    }
    this.focusedRowIndex = ev.rowIndex;*/
    
  }

  onCellDoubleClicked(ev) {
    var col = this.getColByName(ev.colDef.field);
    this.cellDoubleClicked.next({rowData:ev.data, col:col, event:ev.event});
  }

  onCellClicked(ev) {
    var mouseEvent:MouseEvent = ev.event;
    var node:AgGridRowNode = ev.node;
    if (mouseEvent.ctrlKey && this.rowSelection) {
      node.setSelected(!node.isSelected(), false);
    } 
  }

  focusRow(data:any) {
    var node = this.getRowNode(data);
    if (node)
      this.agGrid.api.ensureIndexVisible(node.rowIndex);
  }

  focusCell(rowData:any, colName:string) {
    var node = this.getRowNode(rowData);
    if (node) {
      this.agGrid.api.setFocusedCell(node.rowIndex, colName);
    }
  }

  getFocusedCell():{rowData:Object, col:GridColumn|string} {
    var focusedCell = this.agGrid.api.getFocusedCell();
    if (focusedCell && focusedCell.column) {
      var model = this.agGrid.api.getModel();
      var row = model.getRow(focusedCell.rowIndex);
      return {rowData:row.data, col:this.getColByName(focusedCell.column.getColId())}
    }
  }

  onColumnResized($event) {
    if ($event.finished) {
      var col = this.getColByName($event.column.getColId());
      if (! (typeof col == "string")) {
        this.columnResized.next({newSize:$event.column.actualWidth, col:col});
      }
    }
    //console.log($event);
  }

  getRenderedRows():any[] {
    var result = [];
    this.agGrid.api.forEachNodeAfterFilterAndSort(node => {
      result.push(node.data);
    });
    return result;
  }

  getRowCellComponentInstance(rowData:any, colName:string) {
    //this.agGrid.api.rowRenderer.renderedRows[0].renderedCells.price_in_usd.cellRenderer.getFrameworkComponentInstance().componentRef
  }

  setSortModel(models) {
    var agGridModel = [];
    for (let m of models) {
      agGridModel.push({colId: m.field, sort: m.sort});
    }
    this.agGrid.api.setSortModel(agGridModel);
  }
}
